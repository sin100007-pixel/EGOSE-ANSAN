// app/product-preview.tsx
"use client";

import React, { useState } from "react";

type Props = {
  /** 내부 토글 버튼을 사용할지 여부 (부모가 토글 담당 시 false) */
  showToggle?: boolean;
  /** 부모 버튼과 통일할 때 사용하는 스타일(호버 복원용 포함) */
  primaryButtonStyle?: React.CSSProperties;
  /** 호버 시 바뀔 배경색 */
  primaryButtonHover?: string;
  /** showToggle=true일 때, 처음부터 열어둘지 */
  initialOpen?: boolean;
};

const IMG_SRC = "/products/preview.jpg"; // public/products/preview.jpg

export default function ProductPreview({
  showToggle = true,
  primaryButtonStyle,
  primaryButtonHover = "",
  initialOpen = false,
}: Props) {
  const [open, setOpen] = useState(initialOpen);

  // 부모가 토글을 맡을 경우: 버튼 없이 이미지 블록만 렌더
  if (!showToggle) {
    return (
      <>
        <div
          style={{
            marginTop: 12,
            borderRadius: 12,
            overflow: "hidden",
            background: "#111827",
          }}
        >
          <img
            src={IMG_SRC}
            alt="판매중인 상품 미리보기"
            style={{ display: "block", width: "100%", height: "auto" }}
          />
        </div>
        <p style={{ color: "#ef4444", marginTop: 8, fontSize: 14 }}>
          이미지를 확대 할 수 있습니다.
        </p>
      </>
    );
  }

  // 내부 토글 버튼을 사용하는 기본 모드
  return (
    <div style={{ width: "100%" }}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        onMouseEnter={(e) => {
          if (primaryButtonHover) {
            (e.currentTarget as HTMLButtonElement).style.background = primaryButtonHover;
          }
        }}
        onMouseLeave={(e) => {
          if (primaryButtonStyle?.background) {
            (e.currentTarget as HTMLButtonElement).style.background = String(
              primaryButtonStyle.background
            );
          }
        }}
        style={{
          display: "block",
          width: "100%",
          padding: 12,
          border: "none",
          borderRadius: 12,
          cursor: "pointer",
          color: "#fff",
          fontWeight: 700,
          background: "#1739f7",
          ...primaryButtonStyle,
        }}
      >
        {open ? "상품 사진 닫기(확대해서 보세요.)" : "판매중인 상품 보기"}
      </button>

      {open && (
        <>
          <div
            style={{
              marginTop: 12,
              borderRadius: 12,
              overflow: "hidden",
              background: "#111827",
            }}
          >
            <img
              src={IMG_SRC}
              alt="판매중인 상품 미리보기"
              style={{ display: "block", width: "100%", height: "auto" }}
            />
          </div>
          <p style={{ color: "#ef4444", marginTop: 8, fontSize: 14 }}>
            이미지를 확대 할 수 있습니다.
          </p>
        </>
      )}
    </div>
  );
}
