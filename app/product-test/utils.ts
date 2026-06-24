import type { PriceItem, Product } from "./types";

export const formatPrice = (price: number | null) => {
  return typeof price === "number" ? `${price.toLocaleString()}원` : "";
};

const CUT_FIRE_PRICE_ADDON = 1000;

const isCutFirePriceManufacturer = (manufacturer: string | null | undefined) => {
  if (!hasText(manufacturer)) {
    return false;
  }

  const normalized = manufacturer.trim().toLowerCase().replace(/\s+/g, "");

  return (
    normalized.includes("영림") ||
    normalized.includes("예림") ||
    normalized.includes("yerim")
  );
};

const makePriceItem = (
  label: string,
  price: number | null,
  showCutFirePrice: boolean
): PriceItem | null => {
  if (price === null) {
    return null;
  }

  if (showCutFirePrice && price > 0) {
    return {
      label,
      value: `롤 ${formatPrice(price)}`,
      cutValue: `재단 ${formatPrice(price + CUT_FIRE_PRICE_ADDON)}`,
    };
  }

  return { label, value: formatPrice(price) };
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
  const showCutFirePrice = isCutFirePriceManufacturer(item.manufacturer);

  return [
    !hideConsumerPrice
      ? makePriceItem("비방염 사업자가", item.non_fire_consumer_price, false)
      : null,
    !hideConsumerPrice
      ? makePriceItem("방염 사업자가", item.fire_consumer_price, showCutFirePrice)
      : null,
    !hideInstallerPrice
      ? makePriceItem("비방염 시공자가", item.non_fire_installer_price, false)
      : null,
    !hideInstallerPrice
      ? makePriceItem("방염 시공자가", item.fire_installer_price, showCutFirePrice)
      : null,
    makePriceItem("비방염 대리점가", item.non_fire_dealer_price, false),
    makePriceItem("방염 대리점가", item.fire_dealer_price, showCutFirePrice),
  ].filter(Boolean) as PriceItem[];
};
