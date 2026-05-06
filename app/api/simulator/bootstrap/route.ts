import { createClient } from "@supabase/supabase-js";
import { readFile } from "fs/promises";
import path from "path";
import { NextRequest, NextResponse } from "next/server";
import { requireSimulatorInstaller } from "../../../simulator/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

const KAKAO_NO_STORE_HEADERS = {
  "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0",
  "CDN-Cache-Control": "no-store",
  "Vercel-CDN-Cache-Control": "no-store",
  "Surrogate-Control": "no-store",
  Pragma: "no-cache",
  Expires: "0",
  Vary: "Cookie, Authorization, User-Agent",
};

function jsonNoStore(body: unknown, init: ResponseInit = {}) {
  return NextResponse.json(body, {
    ...init,
    headers: {
      ...KAKAO_NO_STORE_HEADERS,
      ...(init.headers || {}),
    },
  });
}

const KAKAO_IMAGE_PROXY_PARAM = "__kakao_image_proxy";
const KAKAO_IMAGE_PROXY_SRC_PARAM = "src";

function getAllowedProxyUrl(req: NextRequest, rawSrc: string | null) {
  const value = String(rawSrc || "").trim();
  if (!value || /^(data:|blob:|file:|javascript:)/i.test(value)) return null;

  let targetUrl: URL;

  try {
    targetUrl = /^https?:\/\//i.test(value)
      ? new URL(value)
      : new URL(value, req.nextUrl.origin);
  } catch {
    return null;
  }

  if (targetUrl.protocol !== "http:" && targetUrl.protocol !== "https:") {
    return null;
  }

  const isSameOrigin = targetUrl.origin === req.nextUrl.origin;
  const isRecursiveProxy =
    isSameOrigin &&
    targetUrl.pathname === req.nextUrl.pathname &&
    targetUrl.searchParams.get(KAKAO_IMAGE_PROXY_PARAM) === "1";

  if (isRecursiveProxy) return null;

  const supabaseBaseUrl = getCleanSupabaseUrl();
  let isSupabaseStorage = false;

  if (supabaseBaseUrl) {
    try {
      const supabaseUrl = new URL(supabaseBaseUrl);
      isSupabaseStorage =
        targetUrl.origin === supabaseUrl.origin &&
        targetUrl.pathname.startsWith("/storage/v1/object/public/");
    } catch {
      isSupabaseStorage = false;
    }
  }

  if (!isSameOrigin && !isSupabaseStorage) {
    return null;
  }

  targetUrl.pathname = targetUrl.pathname
    .split("/")
    .map((part) => (part ? encodeURIComponent(decodeURIComponent(part)) : part))
    .join("/");

  return targetUrl;
}

async function proxyKakaoImage(req: NextRequest) {
  const targetUrl = getAllowedProxyUrl(req, req.nextUrl.searchParams.get(KAKAO_IMAGE_PROXY_SRC_PARAM));

  if (!targetUrl) {
    return new NextResponse("Invalid image proxy request", {
      status: 400,
      headers: KAKAO_NO_STORE_HEADERS,
    });
  }

  try {
    const upstream = await fetch(targetUrl.toString(), {
      cache: "no-store",
      headers: {
        Accept: "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
        "Cache-Control": "no-cache",
        Pragma: "no-cache",
      },
    });

    if (!upstream.ok) {
      return new NextResponse("Image not found", {
        status: upstream.status,
        headers: KAKAO_NO_STORE_HEADERS,
      });
    }

    const contentType = upstream.headers.get("content-type") || "application/octet-stream";
    const body = await upstream.arrayBuffer();

    return new NextResponse(body, {
      status: 200,
      headers: {
        ...KAKAO_NO_STORE_HEADERS,
        "Content-Type": contentType,
        "Content-Length": String(body.byteLength),
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return new NextResponse("Image proxy failed", {
      status: 502,
      headers: KAKAO_NO_STORE_HEADERS,
    });
  }
}


const INLINE_ASSET_MAX_BYTES = 3 * 1024 * 1024;
const inlineAssetCache = new Map<string, string | null>();

function isProblemImageBrowser(req: NextRequest) {
  const userAgent = req.headers.get("user-agent") || "";
  return /KAKAOTALK|SamsungBrowser|Whale|NAVER|FB_IAB|Instagram|; wv\)/i.test(userAgent);
}

function getImageMimeType(filePath: string) {
  const lower = filePath.toLowerCase();
  if (lower.endsWith(".png")) return "image/png";
  if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "image/jpeg";
  if (lower.endsWith(".webp")) return "image/webp";
  if (lower.endsWith(".gif")) return "image/gif";
  if (lower.endsWith(".svg")) return "image/svg+xml";
  return "application/octet-stream";
}

async function toInlinePublicAsset(src: string | null | undefined) {
  const value = String(src || "").trim();
  if (!value) return value;
  if (/^(data:|blob:|https?:\/\/|\/\/)/i.test(value)) return value;

  let pathname = "";

  try {
    const parsed = new URL(value, "http://egose.local");
    pathname = decodeURIComponent(parsed.pathname || "");
  } catch {
    pathname = value.split("?")[0].split("#")[0];
  }

  if (!pathname.startsWith("/simulator/") || pathname.includes("\0")) return value;
  if (!/\.(png|jpe?g|webp|gif|svg)$/i.test(pathname)) return value;

  const publicRoot = path.join(process.cwd(), "public");
  const filePath = path.normalize(path.join(publicRoot, pathname.replace(/^\/+/, "")));

  if (!filePath.startsWith(publicRoot)) return value;

  if (inlineAssetCache.has(filePath)) {
    return inlineAssetCache.get(filePath) || value;
  }

  try {
    const file = await readFile(filePath);

    if (file.byteLength > INLINE_ASSET_MAX_BYTES) {
      inlineAssetCache.set(filePath, null);
      return value;
    }

    const dataUrl = `data:${getImageMimeType(filePath)};base64,${file.toString("base64")}`;
    inlineAssetCache.set(filePath, dataUrl);
    return dataUrl;
  } catch {
    inlineAssetCache.set(filePath, null);
    return value;
  }
}

async function inlineSpaceAssets(space: SimulatorSpaceRow): Promise<SimulatorSpaceRow> {
  const maskConfig = space.mask_config;
  let nextMaskConfig = maskConfig;

  if (maskConfig && Array.isArray(maskConfig["zones"])) {
    const zones = await Promise.all(
      (maskConfig["zones"] as unknown[]).map(async (zone) => {
        if (!zone || typeof zone !== "object") return zone;
        const z = zone as Record<string, unknown>;
        return {
          ...z,
          mask_url:
            typeof z.mask_url === "string" ? await toInlinePublicAsset(z.mask_url) : z.mask_url,
        };
      })
    );

    nextMaskConfig = {
      ...maskConfig,
      zones,
    };
  }

  return {
    ...space,
    thumbnail_url: await toInlinePublicAsset(space.thumbnail_url),
    base_image_url: await toInlinePublicAsset(space.base_image_url),
    overlay_image_url: await toInlinePublicAsset(space.overlay_image_url),
    mask_config: nextMaskConfig,
  };
}

async function maybeInlineSpaceAssets(
  req: NextRequest,
  spaces: SimulatorSpaceRow[]
): Promise<SimulatorSpaceRow[]> {
  if (!isProblemImageBrowser(req)) return spaces;
  return Promise.all(spaces.map((space) => inlineSpaceAssets(space)));
}


type SimulatorLinkRow = {
  id: string;
  token: string;
  installer_name: string | null;
  customer_name: string | null;
  expires_at: string;
  is_active: boolean;
  film_scope: string | null;
  preset_id: string | null;
};

type ProductRow = {
  id: number;
  manufacturer: string | null;
  product_code_1: string | null;
  product_code_2: string | null;
  color_name: string | null;
  full_name: string | null;
  category_main: string | null;
  category_sub: string | null;
  palette_main: string | null;
  palette_sub: string | null;
  palette_color: string | null;
  image_path: string | null;
  simulation_image_path: string | null;
  simulation_thumb_path: string | null;
};

type SimulatorSpaceRow = {
  id: string;
  name: string;
  description: string | null;
  thumbnail_url: string | null;
  base_image_url: string | null;
  overlay_image_url: string | null;
  mask_config: Record<string, unknown> | null;
  sort_order: number | null;
};

type ContractorProfileRow = {
  id: string;
  installer_name: string | null;
  display_name: string;
  logo_url: string | null;
  greeting: string | null;
  phone: string | null;
  kakao_url: string | null;
  brand_color: string | null;
  is_active?: boolean | null;
};

type ContractorPortfolioPhotoRow = {
  id: string;
  contractor_profile_id: string;
  image_url: string;
  title: string | null;
  description: string | null;
  sort_order: number | null;
  is_representative: boolean | null;
};

type ContractorProfilePayload = ContractorProfileRow & {
  portfolio_photos: ContractorPortfolioPhotoRow[];
};

function createFallbackContractorProfile(
  installerName: string
): ContractorProfilePayload {
  return {
    id: `fallback-${encodeURIComponent(installerName)}`,
    installer_name: installerName,
    display_name: installerName,
    logo_url: null,
    greeting: null,
    phone: null,
    kakao_url: null,
    brand_color: "#EEE0C5",
    is_active: true,
    portfolio_photos: [],
  };
}

const DEFAULT_RECOMMENDED_FILM_LIMIT = 24;

const PRODUCT_SELECT = `
  id,
  manufacturer,
  product_code_1,
  product_code_2,
  color_name,
  full_name,
  category_main,
  category_sub,
  palette_main,
  palette_sub,
  palette_color,
  image_path,
  simulation_image_path,
  simulation_thumb_path
`;

const SPACE_SELECT = `
  id,
  name,
  description,
  thumbnail_url,
  base_image_url,
  overlay_image_url,
  mask_config,
  sort_order
`;

const LOCAL_FALLBACK_SPACES: SimulatorSpaceRow[] = [
  {
    id: "local-fridge-test",
    name: "냉장고장",
    description: "냉장고장 / 상하부장을 시뮬레이션하는 공간입니다.",
    thumbnail_url: "/simulator/fridge/fridge-overlay.png",
    base_image_url: null,
    overlay_image_url: "/simulator/fridge/fridge-overlay.png",
    mask_config: {
      previewAspectRatio: "1536 / 1024",
      zones: [
        {
          key: "upper",
          label: "상부장",
          mask_url: "/simulator/fridge/fridge-upper-mask.png",
          patternSize: 220,
        },
        {
          key: "lower",
          label: "하부장",
          mask_url: "/simulator/fridge/fridge-lower-mask.png",
          patternSize: 220,
        },
        {
          key: "fridge",
          label: "냉장고장",
          mask_url: "/simulator/fridge/fridge-fridge-mask.png",
          patternSize: 220,
        },
      ],
    },
    sort_order: 1,
  },
  {
    id: "local-tvwall-test",
    name: "TV 벽면",
    description: "TV 벽면과 하단 수납장을 시뮬레이션하는 공간입니다.",
    thumbnail_url: "/simulator/tvwall/tvwall-overlay.png",
    base_image_url: null,
    overlay_image_url: "/simulator/tvwall/tvwall-overlay.png",
    mask_config: {
      previewAspectRatio: "1 / 1",
      zones: [
        {
          key: "wall1",
          label: "상단 벽면",
          mask_url: "/simulator/tvwall/tvwall-wall1-mask.png",
          patternSize: 220,
        },
        {
          key: "wall2",
          label: "메인 벽면",
          mask_url: "/simulator/tvwall/tvwall-wall2-mask.png",
          patternSize: 220,
        },
        {
          key: "cabinet",
          label: "하단 수납장",
          mask_url: "/simulator/tvwall/tvwall-cabinet-mask.png",
          patternSize: 220,
        },
      ],
    },
    sort_order: 2,
  },
];

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  const key = serviceKey || anonKey;

  if (!url || !key) {
    return null;
  }

  return createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

function getCleanSupabaseUrl() {
  const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  return rawUrl.replace(/\s+/g, "").replace(/\/+$/, "");
}

function encodeStoragePath(pathValue: string) {
  return pathValue
    .split("/")
    .map((part) => encodeURIComponent(part))
    .join("/");
}

function toPublicImageUrl(imagePath: string | null | undefined) {
  if (!imagePath) return null;

  const baseUrl = getCleanSupabaseUrl();
  if (!baseUrl) return null;

  const cleaned = String(imagePath).trim().replace(/\s+/g, "");

  if (/^https?:\/\//i.test(cleaned)) {
    try {
      const url = new URL(cleaned);
      url.pathname = url.pathname
        .split("/")
        .map((part) => (part ? encodeURIComponent(decodeURIComponent(part)) : part))
        .join("/");
      return url.toString();
    } catch {
      return encodeURI(cleaned);
    }
  }

  const normalizedPath = cleaned
    .replace(/^\/+/, "")
    .replace(/^product-samples\//, "");

  return `${baseUrl}/storage/v1/object/public/product-samples/${encodeStoragePath(normalizedPath)}`;
}

function normalizeFilm(item: ProductRow) {
  const { image_path, simulation_image_path, simulation_thumb_path, ...rest } = item;

  return {
    ...rest,
    image_url: toPublicImageUrl(simulation_image_path || image_path),
    thumb_url: toPublicImageUrl(
      simulation_thumb_path || simulation_image_path || image_path
    ),
    sample_url: toPublicImageUrl(image_path),
  };
}

function isExpired(expiresAt: string) {
  const expiresTime = new Date(expiresAt).getTime();
  if (Number.isNaN(expiresTime)) return true;
  return Date.now() > expiresTime;
}

function resolveSpaces(
  spaces: SimulatorSpaceRow[] | null | undefined,
  allowLocalFallback: boolean
) {
  if (spaces && spaces.length > 0) {
    return spaces;
  }

  return allowLocalFallback ? LOCAL_FALLBACK_SPACES : [];
}

async function readAllowedSpaceIds(
  supabase: any,
  linkId: string
) {
  const { data, error } = await supabase
    .from("simulator_link_spaces")
    .select("space_id")
    .eq("link_id", linkId);

  if (error) throw error;

  return (data || [])
    .map((row: { space_id?: string | null }) => row.space_id)
    .filter(
      (value: string | null | undefined): value is string =>
        typeof value === "string" && value.length > 0
    );
}

async function readAllowedProductIds(
  supabase: any,
  linkId: string
) {
  const { data, error } = await supabase
    .from("simulator_link_films")
    .select("product_id")
    .eq("link_id", linkId)
    .order("created_at", { ascending: true });

  if (error) throw error;

  return (data || [])
    .map((row: { product_id?: number | string | null }) => Number(row.product_id))
    .filter((value: number) => Number.isFinite(value));
}

async function readPresetProductIds(
  supabase: any,
  presetId: string
) {
  const { data, error } = await supabase
    .from("simulator_film_preset_items")
    .select("product_id")
    .eq("preset_id", presetId)
    .order("created_at", { ascending: true });

  if (error) throw error;

  return (data || [])
    .map((row: { product_id?: number | string | null }) => Number(row.product_id))
    .filter((value: number) => Number.isFinite(value));
}

async function readDefaultRecommendedProductIds(supabase: any) {
  const { data, error } = await supabase
    .from("simulator_default_recommended_films")
    .select("product_id, sort_order")
    .eq("is_active", true)
    .order("sort_order", { ascending: true })
    .limit(DEFAULT_RECOMMENDED_FILM_LIMIT);

  if (error) throw error;

  return (data || [])
    .map(
      (
        row: { product_id?: number | string | null; sort_order?: number | string | null },
        index: number
      ) => ({
        productId: Number(row.product_id),
        sortOrder: Number.isFinite(Number(row.sort_order)) ? Number(row.sort_order) : index + 1,
      })
    )
    .filter((row: { productId: number; sortOrder: number }) => Number.isFinite(row.productId));
}

async function safeReadDefaultRecommendedProductIds(supabase: any) {
  try {
    return await readDefaultRecommendedProductIds(supabase);
  } catch (error) {
    console.error("[simulator/bootstrap] recommended films fallback:", error);
    return [];
  }
}

function sortProductsByOrder(rows: ProductRow[], orderMap: Map<number, number>) {
  if (orderMap.size === 0) return rows;

  return [...rows].sort((a, b) => {
    const ai = orderMap.get(Number(a.id)) ?? 99999;
    const bi = orderMap.get(Number(b.id)) ?? 99999;

    if (ai !== bi) return ai - bi;

    const aName = a.full_name || a.product_code_1 || "";
    const bName = b.full_name || b.product_code_1 || "";
    return aName.localeCompare(bName, "ko");
  });
}

async function readSearchCorpusProducts(
  supabase: any,
  options: {
    hasToken: boolean;
    filmScope: "all" | "custom" | "preset";
    allowedProductIds: number[];
  }
) {
  let query = supabase
    .from("products")
    .select(PRODUCT_SELECT)
    .eq("manufacturer", "삼성필름")
    .eq("is_simulatable", true)
    .or("simulation_image_path.not.is.null,image_path.not.is.null")
    .limit(1500);

  // 링크에서 직접선택/프리셋으로 제한한 경우에는 고객이 볼 수 있는 필름 안에서만
  // 검색/팔레트 fallback이 동작해야 합니다.
  if (options.hasToken && options.filmScope !== "all") {
    if (options.allowedProductIds.length === 0) return [];
    query = query.in("id", options.allowedProductIds);
  }

  const { data, error } = await query;
  if (error) throw error;

  const rows = ((data || []) as ProductRow[]).filter(Boolean);

  if (options.hasToken && options.filmScope !== "all") {
    const orderMap = new Map(
      options.allowedProductIds.map((productId: number, index: number) => [productId, index + 1])
    );
    return sortProductsByOrder(rows, orderMap);
  }

  // 전체허용 링크에서는 첫 화면용 추천필름 순서는 별도로 유지하고,
  // search_films에는 전체 검색용 말뭉치를 제품명 순으로 싣습니다.
  return [...rows].sort((a, b) => {
    const aName = a.full_name || a.product_code_1 || "";
    const bName = b.full_name || b.product_code_1 || "";
    return aName.localeCompare(bName, "ko");
  });
}

async function readContractorProfile(
  supabase: any,
  installerName: string | null | undefined
): Promise<ContractorProfilePayload | null> {
  const normalizedInstallerName = String(installerName || "").trim();

  if (!normalizedInstallerName) {
    return null;
  }

  const { data: profile, error: profileError } = await supabase
    .from("contractor_profiles")
    .select("id, installer_name, display_name, logo_url, greeting, phone, kakao_url, brand_color, is_active")
    .eq("installer_name", normalizedInstallerName)
    .maybeSingle();

  if (profileError) {
    console.error("[simulator/bootstrap] contractor profile error:", profileError);
    return null;
  }

  if (!profile) {
    return createFallbackContractorProfile(normalizedInstallerName);
  }

  const typedProfile = profile as ContractorProfileRow;

  if (typedProfile.is_active === false) {
    return null;
  }

  const { data: photos, error: photosError } = await supabase
    .from("contractor_portfolio_photos")
    .select("id, contractor_profile_id, image_url, title, description, sort_order, is_representative")
    .eq("contractor_profile_id", typedProfile.id)
    .eq("is_visible", true)
    .order("is_representative", { ascending: false })
    .order("sort_order", { ascending: true })
    .limit(6);

  if (photosError) {
    console.error("[simulator/bootstrap] contractor photos error:", photosError);
  }

  return {
    ...typedProfile,
    portfolio_photos: ((photos || []) as ContractorPortfolioPhotoRow[]),
  };
}

export async function GET(req: NextRequest) {
  if (req.nextUrl.searchParams.get(KAKAO_IMAGE_PROXY_PARAM) === "1") {
    return proxyKakaoImage(req);
  }

  const supabase = getSupabase();

  if (!supabase) {
    return jsonNoStore(
      {
        setupNeeded: true,
        message:
          "Supabase 환경변수 NEXT_PUBLIC_SUPABASE_URL 또는 NEXT_PUBLIC_SUPABASE_ANON_KEY가 없습니다.",
        contractor: null,
        spaces: await maybeInlineSpaceAssets(req, LOCAL_FALLBACK_SPACES),
        films: [],
      },
      {
        status: 500,
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate",
        },
      }
    );
  }

  const token = (req.nextUrl.searchParams.get("token") || "").trim();
  let previewInstallerName = "";

  if (!token) {
    const auth = await requireSimulatorInstaller();

    if (!auth.ok) {
      return jsonNoStore(
        {
          setupNeeded: false,
          expired: false,
          message: auth.error || "로그인이 필요합니다.",
          link: null,
          contractor: null,
          spaces: [],
          films: [],
        },
        {
          status: auth.status,
          headers: {
            "Cache-Control": "no-store, no-cache, must-revalidate",
          },
        }
      );
    }

    previewInstallerName = auth.name;
  }

  try {
    const hasToken = token.length > 0;
    let allowedSpaceIds: string[] = [];
    let allowedProductIds: number[] = [];
    let filmScope: "all" | "custom" | "preset" = "all";
    let presetId = "";
    let linkInfo: {
      token: string;
      installer_name: string | null;
      customer_name: string | null;
      expires_at: string;
      film_scope: "all" | "custom" | "preset";
    } | null = null;
    let contractorProfile: ContractorProfilePayload | null = null;
    let recommendedProductIds: number[] = [];
    let recommendedOrderMap = new Map<number, number>();
    let allowedOrderMap = new Map<number, number>();

    // 시공자가 직접 /simulator 로 들어온 미리보기 화면에서도
    // 본인의 소개정보/카카오톡 링크를 사용할 수 있게 불러옵니다.
    if (!hasToken && previewInstallerName) {
      contractorProfile = await readContractorProfile(supabase, previewInstallerName);
    }

    if (hasToken) {
      const { data: link, error: linkError } = await supabase
        .from("simulator_links")
        .select(
          "id, token, installer_name, customer_name, expires_at, is_active, film_scope, preset_id"
        )
        .eq("token", token)
        .maybeSingle();

      if (linkError) {
        throw linkError;
      }

      if (!link) {
        return jsonNoStore(
          {
            setupNeeded: false,
            expired: true,
            message: "유효하지 않은 링크입니다.",
            spaces: [],
            films: [],
          },
          {
            headers: {
              "Cache-Control": "no-store, no-cache, must-revalidate",
            },
          }
        );
      }

      const typedLink = link as SimulatorLinkRow;

      if (!typedLink.is_active || isExpired(typedLink.expires_at)) {
        return jsonNoStore(
          {
            setupNeeded: false,
            expired: true,
            message: "이 링크의 사용기간이 만료되었습니다.",
            spaces: [],
            films: [],
          },
          {
            headers: {
              "Cache-Control": "no-store, no-cache, must-revalidate",
            },
          }
        );
      }

      filmScope =
        typedLink.film_scope === "custom"
          ? "custom"
          : typedLink.film_scope === "preset"
            ? "preset"
            : "all";
      presetId = typedLink.preset_id || "";

      linkInfo = {
        token: typedLink.token,
        installer_name: typedLink.installer_name,
        customer_name: typedLink.customer_name,
        expires_at: typedLink.expires_at,
        film_scope: filmScope,
      };

      contractorProfile = await readContractorProfile(supabase, typedLink.installer_name);

      allowedSpaceIds = await readAllowedSpaceIds(supabase, typedLink.id);

      if (filmScope === "custom") {
        allowedProductIds = await readAllowedProductIds(supabase, typedLink.id);
      } else if (filmScope === "preset" && presetId) {
        allowedProductIds = await readPresetProductIds(supabase, presetId);
      } else if (filmScope === "all") {
        // 과거 생성 링크나 브라우저 캐시 문제로 film_scope가 all처럼 보여도
        // simulator_link_films에 직접선택 필름이 남아 있으면 그 선택값을 우선합니다.
        const legacyDirectProductIds = await readAllowedProductIds(supabase, typedLink.id);
        if (legacyDirectProductIds.length > 0) {
          filmScope = "custom";
          allowedProductIds = legacyDirectProductIds;
          if (linkInfo) linkInfo.film_scope = "custom";
        }
      }
    }

    let spaceQuery = supabase
      .from("simulator_spaces")
      .select(SPACE_SELECT)
      .eq("is_active", true)
      .order("sort_order", { ascending: true })
      .limit(10);

    if (hasToken) {
      if (allowedSpaceIds.length === 0) {
        return jsonNoStore(
          {
            setupNeeded: false,
            expired: false,
            message: "이 링크에 연결된 공간이 없습니다.",
            link: linkInfo,
            contractor: contractorProfile,
            spaces: [],
            films: [],
          },
          {
            headers: {
              "Cache-Control": "no-store, no-cache, must-revalidate",
            },
          }
        );
      }

      spaceQuery = spaceQuery.in("id", allowedSpaceIds);
    }

    const { data: spaces, error: spacesError } = await spaceQuery;

    if (spacesError) {
      console.error("[simulator/bootstrap] spaces error:", spacesError);
    }

    const resolvedSpaces = resolveSpaces(
      spacesError ? [] : ((spaces || []) as SimulatorSpaceRow[]),
      !hasToken
    );
    const responseSpaces = await maybeInlineSpaceAssets(req, resolvedSpaces);

    if (hasToken && filmScope !== "all" && allowedProductIds.length === 0) {
      return jsonNoStore(
        {
          setupNeeded: false,
          expired: false,
          link: linkInfo,
          contractor: contractorProfile,
          spaces: responseSpaces,
          films: [],
        },
        {
          headers: {
            "Cache-Control": "no-store, no-cache, must-revalidate",
          },
        }
      );
    }

    if (filmScope !== "all" && allowedProductIds.length > 0) {
      allowedOrderMap = new Map(
        allowedProductIds.map((productId: number, index: number) => [productId, index + 1])
      );
    } else {
      const recommendedRows = await safeReadDefaultRecommendedProductIds(supabase);
      recommendedProductIds = recommendedRows.map(
        (row: { productId: number; sortOrder: number }) => row.productId
      );
      recommendedOrderMap = new Map(
        recommendedRows.map((row: { productId: number; sortOrder: number }) => [
          row.productId,
          row.sortOrder,
        ])
      );
    }

    let productQuery = supabase
      .from("products")
      .select(PRODUCT_SELECT)
      .eq("manufacturer", "삼성필름")
      .eq("is_simulatable", true)
      .or("simulation_image_path.not.is.null,image_path.not.is.null")
      .limit(80);

    if (hasToken && filmScope !== "all") {
      productQuery = productQuery.in("id", allowedProductIds);
    } else if (recommendedProductIds.length > 0) {
      productQuery = productQuery.in("id", recommendedProductIds);
    }

    const { data: products, error: productsError } = await productQuery;

    if (productsError) {
      throw productsError;
    }

    const productRows = sortProductsByOrder(
      ((products || []) as ProductRow[]),
      filmScope !== "all" ? allowedOrderMap : recommendedOrderMap
    );

    let searchProductRows = productRows;

    try {
      searchProductRows = await readSearchCorpusProducts(supabase, {
        hasToken,
        filmScope,
        allowedProductIds,
      });
    } catch (searchCorpusError) {
      console.error("[simulator/bootstrap] search films fallback:", searchCorpusError);
      searchProductRows = productRows;
    }

    return jsonNoStore(
      {
        setupNeeded: false,
        expired: false,
        link: linkInfo,
        contractor: contractorProfile,
        spaces: responseSpaces,
        films: productRows.map((item: ProductRow) => normalizeFilm(item)),
        search_films: searchProductRows.map((item: ProductRow) => normalizeFilm(item)),
      },
      {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate",
        },
      }
    );
  } catch (error: any) {
    const message = String(error?.message || "");

    const relationMissing =
      message.includes("simulator_spaces") ||
      message.includes("simulator_links") ||
      message.includes("schema cache") ||
      message.includes("does not exist");

    return jsonNoStore(
      {
        setupNeeded: relationMissing,
        expired: false,
        message: relationMissing
          ? "필름시뮬레이터 DB 테이블이 아직 없습니다. supabase/02_simulator_schema.sql을 먼저 실행하세요."
          : message || "시뮬레이터 정보를 불러오지 못했습니다.",
        link: null,
        contractor: null,
        spaces: await maybeInlineSpaceAssets(req, LOCAL_FALLBACK_SPACES),
        films: [],
      },
      {
        status: relationMissing ? 200 : 500,
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate",
        },
      }
    );
  }
}
