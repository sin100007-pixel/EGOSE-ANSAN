import { toPublicImageUrl } from "./image-url";

export const DEFAULT_RECOMMENDED_FILM_LIMIT = 24;
export const SIMULATOR_FILM_SEARCH_RESULT_LIMIT = 200;

export const PRODUCT_SELECT = `
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

export type ProductRow = {
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

export function normalizeFilm(item: ProductRow) {
  const { image_path, simulation_image_path, simulation_thumb_path, ...rest } = item;

  return {
    ...rest,
    image_url: toPublicImageUrl(simulation_image_path || image_path),
    // 검색결과 카드 섬네일은 simulation_thumb_path만 사용합니다.
    // fallback을 두면 어떤 이미지 컬럼이 노출되는지 확인하기 어려워집니다.
    thumb_url: toPublicImageUrl(simulation_thumb_path),
    sample_url: toPublicImageUrl(image_path),
  };
}

export function sortProductsByOrder(rows: ProductRow[], orderMap: Map<number, number>) {
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

export function mergeProductRows(rows: ProductRow[]) {
  const map = new Map<number, ProductRow>();

  rows.forEach((row) => {
    if (!row || !Number.isFinite(Number(row.id))) return;
    map.set(Number(row.id), row);
  });

  return Array.from(map.values());
}
