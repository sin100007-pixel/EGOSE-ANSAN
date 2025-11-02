"use client";

import React, { useState } from "react";
import ProductPreview from "./product-preview";

const BG_DARK = "#0F0C2E";      // 배경
const BTN = "#0019C9";          // 버튼 기본색
const BTN_HOVER = "#1326D9";    // 버튼 호버색

// 공통 버튼 클래스
const btnClass =
  "w-full h-12 rounded-2xl text-white font-semibold transition";

export default function Page() {
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(false);
  const [showProducts, setShowProducts] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // ✅ 기존 로그인 로직을 그대로 두세요 (fetch("/api/login"...) 등)
  };

  return (
    <div className="min-h-screen w-full" style={{ background: BG_DARK }}>
      <div className="max-w-md mx-auto px-4 py-8">
        {/* 헤더 */}
        <h1 className="text-white text-2xl md:text-3xl font-extrabold mb-6">
          런던마켓으로 로그인
        </h1>

        {/* 폼 카드 */}
        <form onSubmit={onSubmit} className="flex flex-col gap-3">
          {/* 이름 */}
          <div>
            <label className="sr-only">이름</label>
            <input
              type="text"
              placeholder="예) 홍길동"
              className="w-full h-12 rounded-2xl bg-white px-4 outline-none placeholder-gray-400"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          {/* 비밀번호 */}
          <div>
            <label className="sr-only">비밀번호 (전화번호 뒷자리)</label>
            <input
              type="password"
              placeholder="예) 1234"
              className="w-full h-12 rounded-2xl bg-white px-4 outline-none placeholder-gray-400"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          {/* 로그인 유지 */}
          <label className="flex items-center gap-2 text-white text-sm mt-1">
            <input
              type="checkbox"
              checked={remember}
              onChange={(e) => setRemember(e.target.checked)}
            />
            로그인 유지
          </label>

          {/* 로그인 버튼 */}
          <button
            type="submit"
            className={btnClass}
            style={{ background: BTN }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background = BTN_HOVER;
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background = BTN;
            }}
          >
            로그인
          </button>

          {/* 판매중인 상품 보기 버튼 (토글) */}
          <button
            type="button"
            className={btnClass}
            style={{ background: BTN }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background = BTN_HOVER;
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background = BTN;
            }}
            onClick={() => setShowProducts((v) => !v)}
          >
            {showProducts ? "상품 사진 닫기(확대해서 보세요.)" : "판매중인 상품 보기"}
          </button>
        </form>

        {/* 상품 미리보기 (토글로 표시) */}
        {showProducts && (
          <div className="mt-6">
            <ProductPreview />
            <p className="text-red-500 text-sm mt-2">
              이미지를 확대 할 수 있습니다.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}