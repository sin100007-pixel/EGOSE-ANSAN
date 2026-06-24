export type Product = {
  id: number;
  manufacturer: string;
  product_code_1: string | null;
  product_code_2: string | null;
  color_name: string | null;
  full_name: string | null;
  category_main: string | null;
  category_sub: string | null;
  non_fire_consumer_price: number | null;
  fire_consumer_price: number | null;
  non_fire_installer_price: number | null;
  fire_installer_price: number | null;
  non_fire_dealer_price: number | null;
  fire_dealer_price: number | null;
  image_url: string | null;
};

export type PriceItem = {
  label: string;
  value: string;
  cutValue?: string;
};

export type OpenedImage = {
  src: string;
  alt: string;
};
