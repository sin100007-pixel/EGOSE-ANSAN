export type SimulatorSpace = {
  id: string;
  name: string;
  description: string | null;
  thumbnail_url: string | null;
  base_image_url: string | null;
  overlay_image_url: string | null;
  mask_config: Record<string, unknown> | null;
  sort_order: number | null;
};

export type SimulatorFilm = {
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
  image_url: string | null;
  thumb_url?: string | null;
};

export type SimulatorLinkInfo = {
  token: string;
  installer_name: string | null;
  customer_name: string | null;
  expires_at: string;
  film_scope?: string | null;
};

export type SimulatorFilmPreset = {
  id: string;
  name: string;
  description: string | null;
  item_count: number;
};
