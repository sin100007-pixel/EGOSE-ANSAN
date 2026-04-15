"use client";

import type { Product } from "../types";
import ProductCard from "./ProductCard";

type ProductListProps = {
  items: Product[];
  hideConsumerPrice: boolean;
  hideInstallerPrice: boolean;
  isInBasket: (id: number) => boolean;
  onToggleBasket: (product: Product) => void;
  onOpenImage: (src: string, alt: string) => void;
};

export default function ProductList({
  items,
  hideConsumerPrice,
  hideInstallerPrice,
  isInBasket,
  onToggleBasket,
  onOpenImage,
}: ProductListProps) {
  return (
    <div
      style={{
        display: "grid",
        gap: 16,
      }}
    >
      {items.map((item) => (
        <ProductCard
          key={item.id}
          item={item}
          hideConsumerPrice={hideConsumerPrice}
          hideInstallerPrice={hideInstallerPrice}
          selected={isInBasket(item.id)}
          onToggleBasket={onToggleBasket}
          onOpenImage={onOpenImage}
        />
      ))}
    </div>
  );
}
