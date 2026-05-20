import { NextRequest } from "next/server";
import { requireSimulatorInstaller } from "../../../simulator/auth";
import { jsonNoStore, jsonSimulatorCache } from "../_lib/response";
import { getSupabase } from "../_lib/supabase";
import {
  DEFAULT_RECOMMENDED_FILM_LIMIT,
  SIMULATOR_FILM_SEARCH_RESULT_LIMIT,
  PRODUCT_LEGACY_SELECT,
  PRODUCT_SELECT,
  isMissingProductOptionalColumnError,
  mergeProductRows,
  normalizeFilm,
  type ProductRow,
} from "../_lib/film-normalizer";
import {
  isExpired,
  readAllowedProductIds,
  readPresetProductIds,
  safeReadDefaultRecommendedProductIds,
} from "../_lib/link-scope";
import { emptyPaletteFacets, safeReadPaletteFacets } from "../_lib/palette-facets";
import {
  buildDbOrFilter,
  cleanPaletteColorParams,
  cleanParam,
  getScore,
} from "../_lib/search";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

type FilmSearchContext = {
  hasToken: boolean;
  filmScope: "all" | "custom" | "preset";
  allowedProductIds: number[];
  allowedOrderMap: Map<number, number>;
  shouldUseDefaultRecommended: boolean;
  recommendedProductIds: number[];
  recommendedOrderMap: Map<number, number>;
  q: string;
  paletteMain: string;
  paletteSub: string;
  paletteColors: string[];
  skipFacets: boolean;
};

const EMPTY_FACETS = emptyPaletteFacets();

async function runFilmSearch(
  supabase: any,
  req: NextRequest,
  context: FilmSearchContext,
  includeOptionalColumns: boolean
) {
  const {
    hasToken,
    filmScope,
    allowedProductIds,
    allowedOrderMap,
    shouldUseDefaultRecommended,
    recommendedProductIds,
    recommendedOrderMap,
    q,
    paletteMain,
    paletteSub,
    paletteColors,
    skipFacets,
  } = context;

  const isKeywordSearch = q.length > 0;
  const canUsePaletteColumns = includeOptionalColumns;

  // 검색어가 있을 때는 1차/2차/색상 팔레트가 선택되어 있어도
  // 제품번호/색상명 검색이 전체 필름 범위에서 먼저 작동해야 합니다.
  // 단, 고객 링크의 직접선택/프리셋 제한 범위는 그대로 유지합니다.
  const effectivePaletteMain = isKeywordSearch || !canUsePaletteColumns ? "" : paletteMain;
  const effectivePaletteSub = isKeywordSearch || !canUsePaletteColumns ? "" : paletteSub;
  const effectivePaletteColors = isKeywordSearch || !canUsePaletteColumns ? [] : paletteColors;

  const isInitialRecommendedRequest =
    shouldUseDefaultRecommended &&
    !q &&
    !effectivePaletteMain &&
    !effectivePaletteSub &&
    effectivePaletteColors.length === 0;
  const hasRecommendedFilter = isInitialRecommendedRequest && recommendedProductIds.length > 0;

  const facets = skipFacets
    ? null
    : canUsePaletteColumns
      ? await safeReadPaletteFacets(supabase, {
          hasToken,
          filmScope,
          allowedProductIds,
          paletteMain: effectivePaletteMain,
          paletteSub: effectivePaletteSub,
        })
      : EMPTY_FACETS;

  let query = supabase
    .from("products")
    .select(includeOptionalColumns ? PRODUCT_SELECT : PRODUCT_LEGACY_SELECT)
    .eq("manufacturer", "삼성필름")
    .eq("is_simulatable", true)
    .or("simulation_image_path.not.is.null,image_path.not.is.null")
    .limit(SIMULATOR_FILM_SEARCH_RESULT_LIMIT);

  const orFilter = q ? buildDbOrFilter(q, includeOptionalColumns) : "";
  if (orFilter) query = query.or(orFilter);

  if (effectivePaletteMain) query = query.eq("palette_main", effectivePaletteMain);
  if (effectivePaletteSub) query = query.eq("palette_sub", effectivePaletteSub);
  if (effectivePaletteColors.length === 1) {
    query = query.eq("palette_color", effectivePaletteColors[0]);
  } else if (effectivePaletteColors.length > 1) {
    query = query.in("palette_color", effectivePaletteColors);
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
        .select(includeOptionalColumns ? PRODUCT_SELECT : PRODUCT_LEGACY_SELECT)
        .eq("manufacturer", "삼성필름")
        .eq("is_simulatable", true)
        .or("simulation_image_path.not.is.null,image_path.not.is.null")
        .limit(3000);

      if (effectivePaletteMain) fallbackQuery = fallbackQuery.eq("palette_main", effectivePaletteMain);
      if (effectivePaletteSub) fallbackQuery = fallbackQuery.eq("palette_sub", effectivePaletteSub);
      if (effectivePaletteColors.length === 1) {
        fallbackQuery = fallbackQuery.eq("palette_color", effectivePaletteColors[0]);
      } else if (effectivePaletteColors.length > 1) {
        fallbackQuery = fallbackQuery.in("palette_color", effectivePaletteColors);
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
    .slice(0, hasRecommendedFilter ? DEFAULT_RECOMMENDED_FILM_LIMIT : SIMULATOR_FILM_SEARCH_RESULT_LIMIT)
    .map(({ item }: { item: ProductRow; score: number }) => normalizeFilm(item));

  return jsonSimulatorCache(req, {
    items,
    ...(facets ? { facets } : {}),
  });
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
        return jsonSimulatorCache(req, {
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

    const context: FilmSearchContext = {
      hasToken,
      filmScope,
      allowedProductIds,
      allowedOrderMap,
      shouldUseDefaultRecommended,
      recommendedProductIds,
      recommendedOrderMap,
      q,
      paletteMain,
      paletteSub,
      paletteColors,
      skipFacets,
    };

    try {
      return await runFilmSearch(supabase, req, context, true);
    } catch (error) {
      if (!isMissingProductOptionalColumnError(error)) throw error;

      console.error("[simulator/films] optional products columns missing, retrying legacy select:", error);
      return await runFilmSearch(supabase, req, context, false);
    }
  } catch (error: any) {
    return jsonNoStore(
      { error: error?.message || "필름 검색 중 오류가 발생했습니다.", items: [] },
      { status: 500 }
    );
  }
}
