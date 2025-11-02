// app/components/ProductToggle.tsx
"use client";

import React, { useState } from "react";
import ProductPreview from "../product-preview";

type Props = {
  /** 공통 버튼 스타일(로그아웃/카카오/상품보기) */
  buttonStyle?: React.CSSProperties;
  /** 호버 시 바뀔 배경색 */
  hoverColor?: string;
  /** 처음부터 열려 있을지 여부 */
  initialOpen?: boolean;
};

export default function ProductToggle({
  buttonStyle = {
    display: "block",
    width: "100%",
    boxSizing: "border-box",
    padding: 12,
    margin: "0 0 12px 0",
    borderRadius: 12,
    border: "1px solid transparent",
    background: "#1739f7",
    color: "#ffffff",
    fontWeight: 700,
    cursor: "pointer",
    textAlign: "center",
  },
  hoverColor = "#1f2eea",
  initialOpen = false,
}: Props) {
  const [open, setOpen] = useState(initialOpen);

  return (
    <div>
      {/* 부모 토글 버튼 */}
      <button
        type="button"
        style={buttonStyle}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLButtonElement).style.background = hoverColor;
        }}
        onMouseLeave={(e) => {
          const bg =
            (buttonStyle.background as string) ??
            (buttonStyle.backgroundColor as string) ??
            "#1739f7";
          (e.currentTarget as HTMLButtonElement).style.background = bg;
        }}
        onClick={() => setOpen((v) => !v)}
      >
        {open ? "상품 사진 닫기(확대해서 보세요.)" : "판매중인 상품 보기"}
      </button>

      {/* 열렸을 때만 프리뷰, 내부 토글은 숨김 */}
      {open && (
        <div style={{ marginTop: 12 }}>
          <ProductPreview
            showToggle={false}                // ✅ 내부 버튼 숨김 모드
            primaryButtonStyle={buttonStyle}  // (컴포넌트 내부 호버 복원용)
            primaryButtonHover={hoverColor}
          />
          <p style={{ color: "#ef4444", marginTop: 8, fontSize: 14 }}>
            이미지를 확대 할 수 있습니다.
          </p>
        </div>
      )}
    </div>
  );
}
