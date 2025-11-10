// app/product-preview.tsx
"use client";

import React, { useState } from "react";

type Props = {
  /** 부모가 토글을 맡으면 false(이미지만 렌더) */
  showToggle?: boolean;
  /** showToggle=true일 때, 처음부터 열어둘지 */
  initialOpen?: boolean;
};

const IMG_SRC = "/products/preview.jpg"; // public/products/preview.jpg

export default function ProductPreview({
  showToggle = true,
  initialOpen = false,
}: Props) {
  const [open, setOpen] = useState(initialOpen);

  // ✅ 부모가 토글 담당: 이미지만 렌더 (힌트는 부모가 1회 출력)
  if (!showToggle) {
    return (
      <div
        style={{
          borderRadius: 12,
          overflow: "hidden",
          border: "1px solid rgba(255,255,255,0.12)",
          background: "#111827",
        }}
      >
        <img
          src={IMG_SRC}
          alt="판매중인 상품 미리보기"
          style={{ display: "block", width: "100%", height: "auto" }}
        />
      </div>
    );
  }

  // ✅ 내부 토글 버튼 사용 모드(단일 사용 시): 버튼 + (열렸을 때) 이미지 + 힌트 1회
  const buttonStyle: React.CSSProperties = {
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
    fontSize: 16,
    textAlign: "center",
    cursor: "pointer",
  };

  return (
    <div style={{ width: "100%" }}>
      <button
        type="button"
        style={buttonStyle}
        onClick={() => setOpen((v) => !v)}
        onMouseEnter={(e) =>
          ((e.currentTarget as HTMLButtonElement).style.background = "#1326D9")
        }
        onMouseLeave={(e) =>
          ((e.currentTarget as HTMLButtonElement).style.background = "#0019C9")
        }
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
              border: "1px solid rgba(255,255,255,0.12)",
              background: "#111827",
            }}
          >
            <img
              src={IMG_SRC}
              alt="판매중인 상품 미리보기"
              style={{ display: "block", width: "100%", height: "auto" }}
            />
          </div>
          {/* ✅ 토글 모드에서만 힌트 1회 출력 */}
          <p style={{ color: "#ef4444", marginTop: 8, fontSize: 14 }}>
            이미지를 확대 할 수 있습니다.
          </p>
        </>
      )}
    </div>
  );
}
