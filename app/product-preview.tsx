// app/product-preview.tsx
"use client";

import React, { useState } from "react";

type Props = {
  primaryButtonStyle?: React.CSSProperties; // 로그인/대시보드 버튼 스타일 그대로 전달
  primaryButtonHover?: string;              // 호버 배경색
  imageSrc?: string;                        // 프리뷰 이미지 경로
  openLabel?: string;                       // 기본: "판매중인 상품 보기"
  closeLabel?: string;                      // 기본: "닫기"
};

export default function ProductPreview({
  primaryButtonStyle,
  primaryButtonHover = "",
  imageSrc = "/products/preview.jpg",
  openLabel = "판매중인 상품 보기",
  closeLabel = "닫기",
}: Props) {
  const [open, setOpen] = useState(false);

  // 호버 후 원복용 기본 배경색
  const baseBg = (primaryButtonStyle?.background as string) || "";

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        style={primaryButtonStyle}
        onMouseEnter={(e) => {
          if (primaryButtonHover) {
            (e.currentTarget as HTMLButtonElement).style.background = primaryButtonHover;
          }
        }}
        onMouseLeave={(e) => {
          if (baseBg) {
            (e.currentTarget as HTMLButtonElement).style.background = baseBg;
          }
        }}
      >
        {open ? closeLabel : openLabel}
      </button>

      {open && (
        <div style={{ marginTop: 12, textAlign: "center" }}>
          <img
            src={imageSrc}
            alt="판매중인 상품 이미지"
            style={{
              width: "100%",
              maxWidth: 640,
              height: "auto",
              objectFit: "contain",
              background: "#111",
              borderRadius: 12,
              cursor: "zoom-in",
            }}
          />
          <p style={{ marginTop: 8, color: "#ef4444", fontSize: 14 }}>
            이미지를 확대 할 수 있습니다.
          </p>
        </div>
      )}
    </div>
  );
}