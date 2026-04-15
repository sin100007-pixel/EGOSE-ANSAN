"use client";

import { CARD_BG, CARD_BORDER, TEXT_SUB, THEME_COLOR } from "../constants";
import type { Product } from "../types";
import { getVisiblePrices, hasText } from "../utils";

type ProductCardProps = {
  item: Product;
  hideConsumerPrice: boolean;
  hideInstallerPrice: boolean;
  selected: boolean;
  onToggleBasket: (product: Product) => void;
  onOpenImage: (src: string, alt: string) => void;
};

export default function ProductCard({
  item,
  hideConsumerPrice,
  hideInstallerPrice,
  selected,
  onToggleBasket,
  onOpenImage,
}: ProductCardProps) {
  const title = item.full_name || item.product_code_1 || item.color_name || "이름 없음";

  const metaBadges = [
    hasText(item.manufacturer)
      ? { label: "제조사", value: item.manufacturer.trim() }
      : null,
    hasText(item.product_code_1)
      ? { label: "코드1", value: item.product_code_1!.trim() }
      : null,
    hasText(item.product_code_2)
      ? { label: "코드2", value: item.product_code_2!.trim() }
      : null,
    hasText(item.color_name)
      ? { label: "색상명", value: item.color_name!.trim() }
      : null,
    hasText(item.category_main)
      ? { label: "대분류", value: item.category_main!.trim() }
      : null,
    hasText(item.category_sub)
      ? { label: "소분류", value: item.category_sub!.trim() }
      : null,
  ].filter(Boolean) as Array<{ label: string; value: string }>;

  const prices = getVisiblePrices(item, hideConsumerPrice, hideInstallerPrice);

  return (
    <article
      className="productCard"
      style={{
        borderRadius: 24,
        padding: 16,
        display: "grid",
        gridTemplateColumns: "112px minmax(0, 1fr)",
        gap: 16,
        alignItems: "start",
        background: CARD_BG,
        border: `1px solid ${CARD_BORDER}`,
        boxShadow: "0 14px 34px rgba(0,0,0,0.18)",
        backdropFilter: "blur(6px)",
      }}
    >
      <div>
        {item.image_url ? (
          <button
            type="button"
            className="imageButton"
            onClick={() => onOpenImage(item.image_url!, title)}
            aria-label={`${title} 큰 이미지 보기`}
            style={{
              width: 112,
              height: 112,
              padding: 0,
              border: "1px solid rgba(238,224,197,0.16)",
              background: "rgba(255,255,255,0.06)",
              cursor: "zoom-in",
              borderRadius: 18,
              overflow: "hidden",
              display: "block",
            }}
          >
            <img
              src={item.image_url}
              alt={title}
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
                display: "block",
              }}
            />
          </button>
        ) : (
          <div
            style={{
              width: 112,
              height: 112,
              borderRadius: 18,
              border: "1px solid rgba(238,224,197,0.14)",
              background: "rgba(255,255,255,0.05)",
              display: "grid",
              placeItems: "center",
              fontSize: 12,
              color: TEXT_SUB,
            }}
          >
            이미지 없음
          </div>
        )}
      </div>

      <div style={{ minWidth: 0 }}>
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: 12,
            flexWrap: "wrap",
            marginBottom: 10,
          }}
        >
          <div
            style={{
              fontWeight: 800,
              fontSize: 24,
              lineHeight: 1.25,
              color: "#fff",
              wordBreak: "keep-all",
            }}
          >
            {title}
          </div>

          <button
            type="button"
            className="addCircleButton"
            onClick={() => onToggleBasket(item)}
            aria-label={selected ? "필름바구니에서 빼기" : "필름바구니에 담기"}
            style={{
              width: 42,
              height: 42,
              borderRadius: 999,
              border: `1px solid ${
                selected ? "rgba(238,224,197,0.40)" : "rgba(255,255,255,0.12)"
              }`,
              background: selected
                ? "rgba(238,224,197,0.16)"
                : "rgba(255,255,255,0.05)",
              color: selected ? THEME_COLOR : "#fff",
              fontSize: 24,
              fontWeight: 800,
              lineHeight: 1,
              cursor: "pointer",
              flexShrink: 0,
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {selected ? "✓" : "+"}
          </button>
        </div>

        {metaBadges.length > 0 && (
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 8,
              marginBottom: prices.length > 0 ? 14 : 0,
            }}
          >
            {metaBadges.map((meta) => (
              <div
                key={`${meta.label}-${meta.value}`}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  borderRadius: 999,
                  padding: "8px 12px",
                  background: "rgba(255,255,255,0.05)",
                  border: "1px solid rgba(255,255,255,0.08)",
                  color: "#fff",
                  fontSize: 13,
                  lineHeight: 1.3,
                  maxWidth: "100%",
                }}
              >
                <span
                  style={{
                    color: THEME_COLOR,
                    fontWeight: 700,
                    flexShrink: 0,
                  }}
                >
                  {meta.label}
                </span>
                <span
                  style={{
                    color: "#fff",
                    opacity: 0.92,
                    wordBreak: "break-word",
                  }}
                >
                  {meta.value}
                </span>
              </div>
            ))}
          </div>
        )}

        {prices.length > 0 && (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
              gap: 10,
            }}
          >
            {prices.map((price) => (
              <div
                key={price.label}
                style={{
                  borderRadius: 16,
                  padding: "12px 14px",
                  background: "rgba(238,224,197,0.08)",
                  border: "1px solid rgba(238,224,197,0.14)",
                }}
              >
                <div
                  style={{
                    color: THEME_COLOR,
                    fontSize: 12,
                    marginBottom: 4,
                  }}
                >
                  {price.label}
                </div>
                <div
                  style={{
                    color: "#fff",
                    fontWeight: 800,
                    fontSize: 17,
                  }}
                >
                  {price.value}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </article>
  );
}
