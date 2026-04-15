"use client";

import type { RefObject } from "react";
import { CARD_BG, CARD_BORDER, PAGE_BG, TEXT_SUB, THEME_COLOR, WATERMARK_SRC } from "../constants";
import type { PriceItem, Product } from "../types";
import { hasText } from "../utils";

type BasketExportSheetProps = {
  basketItems: Product[];
  basketExportRef: RefObject<HTMLDivElement | null>;
};

export default function BasketExportSheet({
  basketItems,
  basketExportRef,
}: BasketExportSheetProps) {
  return (
    <div
      style={{
        position: "fixed",
        left: -100000,
        top: 0,
        width: 900,
        zIndex: -1,
        pointerEvents: "none",
      }}
    >
      <div
        ref={basketExportRef}
        style={{
          position: "relative",
          width: 900,
          background: PAGE_BG,
          color: "#fff",
          padding: 28,
          boxSizing: "border-box",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            borderRadius: 28,
            padding: 22,
            background:
              "linear-gradient(180deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.03) 100%)",
            border: "1px solid rgba(238,224,197,0.14)",
            marginBottom: 18,
          }}
        >
          <div
            style={{
              fontSize: 34,
              fontWeight: 900,
              color: THEME_COLOR,
              marginBottom: 8,
            }}
          >
            필름바구니
          </div>
          <div
            style={{
              color: TEXT_SUB,
              fontSize: 16,
              lineHeight: 1.7,
            }}
          >
            선택한 필름과 색상을 한 번에 모아본 이미지입니다.
          </div>
        </div>

        <div
          style={{
            display: "grid",
            gap: 16,
          }}
        >
          {basketItems.map((item) => {
            const title =
              item.full_name || item.product_code_1 || item.color_name || "이름 없음";

            const exportPrices: PriceItem[] = [];

            const exportMetaBadges = [
              hasText(item.manufacturer)
                ? { label: "제조사", value: item.manufacturer.trim() }
                : null,
              hasText(item.product_code_1)
                ? { label: "코드1", value: item.product_code_1!.trim() }
                : null,
              hasText(item.product_code_2)
                ? { label: "코드2", value: item.product_code_2!.trim() }
                : null,
              hasText(item.category_main)
                ? { label: "대분류", value: item.category_main!.trim() }
                : null,
              hasText(item.category_sub)
                ? { label: "소분류", value: item.category_sub!.trim() }
                : null,
            ].filter(Boolean) as Array<{ label: string; value: string }>;

            return (
              <article
                key={`export-${item.id}`}
                style={{
                  borderRadius: 24,
                  padding: 16,
                  display: "grid",
                  gridTemplateColumns: "112px minmax(0, 1fr)",
                  gap: 16,
                  alignItems: "start",
                  background: CARD_BG,
                  border: `1px solid ${CARD_BORDER}`,
                }}
              >
                <div>
                  {item.image_url ? (
                    <img
                      src={item.image_url}
                      alt={title}
                      style={{
                        width: 112,
                        height: 112,
                        objectFit: "cover",
                        borderRadius: 18,
                        border: "1px solid rgba(238,224,197,0.16)",
                        background: "rgba(255,255,255,0.06)",
                        display: "block",
                      }}
                    />
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
                      fontWeight: 800,
                      fontSize: 28,
                      lineHeight: 1.25,
                      color: "#fff",
                      wordBreak: "keep-all",
                      marginBottom: 10,
                    }}
                  >
                    {title}
                  </div>

                  {exportMetaBadges.length > 0 && (
                    <div
                      style={{
                        display: "flex",
                        flexWrap: "wrap",
                        gap: 6,
                        marginBottom: exportPrices.length > 0 ? 14 : 0,
                        alignItems: "flex-start",
                      }}
                    >
                      {exportMetaBadges.map((meta) => (
                        <div
                          key={`${meta.label}-${meta.value}`}
                          style={{
                            display: "inline-flex",
                            width: "auto",
                            flex: "0 0 auto",
                            alignItems: "center",
                            justifyContent: "flex-start",
                            gap: 4,
                            alignSelf: "flex-start",
                            borderRadius: 999,
                            padding: "5px 9px",
                            background: "rgba(255,255,255,0.04)",
                            border: "1px solid rgba(255,255,255,0.07)",
                            lineHeight: 1.15,
                            maxWidth: "fit-content",
                            whiteSpace: "nowrap",
                          }}
                        >
                          <span
                            style={{
                              color: THEME_COLOR,
                              fontSize: 11,
                              fontWeight: 700,
                              flexShrink: 0,
                              whiteSpace: "nowrap",
                            }}
                          >
                            {meta.label}
                          </span>
                          <span
                            style={{
                              color: "#fff",
                              fontSize: 11.5,
                              fontWeight: 800,
                              flexShrink: 0,
                              whiteSpace: "nowrap",
                            }}
                          >
                            {meta.value}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </article>
            );
          })}
        </div>

        <div
          aria-hidden="true"
          style={{
            marginTop: 28,
            paddingTop: 18,
            borderTop: "1px solid rgba(238,224,197,0.10)",
            display: "flex",
            justifyContent: "flex-end",
          }}
        >
          <img
            src={WATERMARK_SRC}
            alt=""
            draggable={false}
            style={{
              display: "block",
              width: 300,
              maxWidth: "58%",
              height: "auto",
              opacity: 0.3,
              filter: "drop-shadow(0 8px 22px rgba(0,0,0,0.16))",
              userSelect: "none",
              pointerEvents: "none",
            }}
          />
        </div>
      </div>
    </div>
  );
}
