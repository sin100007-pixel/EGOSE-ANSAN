"use client";
import React from "react";

type Props = {
  primaryButtonStyle?: React.CSSProperties; // 페이지에서 전달받아 버튼 컬러 통일
  primaryButtonHover?: string;
};

export default function ProductPreview({
  primaryButtonStyle,
  primaryButtonHover = "#1326D9",
}: Props) {
  // ...이미지/상태/로직 등 기존 내용 유지...

  function onClickOpen() {
    // 판매중인 상품 보기 동작
    const el = document.getElementById("product-preview");
    if (el) el.scrollIntoView({ behavior: "smooth" });
  }

  return (
    <section id="product-preview" style={{ marginTop: 20 }}>
      {/* 기존 이미지/콘텐츠 ... */}

      {/* 판매중인 상품 보기 버튼 (두 번째 색) */}
      <button
        style={primaryButtonStyle}
        onClick={onClickOpen}
        onMouseEnter={(e) => {
          if (primaryButtonHover) e.currentTarget.style.background = primaryButtonHover;
        }}
        onMouseLeave={(e) => {
          if (primaryButtonStyle?.background)
            e.currentTarget.style.background = String(primaryButtonStyle.background);
        }}
      >
        판매중인 상품 보기
      </button>
    </section>
  );
}