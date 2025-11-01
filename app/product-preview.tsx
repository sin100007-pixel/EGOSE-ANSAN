'use client';

import { useState } from 'react';

export default function ProductPreview() {
  const [open, setOpen] = useState(false);

  return (
    <div style={{ marginTop: 12 }}>
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        style={{
          width: "100%",
          padding: 12,
          borderRadius: 8,
          border: "1px solid #334155",
          background: "#111827",
          color: "#fff",
          fontWeight: 600,
          cursor: "pointer"
        }}
      >
        {open ? "상품 사진 닫기" : "판매중인 상품 보기"}
      </button>

      {open && (
        <div
          style={{
            marginTop: 10,
            borderRadius: 12,
            overflow: "hidden",
            border: "1px solid #334155",
            background: "#0b1220"
          }}
        >
          {/* 로컬 이미지 1장만 보여줌 */}
          <img
            src="/products/preview.jpg"
            alt="판매중인 상품 미리보기"
            style={{ display: "block", width: "100%", height: "auto" }}
          />
        </div>
      )}
    </div>
  );
}
