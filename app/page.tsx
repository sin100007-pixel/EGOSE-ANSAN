"use client";

import React, { useState } from "react";
import ProductPreview from "./product-preview";

const BG_DARK = "#0F0C2E";
const BTN_BLUE = "#0019C9";
const BTN_BLUE_HOVER = "#1326D9";

export default function Page() {
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showProducts, setShowProducts] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ name, password, remember }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body?.message || "서버 오류가 발생했습니다.");
      try { localStorage.setItem("session_user", encodeURIComponent(name)); } catch {}
      window.location.href = "/dashboard";
    } catch (err: any) {
      setError(err?.message || "서버 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  }

  const inputClass =
    "w-full h-12 rounded-2xl bg-white px-4 outline-none placeholder-gray-400";
  const btnBase: React.CSSProperties = {
    display: "block",
    width: "100%",
    padding: 12,
    borderRadius: 12,
    background: BTN_BLUE,
    color: "#fff",
    fontWeight: 700,
    textAlign: "center",
    cursor: "pointer",
    border: "1px solid transparent",
  };

  return (
    <div className="min-h-screen w-full" style={{ background: BG_DARK }}>
      <div className="max-w-md mx-auto px-4 py-8">
        <h1 className="text-white text-2xl font-extrabold mb-6">
          런던마켓으로 로그인
        </h1>

        <form onSubmit={onSubmit} className="flex flex-col gap-3">
          <div>
            <label className="text-white block mb-2">이름</label>
            <input
              type="text"
              placeholder="예) 홍길동"
              className={inputClass}
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div>
            <label className="text-white block mb-2">
              비밀번호 (전화번호 뒷자리)
            </label>
            <input
              type="password"
              placeholder="예) 1234"
              className={inputClass}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

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
            style={btnBase}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background =
                BTN_BLUE_HOVER;
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background =
                BTN_BLUE;
            }}
            disabled={loading}
          >
            {loading ? "로그인 중..." : "로그인"}
          </button>

          {/* ✅ 에러 메시지: 로그인 버튼 바로 아래 */}
          {error && (
            <p className="text-red-400 text-sm -mt-1">
              {error}
            </p>
          )}

          {/* 카카오 채팅문의 버튼 */}
          <a
            href="http://pf.kakao.com/_IxgdJj/chat"
            target="_blank"
            rel="noopener noreferrer"
            style={btnBase}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLAnchorElement).style.background =
                BTN_BLUE_HOVER;
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLAnchorElement).style.background =
                BTN_BLUE;
            }}
          >
            카카오 채팅문의
          </a>

          {/* 판매중인 상품 보기 토글 */}
          <button
            type="button"
            style={btnBase}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background =
                BTN_BLUE_HOVER;
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background =
                BTN_BLUE;
            }}
            onClick={() => setShowProducts((v) => !v)}
          >
            {showProducts ? "상품 사진 닫기(확대해서 보세요.)" : "판매중인 상품 보기"}
          </button>
        </form>

        {showProducts && (
          <div className="mt-6">
            <ProductPreview showToggle={false} />
            <p className="text-red-500 text-sm mt-2">이미지를 확대 할 수 있습니다.</p>
          </div>
        )}
      </div>
    </div>
  );
}