import type { PriceItem, Product } from "./types";

export const formatPrice = (price: number | null) => {
  return typeof price === "number" ? `${price.toLocaleString()}원` : "";
};

export const hasText = (value: string | null | undefined) => {
  return typeof value === "string" && value.trim() !== "";
};

export const waitForImageLoad = (src: string) =>
  new Promise<void>((resolve) => {
    if (typeof window === "undefined") {
      resolve();
      return;
    }

    const image = new window.Image();
    image.decoding = "async";
    image.onload = () => resolve();
    image.onerror = () => resolve();
    image.src = src;

    if (image.complete) {
      resolve();
    }
  });

export const getVisiblePrices = (
  item: Product,
  hideConsumerPrice: boolean,
  hideInstallerPrice: boolean
): PriceItem[] => {
  return [
    !hideConsumerPrice && item.non_fire_consumer_price !== null
      ? { label: "비방염 소비자가", value: formatPrice(item.non_fire_consumer_price) }
      : null,
    !hideConsumerPrice && item.fire_consumer_price !== null
      ? { label: "방염 소비자가", value: formatPrice(item.fire_consumer_price) }
      : null,
    !hideInstallerPrice && item.non_fire_installer_price !== null
      ? { label: "비방염 시공자가", value: formatPrice(item.non_fire_installer_price) }
      : null,
    !hideInstallerPrice && item.fire_installer_price !== null
      ? { label: "방염 시공자가", value: formatPrice(item.fire_installer_price) }
      : null,
    item.non_fire_dealer_price !== null
      ? { label: "비방염 대리점가", value: formatPrice(item.non_fire_dealer_price) }
      : null,
    item.fire_dealer_price !== null
      ? { label: "방염 대리점가", value: formatPrice(item.fire_dealer_price) }
      : null,
  ].filter(Boolean) as PriceItem[];
};
