import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { requireSimulatorInstaller } from "../../../simulator/auth";
import { jsonNoStore, jsonSimulatorCache } from "../_lib/response";
import { getSupabase } from "../_lib/supabase";
import {
  DEFAULT_RECOMMENDED_FILM_LIMIT,
  PRODUCT_SELECT,
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
import { safeReadPaletteFacets } from "../_lib/palette-facets";
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
      .limit(100);

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
      .slice(0, hasRecommendedFilter ? DEFAULT_RECOMMENDED_FILM_LIMIT : 100)
      .map(({ item }: { item: ProductRow; score: number }) => normalizeFilm(item));

    return jsonSimulatorCache(req, {
      items,
      ...(facets ? { facets } : {}),
    });
  } catch (error: any) {
    return jsonNoStore(
      { error: error?.message || "필름 검색 중 오류가 발생했습니다.", items: [] },
      { status: 500 }
    );
  }
}
