import { DEFAULT_RECOMMENDED_FILM_LIMIT } from "./film-normalizer";

export type FilmScope = "all" | "custom" | "preset";

export function isExpired(expiresAt: string) {
  const expiresTime = new Date(expiresAt).getTime();
  if (Number.isNaN(expiresTime)) return true;
  return Date.now() > expiresTime;
}

export async function readAllowedProductIds(
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

export async function readPresetProductIds(
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

export async function readDefaultRecommendedProductIds(supabase: any) {
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

export async function safeReadDefaultRecommendedProductIds(supabase: any) {
  try {
    return await readDefaultRecommendedProductIds(supabase);
  } catch (error) {
    console.error("[simulator/bootstrap] recommended films fallback:", error);
    return [];
  }
}
