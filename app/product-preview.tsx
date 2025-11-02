// app/product-preview.tsx
"use client";

import React, { useState } from "react";

type Props = {
  /** 내부 토글 버튼 사용 여부 (부모가 토글 맡으면 false) */
  showToggle?: boolean;

  /** ✅ 공식 이름 */
  primaryButtonStyle?: React.CSSProperties;
  primaryButtonHover?: string;

  /** ✅ 호환(별칭): 기존 코드에서 쓰던 이름도 허용 */
  buttonStyle?: React.CSSProperties;
  hoverColor?: string;

  /** showToggle=true일 때, 처음부터 열어둘지 */
  initialOpen?: boolean;
};

const IMG_SRC = "/products/preview.jpg"; // public/products/preview.jpg

export default function ProductPreview({
  showToggle = true,
  primaryButtonStyle,
  primaryButtonHover,
  // 별칭으로 들어오면 공식 이름으로 매핑
  buttonStyle,
  hoverColor,
  initialOpen = false,
}: Props) {
  // 우선순위: 공식 이름 > 별칭
  const mergedButtonStyle =
    (primaryButtonStyle as React.CSSProperties | undefined) ??
    (buttonStyle as React.CSSProperties | undefined);

  const mergedHover =
    (primaryButtonHover as string | undefined) ?? (hoverColor as string | undefined) ?? "";

  const [open, setOpen] = useState(initialOpen);

  // 부모가 토글 맡는 모드: 버튼 없이 이미지만
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

  // 내부 토글 버튼 사용하는 기본 모드
  return (
    <div style={{ width: "100%" }}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        onMouseEnter={(e) => {
          if (mergedHover) {
            (e.currentTarget as HTMLButtonElement).style.background = mergedHover;
          }
        }}
        onMouseLeave={(e) => {
          const bg =
            (mergedButtonStyle?.background as string) ??
            (mergedButtonStyle?.backgroundColor as string) ??
            "#1739f7";
          (e.currentTarget as HTMLButtonElement).style.background = bg;
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
          background:
            (mergedButtonStyle?.background as string) ??
            (mergedButtonStyle?.backgroundColor as string) ??
            "#1739f7",
          ...mergedButtonStyle,
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
