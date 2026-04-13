// app/components/ProductToggle.tsx
"use client";

import React, { useState } from "react";
import ProductPreview from "@/app/product-preview";

export default function ProductToggle() {
  const [open, setOpen] = useState(false);

  const buttonStyle: React.CSSProperties = {
    display: "block",
    width: "100%",
    boxSizing: "border-box",
    padding: 12,
    margin: "0 0 12px 0",
    borderRadius: 12,
    border: "1px solid #E6D7BD",
    background: "#EEDFC6",
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
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLButtonElement).style.background = "#EEDFC6";
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLButtonElement).style.background = "#EEDFC6";
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