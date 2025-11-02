"use client";

import React, { useState } from "react";
import ProductPreview from "./product-preview";
import InstallButton from "./components/InstallButton";

// 배경/버튼 컬러 (이전 톤 유지)
const BG_DARK = "#0F0C2E";
const BTN = "#0019C9";
const BTN_HOVER = "#1326D9";

// 로그인/카카오 버튼 공통 클래스
const btnClass =
  "w-full h-12 rounded-xl text-white font-semibold transition hover:opacity-95";

// 로그인/카카오 버튼 공통 인라인 스타일(hover는 클래스 + onMouseEnter/Leave로 처리)
const btnStyle: React.CSSProperties = {
  background: BTN,
};

export default function Page() {
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // ✅ 기존 로그인 처리 로직을 그대로 두세요.
    // ex) fetch("/api/login", { method:"POST", body: JSON.stringify({ name, password }) ... })
  };

  return (
    <div className="min-h-screen w-full" style={{ background: BG_DARK }}>
      {/* 가운데 카드 래퍼 */}
      <div className="max-w-md mx-auto px-4 py-8">
        <h1 className="text-white text-2xl font-extrabold mb-6">
          런던마켓으로 로그인
        </h1>

        {/* 카드 */}
        <div className="bg-transparent rounded-2xl">
          <form onSubmit={onSubmit} className="flex flex-col gap-3">
            {/* 입력필드 */}
            <input
              type="text"
              placeholder="이름"
              className="w-full h-12 rounded-xl bg-white px-4 outline-none"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <input
              type="password"
              placeholder="비밀번호(전화번호 뒷자리)"
              className="w-full h-12 rounded-xl bg-white px-4 outline-none"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />

            {/* 로그인 버튼 */}
            <button
              type="submit"
              className={btnClass}
              style={btnStyle}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLButtonElement).style.background = BTN_HOVER;
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.background = BTN;
              }}
            >
              로그인
            </button>

            {/* (선택) 앱 설치 버튼 — 같은 크기/색. 
                InstallButton이 className 전달을 지원하지 않는다면 이 블록을 주석 처리하세요. */}
            <InstallButton className={btnClass} style={btnStyle}>
              앱 설치
            </InstallButton>

            {/* 카카오 채팅문의 버튼 — 로그인 버튼과 동일 스타일 + 아래 간격 */}
            <a
              href="http://pf.kakao.com/_IxgdJj/chat"
              target="_blank"
              rel="noopener noreferrer"
              className={`${btnClass} mt-1`}
              style={btnStyle}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLAnchorElement).style.background = BTN_HOVER;
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLAnchorElement).style.background = BTN;
              }}
              aria-label="카카오 채팅으로 문의하기"
            >
              카카오 채팅문의
            </a>
          </form>
        </div>

        {/* 판매중인 상품 보기 섹션 (예전처럼 아래로 여백) */}
        <div className="mt-8">
          <ProductPreview />
        </div>
      </div>
    </div>
  );
}