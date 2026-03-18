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
    border: "1px solid transparent",
    background: "#f7b6c8", // ✅ 로그인/다른 버튼들과 동일한 파란색
    color: "#111111",
    fontWeight: 700,
    fontSize: 13, // ✅ 글자 크기 통일
    textAlign: "center",
    cursor: "pointer",
  };

  return (
    <div>
      {/* 부모 토글 버튼 (여기서만 인터랙션) */}
      <button
        type="button"
        style={buttonStyle}
        onClick={() => setOpen((v) => !v)}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLButtonElement).style.background = "#f7b6c8"; // hover
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLButtonElement).style.background = "#f7b6c8";
        }}
      >
        {open ? "상품 사진 닫기(확대해서 보세요.)" : "판매중인 상품 보기"}
      </button>

      {/* 열렸을 때만 이미지, 내부 토글/힌트는 숨김(중복 방지) */}
      {open && (
        <div style={{ marginTop: 12 }}>
          <ProductPreview showToggle={false} />
          {/* ✅ 힌트는 여기서만 1회 출력 */}
          <p style={{ color: "#ef4444", marginTop: 8, fontSize: 14 }}>
            이미지를 확대 할 수 있습니다.
          </p>
        </div>
      )}
    </div>
  );
}
