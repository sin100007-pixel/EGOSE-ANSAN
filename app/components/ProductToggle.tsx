"use client";

import React from "react";
import { useRouter } from "next/navigation";

type ProductToggleProps = {
  bottomNav?: boolean;
  active?: boolean;
};

function ProductIcon() {
  return (
    <svg viewBox="0 0 24 24" width="24" height="24" fill="none" aria-hidden="true">
      <rect x="4" y="5" width="16" height="14" rx="2.8" stroke="currentColor" strokeWidth="1.9" />
      <path d="M8 9h8M8 12h8M8 15h5" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
    </svg>
  );
}

export default function ProductToggle({ bottomNav = false, active = false }: ProductToggleProps) {
  const router = useRouter();

  if (bottomNav) {
    return (
      <button
        type="button"
        onClick={() => router.push("/products")}
        aria-label="판매중인 상품 보기"
        style={{
          width: "100%",
          minHeight: 74,
          borderRadius: 18,
          border: "none",
          background: active ? "rgba(255,255,255,0.34)" : "transparent",
          color: active ? "#111111" : "#1B1B1B",
          boxShadow: "none",
          padding: "10px 6px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 6,
          fontWeight: 800,
          fontSize: 12,
          lineHeight: 1.1,
          letterSpacing: "-0.02em",
          textAlign: "center",
          cursor: "pointer",
        }}
      >
        <span
          style={{
            width: 28,
            height: 28,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#2A2A2A",
          }}
        >
          <ProductIcon />
        </span>
        판매상품
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={() => router.push("/products")}
      style={{
        display: "block",
        width: "100%",
        boxSizing: "border-box",
        padding: 12,
        margin: "0 0 12px 0",
        borderRadius: 12,
        border: "1px solid #D8CCB5",
        background: "#F3EBD9",
        color: "#111111",
        fontWeight: 700,
        fontSize: 13,
        textAlign: "center",
        cursor: "pointer",
      }}
    >
      판매중인 상품 보기
    </button>
  );
}
