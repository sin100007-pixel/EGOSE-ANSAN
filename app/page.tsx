"use client";

import React, { useState } from "react";
import ProductPreview from "./product-preview";
import InstallButton from "./components/InstallButton";
import KakaoChatButton from "./components/KakaoChatButton";

// 배경/버튼 색 (프로젝트 톤에 맞게 사용 중인 값 유지)
const BG_DARK = "#0F0C2E";
const BTN_BLUE = "#0019C9";
const BTN_BLUE_HOVER = "#1326D9";

// 로그인/앱설치/카카오 문의 버튼이 동일하게 보이도록 공통 스타일
const primaryBtnStyle: React.CSSProperties = {
  background: BTN_BLUE,
  color: "#fff",
  height: 48,
  borderRadius: 12,
  fontWeight: 700,
  padding: 12,
  boxSizing: "border-box",
  width: "100%",
};

export default function Page() {
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: 기존 로그인 처리 로직 그대로 유지
  };

  return (
    <div
      className="min-h-screen w-full flex items-center justify-center p-4"
      style={{ background: BG_DARK }}
    >
      <main className="w-full max-w-md">
        <h1 className="text-white text-2xl font-bold mb-6">런던마켓으로 로그인</h1>

        <form onSubmit={onSubmit} className="space-y-3">
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
            className="w-full transition"
            style={primaryBtnStyle}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background = BTN_BLUE_HOVER;
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background = BTN_BLUE;
            }}
          >
            로그인
          </button>

          {/* 앱 설치 버튼 - hoverColor prop 제거 */}
          <InstallButton
            className="w-full transition"
            style={primaryBtnStyle}
          >
            앱 설치
          </InstallButton>

          {/* ✅ 카카오 채팅문의 - 로그인 버튼 바로 아래 (같은 크기/색) */}
          <KakaoChatButton
            style={primaryBtnStyle}
            // KakaoChatButton은 hoverColor 지원: 동일 색감 유지
            hoverColor={BTN_BLUE_HOVER}
            label="카카오 채팅문의"
          />
        </form>

        {/* 판매중인 상품 보기 섹션 */}
        <div className="mt-8">
          <ProductPreview />
        </div>
      </main>
    </div>
  );
}