"use client";

import React, { useState } from "react";
import ProductPreview from "@/app/product-preview";

type ProductToggleProps = {
  bottomNav?: boolean;
};

function ProductIcon() {
  return (
    <svg viewBox="0 0 24 24" width="24" height="24" fill="none" aria-hidden="true">
      <rect x="4" y="5" width="16" height="14" rx="2.8" stroke="currentColor" strokeWidth="1.9" />
      <path d="M8 9h8M8 12h8M8 15h5" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
    </svg>
  );
}

export default function ProductToggle({ bottomNav = false }: ProductToggleProps) {
  const [open, setOpen] = useState(false);

  if (bottomNav) {
    return (
      <div style={{ position: "relative", overflow: "visible" }}>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-label="판매중인 상품 보기"
          style={{
            width: "100%",
            minHeight: 74,
            borderRadius: 18,
            border: "none",
            background: "transparent",
            color: "#1B1B1B",
            boxShadow: "none",
            padding: "10px 6px",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 6,
            fontWeight: 800,
            fontSize: 12,
            lineHeight: 1.1,
            letterSpacing: "-0.02em",
            textAlign: "center",
            cursor: "pointer",
          }}
        >
          <span
            style={{
              width: 28,
              height: 28,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#2A2A2A",
            }}
          >
            <ProductIcon />
          </span>
          판매상품
        </button>

        {open && (
          <div
            style={{
              position: "absolute",
              left: "50%",
              transform: "translateX(-50%)",
              bottom: "calc(100% + 16px)",
              width: "min(360px, calc(100vw - 28px))",
              background: "#FFFFFF",
              color: "#111111",
              borderRadius: 20,
              border: "1px solid rgba(0,0,0,0.08)",
              boxShadow: "0 18px 38px rgba(0,0,0,0.22)",
              padding: "14px 14px 12px",
              zIndex: 60,
            }}
          >
            <div
              style={{
                position: "absolute",
                left: "50%",
                bottom: -8,
                width: 16,
                height: 16,
                background: "#FFFFFF",
                borderRight: "1px solid rgba(0,0,0,0.08)",
                borderBottom: "1px solid rgba(0,0,0,0.08)",
                transform: "translateX(-50%) rotate(45deg)",
              }}
            />

            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 12,
                marginBottom: 10,
              }}
            >
              <div>
                <div
                  style={{
                    fontSize: 15,
                    fontWeight: 900,
                    letterSpacing: "-0.03em",
                    marginBottom: 2,
                  }}
                >
                  판매중인 상품
                </div>
                <div
                  style={{
                    fontSize: 12,
                    color: "#666666",
                    lineHeight: 1.35,
                  }}
                >
                  이미지를 눌러 확대해서 볼 수 있습니다.
                </div>
              </div>

              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="상품 풍선 닫기"
                style={{
                  width: 30,
                  height: 30,
                  borderRadius: "50%",
                  border: "1px solid rgba(0,0,0,0.08)",
                  background: "#F7F7F7",
                  color: "#333333",
                  fontSize: 16,
                  fontWeight: 800,
                  lineHeight: 1,
                  cursor: "pointer",
                  flexShrink: 0,
                }}
              >
                ×
              </button>
            </div>

            <ProductPreview showToggle={false} />
          </div>
        )}
      </div>
    );
  }

  const buttonStyle: React.CSSProperties = {
    display: "block",
    width: "100%",
    boxSizing: "border-box",
    padding: 12,
    margin: "0 0 12px 0",
    borderRadius: 12,
    border: "1px solid #D8CCB5",
    background: "#F3EBD9",
    color: "#111111",
    fontWeight: 700,
    fontSize: 13,
    textAlign: "center",
    cursor: "pointer",
  };

  return (
    <div>
      <button
        type="button"
        style={buttonStyle}
        onClick={() => setOpen((v) => !v)}
      >
        {open ? "상품 사진 닫기(확대해서 보세요.)" : "판매중인 상품 보기"}
      </button>

      {open && (
        <div style={{ marginTop: 12 }}>
          <ProductPreview showToggle={false} />
          <p style={{ color: "#ef4444", marginTop: 8, fontSize: 14 }}>
            이미지를 확대 할 수 있습니다.
          </p>
        </div>
      )}
    </div>
  );
}