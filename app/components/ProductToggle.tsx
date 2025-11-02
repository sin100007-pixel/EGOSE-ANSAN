// app/components/ProductToggle.tsx
"use client";

import React, { useState } from "react";
import ProductPreview from "@/app/product-preview";

export default function ProductToggle() {
  const [open, setOpen] = useState(false);

  const btnBase = {
    display: "block",
    width: "100%",
    boxSizing: "border-box" as const,
    padding: 12,
    borderRadius: 12,
    border: "1px solid transparent",
    background: "#1739f7",
    color: "#ffffff",
    fontWeight: 700,
    cursor: "pointer",
    textAlign: "center" as const,
  };

  return (
    <div>
      {/* 부모 토글 버튼 (여기서만 인터랙션) */}
      <button
        type="button"
        style={btnBase}
        onClick={() => setOpen((v) => !v)}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLButtonElement).style.background = "#1f2eea";
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLButtonElement).style.background = "#1739f7";
        }}
      >
        {open ? "상품 사진 닫기(확대해서 보세요.)" : "판매중인 상품 보기"}
      </button>

      {/* 열렸을 때만 이미지, 내부 토글 숨김 */}
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
