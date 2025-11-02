// app/product-preview.tsx
"use client";

import React, { useState } from "react";

type Props = {
  /** (선택) 부모에서 버튼 스타일 통일할 때 사용 */
  primaryButtonStyle?: React.CSSProperties;
  /** (선택) 호버 시 바뀔 배경색 */
  primaryButtonHover?: string;
  /** 내부 토글 버튼을 보일지 여부 (기본값 true) */
  showToggle?: boolean;
};

const STATIC_SRC = "/products/preview.jpg"; // ✅ public/products/preview.jpg 를 가리킴

export default function ProductPreview({
  primaryButtonStyle,
  primaryButtonHover = "",
  showToggle = true,
}: Props) {
  const [open, setOpen] = useState(false);

  const InternalToggleButton = (
    <button
      type="button"
      style={primaryButtonStyle}
      onMouseEnter={(e) => {
        if (primaryButtonHover)
          (e.currentTarget as HTMLButtonElement).style.background = primaryButtonHover;
      }}
      onMouseLeave={(e) => {
        if (primaryButtonStyle?.background)
          (e.currentTarget as HTMLButtonElement).style.background =
            String(primaryButtonStyle.background);
      }}
      onClick={() => setOpen((v) => !v)}
    >
      {open ? "상품 사진 닫기(확대해서 보세요.)" : "판매중인 상품 보기"}
    </button>
  );

  return (
    <div>
      {/* 필요할 때만 내부 토글 노출 (부모에서 showToggle={false}로 끌 수 있음) */}
      {showToggle && InternalToggleButton}

      {open && (
        <div style={{ marginTop: 12, textAlign: "center" }}>
          <img
            src={STATIC_SRC}
            alt="판매중인 상품 미리보기"
            style={{
              width: "100%",
              maxWidth: 720,
              height: "auto",
              borderRadius: 12,
              display: "inline-block",
            }}
          />
          <p style={{ color: "#ef4444", marginTop: 8, fontSize: 14 }}>
            이미지를 확대 할 수 있습니다.
          </p>
        </div>
      )}
    </div>
  );
}