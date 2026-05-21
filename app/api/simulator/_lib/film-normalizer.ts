import { toPublicImageUrl } from "./image-url";

export const DEFAULT_RECOMMENDED_FILM_LIMIT = 70;
export const SIMULATOR_FILM_SEARCH_RESULT_LIMIT = 200;

// 썸네일 파일을 다시 업로드했을 때 브라우저/CDN 캐시를 깨기 위한 버전값
// 나중에 썸네일을 또 전체 교체하면 이 값만 바꿔주면 됩니다.
const SIMULATOR_THUMB_CACHE_VERSION = "20260518-1";

export const PRODUCT_CORE_SELECT = `
  id,
  manufacturer,
  product_code_1,
  product_code_2,
  color_name,
  full_name,
  category_main,
  category_sub,
  image_path,
  simulation_image_path
`;

export const PRODUCT_SELECT = `
  ${PRODUCT_CORE_SELECT},
  palette_main,
  palette_sub,
  palette_color,
  simulation_thumb_path
`;

export const PRODUCT_LEGACY_SELECT = PRODUCT_CORE_SELECT;

export const PRODUCT_OPTIONAL_COLUMN_NAMES = [
  "palette_main",
  "palette_sub",
  "palette_color",
  "simulation_thumb_path",
];

export type ProductRow = {
  id: number;
  manufacturer: string | null;
  product_code_1: string | null;
  product_code_2: string | null;
  color_name: string | null;
  full_name: string | null;
  category_main: string | null;
  category_sub: string | null;
  palette_main?: string | null;
  palette_sub?: string | null;
  palette_color?: string | null;
  image_path: string | null;
  simulation_image_path: string | null;
  simulation_thumb_path?: string | null;
};

export function isMissingProductOptionalColumnError(error: unknown) {
  const message = String(
    (error as { message?: unknown; details?: unknown; hint?: unknown; code?: unknown } | null)?.message ||
      (error as { details?: unknown } | null)?.details ||
      (error as { hint?: unknown } | null)?.hint ||
      ""
  ).toLowerCase();
  const code = String((error as { code?: unknown } | null)?.code || "").toLowerCase();

  if (!message && !code) return false;

  const mentionsOptionalColumn = PRODUCT_OPTIONAL_COLUMN_NAMES.some((column) =>
    message.includes(column.toLowerCase())
  );

  return (
    mentionsOptionalColumn ||
    code === "pgrst204" ||
    (message.includes("schema cache") && message.includes("products")) ||
    (message.includes("column") && message.includes("does not exist"))
  );
}

function addCacheVersion(url: string | null) {
  if (!url) return null;

  try {
    const nextUrl = new URL(url);
    nextUrl.searchParams.set("v", SIMULATOR_THUMB_CACHE_VERSION);
    return nextUrl.toString();
  } catch {
    return `${url}${url.includes("?") ? "&" : "?"}v=${SIMULATOR_THUMB_CACHE_VERSION}`;
  }
}

export function normalizeFilm(item: ProductRow) {
  const {
    image_path,
    simulation_image_path,
    simulation_thumb_path = null,
    palette_main = null,
    palette_sub = null,
    palette_color = null,
    ...rest
  } = item;

  // DB에 simulation_thumb_path 컬럼이 아직 없거나 값이 비어 있으면
  // 고객 링크가 빈 카드로 멈추지 않도록 시뮬레이션 이미지/샘플 이미지로 한 번만 대체합니다.
  const thumbUrl = toPublicImageUrl(simulation_thumb_path || simulation_image_path || image_path);

  return {
    ...rest,
    palette_main,
    palette_sub,
    palette_color,
    image_url: toPublicImageUrl(simulation_image_path || image_path),
    thumb_url: addCacheVersion(thumbUrl),
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
