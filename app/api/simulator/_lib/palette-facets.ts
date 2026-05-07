export type PaletteFacetRow = {
  id: number;
  palette_main: string | null;
  palette_sub: string | null;
  palette_color: string | null;
};

export function uniqueSorted(values: Array<string | null | undefined>) {
  return Array.from(
    new Set(
      values
        .map((value) => (value || "").trim())
        .filter((value) => value.length > 0)
    )
  ).sort((a, b) => a.localeCompare(b, "ko"));
}

export function emptyPaletteFacets() {
  return {
    palette_mains: [],
    palette_subs: [],
    palette_colors: [],
  };
}

export async function safeReadPaletteFacets(
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

export async function readPaletteFacets(
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
