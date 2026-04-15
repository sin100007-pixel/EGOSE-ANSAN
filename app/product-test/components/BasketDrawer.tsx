"use client";

import { BROWN, TEXT_SUB, THEME_COLOR } from "../constants";
import type { Product } from "../types";
import { hasText } from "../utils";

type BasketDrawerProps = {
  basketItems: Product[];
  isBasketOpen: boolean;
  isExporting: boolean;
  onClose: () => void;
  onRemove: (id: number) => void;
  onClear: () => void;
  onSaveImage: () => void;
};

export default function BasketDrawer({
  basketItems,
  isBasketOpen,
  isExporting,
  onClose,
  onRemove,
  onClear,
  onSaveImage,
}: BasketDrawerProps) {
  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: isBasketOpen ? "rgba(0, 0, 0, 0.48)" : "rgba(0, 0, 0, 0)",
        opacity: isBasketOpen ? 1 : 0,
        pointerEvents: isBasketOpen ? "auto" : "none",
        transition: "opacity 0.24s ease, background 0.24s ease",
        zIndex: 4500,
      }}
    >
      <aside
        onClick={(e) => e.stopPropagation()}
        style={{
          position: "absolute",
          top: 0,
          right: 0,
          width: "min(420px, 92vw)",
          height: "100%",
          background:
            "linear-gradient(180deg, rgba(12,10,72,0.98) 0%, rgba(5,2,59,0.99) 100%)",
          borderLeft: "1px solid rgba(238,224,197,0.16)",
          boxShadow: "-18px 0 42px rgba(0,0,0,0.34)",
          transform: isBasketOpen ? "translateX(0)" : "translateX(104%)",
          transition: "transform 0.28s ease",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <div
          style={{
            padding: "22px 18px 14px",
            borderBottom: "1px solid rgba(238,224,197,0.10)",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 12,
              marginBottom: 10,
            }}
          >
            <div
              style={{
                fontSize: 26,
                fontWeight: 900,
                color: THEME_COLOR,
                lineHeight: 1.2,
              }}
            >
              필름바구니
            </div>

            <button
              type="button"
              onClick={onClose}
              aria-label="필름바구니 닫기"
              style={{
                width: 38,
                height: 38,
                borderRadius: 999,
                border: "1px solid rgba(238,224,197,0.16)",
                background: "rgba(255,255,255,0.05)",
                color: "#fff",
                fontSize: 20,
                cursor: "pointer",
              }}
            >
              ×
            </button>
          </div>

          <div
            style={{
              color: TEXT_SUB,
              fontSize: 14,
              lineHeight: 1.6,
              marginBottom: 12,
            }}
          >
            선택한 필름과 색상을 한 번에 모아볼 수 있어요.
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              flexWrap: "wrap",
            }}
          >
            <button
              type="button"
              className="saveBasketButton"
              onClick={onSaveImage}
              disabled={isExporting}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                border: "1px solid rgba(238,224,197,0.20)",
                borderRadius: 999,
                padding: "10px 14px",
                background: "rgba(238,224,197,0.10)",
                color: THEME_COLOR,
                fontSize: 14,
                fontWeight: 800,
                cursor: isExporting ? "default" : "pointer",
                opacity: isExporting ? 0.7 : 1,
              }}
            >
              <span>🖼️</span>
              <span>{isExporting ? "이미지 생성 중..." : "이미지 저장"}</span>
            </button>

            <button
              type="button"
              className="clearBasketButton"
              onClick={onClear}
              disabled={basketItems.length === 0 || isExporting}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                border: "1px solid rgba(255,255,255,0.16)",
                borderRadius: 999,
                padding: "10px 14px",
                background: "rgba(255,255,255,0.05)",
                color: "#fff",
                fontSize: 14,
                fontWeight: 800,
                cursor:
                  basketItems.length === 0 || isExporting ? "default" : "pointer",
                opacity: basketItems.length === 0 || isExporting ? 0.45 : 1,
              }}
            >
              <span>🗑️</span>
              <span>비우기</span>
            </button>
          </div>
        </div>

        <div
          style={{
            flex: 1,
            overflowY: "auto",
            padding: 16,
            display: "flex",
            flexDirection: "column",
            gap: 12,
            alignItems: "stretch",
          }}
        >
          {basketItems.length === 0 ? (
            <div
              style={{
                borderRadius: 22,
                padding: "22px 18px",
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(238,224,197,0.10)",
              }}
            >
              <div
                style={{
                  fontSize: 20,
                  fontWeight: 800,
                  color: THEME_COLOR,
                  marginBottom: 8,
                }}
              >
                아직 담긴 필름이 없어요
              </div>
              <div
                style={{
                  color: TEXT_SUB,
                  lineHeight: 1.7,
                  fontSize: 14,
                }}
              >
                검색 결과 카드 오른쪽 위의 + 버튼을 눌러 원하는 필름을 담아보세요.
              </div>
            </div>
          ) : (
            basketItems.map((item) => {
              const title =
                item.full_name || item.product_code_1 || item.color_name || "이름 없음";

              const basketMetaBadges = [
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
                  key={`basket-${item.id}`}
                  style={{
                    borderRadius: 22,
                    padding: 14,
                    background: "rgba(255,255,255,0.04)",
                    border: "1px solid rgba(238,224,197,0.12)",
                  }}
                >
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "72px minmax(0, 1fr)",
                      gap: 12,
                      alignItems: "start",
                    }}
                  >
                    {item.image_url ? (
                      <img
                        src={item.image_url}
                        alt={title}
                        style={{
                          width: 72,
                          height: 72,
                          objectFit: "cover",
                          borderRadius: 14,
                          border: "1px solid rgba(238,224,197,0.14)",
                          background: "rgba(255,255,255,0.05)",
                        }}
                      />
                    ) : (
                      <div
                        style={{
                          width: 72,
                          height: 72,
                          borderRadius: 14,
                          border: "1px solid rgba(238,224,197,0.14)",
                          background: "rgba(255,255,255,0.05)",
                          display: "grid",
                          placeItems: "center",
                          fontSize: 11,
                          color: TEXT_SUB,
                        }}
                      >
                        이미지 없음
                      </div>
                    )}

                    <div style={{ minWidth: 0 }}>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "flex-start",
                          justifyContent: "space-between",
                          gap: 10,
                          marginBottom: 8,
                        }}
                      >
                        <div
                          style={{
                            color: "#fff",
                            fontSize: 22,
                            fontWeight: 900,
                            lineHeight: 1.25,
                            wordBreak: "keep-all",
                          }}
                        >
                          {title}
                        </div>

                        <button
                          type="button"
                          onClick={() => onRemove(item.id)}
                          style={{
                            flexShrink: 0,
                            border: "1px solid rgba(255,255,255,0.12)",
                            borderRadius: 999,
                            padding: "7px 10px",
                            background: "rgba(255,255,255,0.04)",
                            color: "#fff",
                            fontSize: 12,
                            fontWeight: 700,
                            cursor: "pointer",
                          }}
                        >
                          삭제
                        </button>
                      </div>

                      {basketMetaBadges.length > 0 && (
                        <div
                          style={{
                            display: "flex",
                            flexWrap: "wrap",
                            gap: 5,
                            marginTop: 2,
                            alignItems: "flex-start",
                          }}
                        >
                          {basketMetaBadges.map((meta) => (
                            <div
                              key={`${meta.label}-${meta.value}`}
                              style={{
                                display: "inline-flex",
                                width: "auto",
                                flex: "0 0 auto",
                                alignItems: "center",
                                justifyContent: "flex-start",
                                gap: 3,
                                alignSelf: "flex-start",
                                borderRadius: 999,
                                padding: "3px 8px",
                                background: "rgba(255,255,255,0.04)",
                                border: "1px solid rgba(255,255,255,0.07)",
                                lineHeight: 1.1,
                                maxWidth: "fit-content",
                                whiteSpace: "nowrap",
                              }}
                            >
                              <span
                                style={{
                                  color: THEME_COLOR,
                                  fontSize: 10,
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
                                  fontSize: 10.5,
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
                  </div>
                </article>
              );
            })
          )}
        </div>
      </aside>
    </div>
  );
}
