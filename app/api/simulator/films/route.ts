import { createClient } from "@supabase/supabase-js";
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

type PaletteFacetRow = {
  id: number;
  palette_main: string | null;
  palette_sub: string | null;
  palette_color: string | null;
};

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  const key = serviceKey || anonKey;

  if (!url || !key) return null;

  return createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

function cleanParam(value: string | null) {
  return (value || "").trim();
}

function cleanPaletteColorParams(req: NextRequest) {
  return Array.from(
    new Set(
      req.nextUrl.searchParams
        .getAll("palette_color")
        .flatMap((value) => value.split(","))
        .map((value) => value.trim())
        .filter(Boolean)
    )
  );
}

function normalizeForSearch(value: string) {
  return value
    .toUpperCase()
    .replace(/번/g, "")
    .replace(/[^0-9A-Z가-힣]/g, "");
}

function buildQueryTokens(query: string) {
  const tokens = new Set<string>();
  const normalized = normalizeForSearch(query);

  if (normalized) tokens.add(normalized);

  const parts = (query.toUpperCase().match(/[A-Z가-힣]+|\d+/g) || [])
    .map((part) => normalizeForSearch(part))
    .filter(Boolean);

  for (const part of parts) tokens.add(part);

  const letterParts = parts.filter((part) => /[A-Z가-힣]/.test(part));
  const numberParts = parts.filter((part) => /\d/.test(part));

  for (const numberPart of numberParts) {
    tokens.add(numberPart);

    for (const letterPart of letterParts) {
      tokens.add(`${letterPart}${numberPart}`);
    }

    if (letterParts.length > 1) {
      tokens.add(`${letterParts.join("")}${numberPart}`);
    }
  }

  if (parts.length > 1) tokens.add(parts.join(""));

  return Array.from(tokens)
    .filter(Boolean)
    .sort((a, b) => b.length - a.length)
    .slice(0, 10);
}

function buildDbOrFilter(query: string) {
  const tokens = buildQueryTokens(query);
  const fields = [
    "product_code_1",
    "product_code_2",
    "full_name",
    "color_name",
    "category_main",
    "category_sub",
    "palette_main",
    "palette_sub",
    "palette_color",
    "manufacturer",
  ];

  const conditions: string[] = [];

  for (const token of tokens) {
    const safeToken = token.replace(/[%_,()]/g, "").trim();
    if (!safeToken) continue;

    for (const field of fields) {
      conditions.push(`${field}.ilike.%${safeToken}%`);
    }
  }

  return conditions.join(",");
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

function getScore(item: ProductRow, query: string) {
  const q = normalizeForSearch(query);
  if (!q) return 1;

  const code1 = normalizeForSearch(item.product_code_1 || "");
  const code2 = normalizeForSearch(item.product_code_2 || "");
  const fullName = normalizeForSearch(item.full_name || "");
  const colorName = normalizeForSearch(item.color_name || "");

  const fields = [
    item.product_code_1,
    item.product_code_2,
    item.full_name,
    item.color_name,
    item.category_main,
    item.category_sub,
    item.palette_main,
    item.palette_sub,
    item.palette_color,
    item.manufacturer,
    code1 && code2 ? `${code1}${code2}` : "",
    code1 && colorName ? `${code1}${colorName}` : "",
    code2 && colorName ? `${code2}${colorName}` : "",
    fullName,
  ]
    .map((value) => normalizeForSearch(value || ""))
    .filter(Boolean);

  let score = 0;

  for (const field of fields) {
    if (field === q) score = Math.max(score, 100);
    else if (field.startsWith(q)) score = Math.max(score, 80);
    else if (field.includes(q)) score = Math.max(score, 60);
  }

  return score;
}

function uniqueSorted(values: Array<string | null | undefined>) {
  return Array.from(
    new Set(
      values
        .map((value) => (value || "").trim())
        .filter((value) => value.length > 0)
    )
  ).sort((a, b) => a.localeCompare(b, "ko"));
}

function isExpired(expiresAt: string) {
  const expiresTime = new Date(expiresAt).getTime();
  if (Number.isNaN(expiresTime)) return true;
  return Date.now() > expiresTime;
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
    console.error("[simulator/films] recommended films fallback:", error);
    return [];
  }
}

function emptyPaletteFacets() {
  return {
    palette_mains: [],
    palette_subs: [],
    palette_colors: [],
  };
}

function mergeProductRows(rows: ProductRow[]) {
  const map = new Map<number, ProductRow>();

  rows.forEach((row) => {
    if (!row || !Number.isFinite(Number(row.id))) return;
    map.set(Number(row.id), row);
  });

  return Array.from(map.values());
}

async function safeReadPaletteFacets(
  supabase: any,
  options: {
    hasToken: boolean;
    filmScope: "all" | "custom" | "preset";
    allowedProductIds: number[];
    paletteMain: string;
    paletteSub: string;
  }
) {
  try {
    return await readPaletteFacets(supabase, options);
  } catch (error) {
    console.error("[simulator/films] palette facets fallback:", error);
    return emptyPaletteFacets();
  }
}

async function readPaletteFacets(
  supabase: any,
  options: {
    hasToken: boolean;
    filmScope: "all" | "custom" | "preset";
    allowedProductIds: number[];
    paletteMain: string;
    paletteSub: string;
  }
) {
  let query = supabase
    .from("products")
    .select("id, palette_main, palette_sub, palette_color")
    .eq("manufacturer", "삼성필름")
    .eq("is_simulatable", true)
    .or("simulation_image_path.not.is.null,image_path.not.is.null")
    .limit(3000);

  if (options.hasToken && options.filmScope !== "all") {
    query = query.in("id", options.allowedProductIds);
  }

  const { data, error } = await query;

  if (error) throw error;

  const rows = ((data || []) as PaletteFacetRow[]).filter(Boolean);
  const mainRows = options.paletteMain
    ? rows.filter((row) => row.palette_main === options.paletteMain)
    : rows;
  const subRows = options.paletteSub
    ? mainRows.filter((row) => row.palette_sub === options.paletteSub)
    : mainRows;

  return {
    palette_mains: uniqueSorted(rows.map((row) => row.palette_main)),
    palette_subs: uniqueSorted(mainRows.map((row) => row.palette_sub)),
    palette_colors: uniqueSorted(subRows.map((row) => row.palette_color)),
  };
}

export async function GET(req: NextRequest) {
  const supabase = getSupabase();

  if (!supabase) {
    return jsonNoStore(
      { error: "Supabase 환경변수가 없습니다.", items: [] },
      { status: 500 }
    );
  }

  const q = cleanParam(req.nextUrl.searchParams.get("q"));
  const token = cleanParam(req.nextUrl.searchParams.get("token"));
  const paletteMain = cleanParam(req.nextUrl.searchParams.get("palette_main"));
  const paletteSub = cleanParam(req.nextUrl.searchParams.get("palette_sub"));
  const paletteColors = cleanPaletteColorParams(req);
  const skipFacets = cleanParam(req.nextUrl.searchParams.get("skip_facets")) === "1";
  const wantsRecommended = cleanParam(req.nextUrl.searchParams.get("recommended")) === "1";

  if (!token) {
    const auth = await requireSimulatorInstaller();

    if (!auth.ok) {
      return jsonNoStore(
        { error: auth.error, items: [] },
        { status: auth.status }
      );
    }
  }

  try {
    let allowedProductIds: number[] = [];
    let filmScope: "all" | "custom" | "preset" = "all";
    let presetId = "";
    const hasToken = token.length > 0;
    let recommendedProductIds: number[] = [];
    let recommendedOrderMap = new Map<number, number>();
    let allowedOrderMap = new Map<number, number>();

    if (hasToken) {
      const { data: link, error: linkError } = await supabase
        .from("simulator_links")
        .select("id, expires_at, is_active, film_scope, preset_id")
        .eq("token", token)
        .maybeSingle();

      if (linkError) throw linkError;

      const typedLink = link as {
        id: string;
        expires_at: string;
        is_active: boolean;
        film_scope: string | null;
        preset_id: string | null;
      } | null;

      if (!typedLink || !typedLink.is_active || isExpired(typedLink.expires_at)) {
        return jsonNoStore(
          { error: "만료된 링크입니다.", items: [] },
          { status: 410 }
        );
      }

      filmScope =
        typedLink.film_scope === "custom"
          ? "custom"
          : typedLink.film_scope === "preset"
            ? "preset"
            : "all";
      presetId = typedLink.preset_id || "";

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
        }
      }

      if (filmScope !== "all" && allowedProductIds.length === 0) {
          return jsonNoStore({
            items: [],
            ...(skipFacets
              ? {}
              : {
                  facets: {
                    palette_mains: [],
                    palette_subs: [],
                    palette_colors: [],
                  },
                }),
          });
        }
      }

    if (filmScope !== "all" && allowedProductIds.length > 0) {
      allowedOrderMap = new Map(
        allowedProductIds.map((productId: number, index: number) => [productId, index + 1])
      );
    }

    const shouldUseDefaultRecommended = wantsRecommended && filmScope === "all";

    if (shouldUseDefaultRecommended) {
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

    const isInitialRecommendedRequest =
      shouldUseDefaultRecommended &&
      !q &&
      !paletteMain &&
      !paletteSub &&
      paletteColors.length === 0;
    const hasRecommendedFilter = isInitialRecommendedRequest && recommendedProductIds.length > 0;

    const facets = skipFacets
      ? null
      : await safeReadPaletteFacets(supabase, {
          hasToken,
          filmScope,
          allowedProductIds,
          paletteMain,
          paletteSub,
        });

    let query = supabase
      .from("products")
      .select(PRODUCT_SELECT)
      .eq("manufacturer", "삼성필름")
      .eq("is_simulatable", true)
      .or("simulation_image_path.not.is.null,image_path.not.is.null")
      .limit(80);

    const orFilter = q ? buildDbOrFilter(q) : "";
    if (orFilter) query = query.or(orFilter);

    if (paletteMain) query = query.eq("palette_main", paletteMain);
    if (paletteSub) query = query.eq("palette_sub", paletteSub);
    if (paletteColors.length === 1) {
      query = query.eq("palette_color", paletteColors[0]);
    } else if (paletteColors.length > 1) {
      query = query.in("palette_color", paletteColors);
    }

    if (hasToken && filmScope !== "all") {
      query = query.in("id", allowedProductIds);
    } else if (hasRecommendedFilter) {
      query = query.in("id", recommendedProductIds);
    }

    const { data, error } = await query;
    if (error) throw error;

    let rawProducts = (data || []) as ProductRow[];

    // DB의 product_code_1 / product_code_2가 "CG/CF" + "5528"처럼 나뉜 경우,
    // 사용자가 CGCF5528처럼 붙여 검색하면 PostgREST ilike만으로는 빠질 수 있습니다.
    // 검색어가 있을 때는 같은 제한조건 안에서 한 번 더 넓게 가져와 클라이언트식 정규화 점수로 보강합니다.
    if (q) {
      try {
        let fallbackQuery = supabase
          .from("products")
          .select(PRODUCT_SELECT)
          .eq("manufacturer", "삼성필름")
          .eq("is_simulatable", true)
          .or("simulation_image_path.not.is.null,image_path.not.is.null")
          .limit(3000);

        if (paletteMain) fallbackQuery = fallbackQuery.eq("palette_main", paletteMain);
        if (paletteSub) fallbackQuery = fallbackQuery.eq("palette_sub", paletteSub);
        if (paletteColors.length === 1) {
          fallbackQuery = fallbackQuery.eq("palette_color", paletteColors[0]);
        } else if (paletteColors.length > 1) {
          fallbackQuery = fallbackQuery.in("palette_color", paletteColors);
        }

        if (hasToken && filmScope !== "all") {
          fallbackQuery = fallbackQuery.in("id", allowedProductIds);
        } else if (hasRecommendedFilter) {
          fallbackQuery = fallbackQuery.in("id", recommendedProductIds);
        }

        const { data: fallbackData, error: fallbackError } = await fallbackQuery;

        if (!fallbackError && fallbackData) {
          rawProducts = mergeProductRows([
            ...rawProducts,
            ...((fallbackData || []) as ProductRow[]),
          ]);
        }
      } catch (fallbackError) {
        console.error("[simulator/films] normalized search fallback:", fallbackError);
      }
    }

    const items = rawProducts
      .map((item: ProductRow) => ({ item, score: getScore(item, q) }))
      .filter(({ score }: { item: ProductRow; score: number }) => score > 0)
      .sort((a: { item: ProductRow; score: number }, b: { item: ProductRow; score: number }) => {
        if (hasRecommendedFilter && recommendedOrderMap.size > 0) {
          const aOrder = recommendedOrderMap.get(Number(a.item.id)) ?? 9999;
          const bOrder = recommendedOrderMap.get(Number(b.item.id)) ?? 9999;

          if (aOrder !== bOrder) return aOrder - bOrder;
        }

        if (b.score !== a.score) return b.score - a.score;

        if (hasToken && filmScope !== "all" && allowedOrderMap.size > 0) {
          const aOrder = allowedOrderMap.get(Number(a.item.id)) ?? 9999;
          const bOrder = allowedOrderMap.get(Number(b.item.id)) ?? 9999;

          if (aOrder !== bOrder) return aOrder - bOrder;
        }
        const aName = a.item.full_name || a.item.product_code_1 || "";
        const bName = b.item.full_name || b.item.product_code_1 || "";
        return aName.localeCompare(bName, "ko");
      })
      .slice(0, hasRecommendedFilter ? DEFAULT_RECOMMENDED_FILM_LIMIT : 60)
      .map(({ item }: { item: ProductRow; score: number }) => normalizeFilm(item));

    return jsonNoStore(
      {
        items,
        ...(facets ? { facets } : {}),
      },
      {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate",
        },
      }
    );
  } catch (error: any) {
    return jsonNoStore(
      { error: error?.message || "필름 검색 중 오류가 발생했습니다.", items: [] },
      { status: 500 }
    );
  }
}
