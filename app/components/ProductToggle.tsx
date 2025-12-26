// app/components/ProductToggle.tsx
"use client";

import React, { useMemo, useState } from "react";
import ProductPreview from "@/app/product-preview";

type Props = {
  buttonStyle?: React.CSSProperties;
};

export default function ProductToggle({ buttonStyle }: Props) {
  const [open, setOpen] = useState(false);

  // ✅ 기본값(혹시 다른 페이지에서 props 없이 써도 깨지지 않게)
  const fallbackStyle: React.CSSProperties = useMemo(
    () => ({
      display: "block",
      width: "100%",
      boxSizing: "border-box",
      padding: 12,
      margin: "0 0 12px 0",
      borderRadius: 12,
      border: "1px solid transparent",
      background: "#0019C9",
      color: "#111111",
      fontWeight: 700,
      fontSize: 16,
      textAlign: "center",
      cursor: "pointer",
      transition: "background-color 200ms ease",
    }),
    []
  );

  const styleToUse = buttonStyle ?? fallbackStyle;

  return (
    <div>
      <button
        type="button"
        style={styleToUse}
        onClick={() => setOpen((v) => !v)}
        onMouseEnter={(e) => {
          // ✅ hover: 배경만 살짝 진하게 (텍스트 색은 그대로 유지)
          const el = e.currentTarget as HTMLButtonElement;
          el.style.filter = "brightness(0.96)";
        }}
        onMouseLeave={(e) => {
          const el = e.currentTarget as HTMLButtonElement;
          el.style.filter = "none";
        }}
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
