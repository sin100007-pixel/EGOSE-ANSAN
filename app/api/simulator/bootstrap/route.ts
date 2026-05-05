import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { requireSimulatorInstaller } from "../../../simulator/auth";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

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

function toPublicImageUrl(imagePath: string | null | undefined) {
  if (!imagePath) return null;

  const baseUrl = getCleanSupabaseUrl();
  if (!baseUrl) return null;

  if (/^https?:\/\//i.test(imagePath)) {
    return imagePath.replace(/\s+/g, "");
  }

  const normalizedPath = imagePath
    .trim()
    .replace(/^\/+/, "")
    .replace(/^product-samples\//, "");

  return `${baseUrl}/storage/v1/object/public/product-samples/${normalizedPath}`;
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
    .eq("link_id", linkId);

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
    .eq("preset_id", presetId);

  if (error) throw error;

  return (data || [])
    .map((row: { product_id?: number | string | null }) => Number(row.product_id))
    .filter((value: number) => Number.isFinite(value));
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
    .select("id, installer_name, display_name, logo_url, greeting, phone, kakao_url, brand_color")
    .eq("installer_name", normalizedInstallerName)
    .eq("is_active", true)
    .maybeSingle();

  if (profileError) {
    console.error("[simulator/bootstrap] contractor profile error:", profileError);
    return null;
  }

  if (!profile) {
    return null;
  }

  const typedProfile = profile as ContractorProfileRow;

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
  const supabase = getSupabase();

  if (!supabase) {
    return NextResponse.json(
      {
        setupNeeded: true,
        message:
          "Supabase 환경변수 NEXT_PUBLIC_SUPABASE_URL 또는 NEXT_PUBLIC_SUPABASE_ANON_KEY가 없습니다.",
        contractor: null,
        spaces: LOCAL_FALLBACK_SPACES,
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
      return NextResponse.json(
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
        return NextResponse.json(
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
        return NextResponse.json(
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
        return NextResponse.json(
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

    if (hasToken && filmScope !== "all" && allowedProductIds.length === 0) {
      return NextResponse.json(
        {
          setupNeeded: false,
          expired: false,
          link: linkInfo,
          contractor: contractorProfile,
          spaces: resolvedSpaces,
          films: [],
        },
        {
          headers: {
            "Cache-Control": "no-store, no-cache, must-revalidate",
          },
        }
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
    }

    const { data: products, error: productsError } = await productQuery;

    if (productsError) {
      throw productsError;
    }

    return NextResponse.json(
      {
        setupNeeded: false,
        expired: false,
        link: linkInfo,
        contractor: contractorProfile,
        spaces: resolvedSpaces,
        films: ((products || []) as ProductRow[]).map((item: ProductRow) =>
          normalizeFilm(item)
        ),
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

    return NextResponse.json(
      {
        setupNeeded: relationMissing,
        expired: false,
        message: relationMissing
          ? "필름시뮬레이터 DB 테이블이 아직 없습니다. supabase/02_simulator_schema.sql을 먼저 실행하세요."
          : message || "시뮬레이터 정보를 불러오지 못했습니다.",
        link: null,
        contractor: null,
        spaces: LOCAL_FALLBACK_SPACES,
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
