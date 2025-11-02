"use client";

import React, { useState } from "react";
import ProductPreview from "./product-preview";
import InstallButton from "./components/InstallButton";

const BG_DARK = "#0F0C2E";
const BTN_BLUE = "#0019C9";
const BTN_BLUE_HOVER = "#1326D9";

export default function Page() {
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

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
      if (!res.ok) throw new Error(body?.message || "로그인 실패");

      try { localStorage.setItem("session_user", encodeURIComponent(name)); } catch {}
      window.location.href = "/dashboard";
    } catch (err: any) {
      setError(err?.message || "로그인 실패");
    } finally {
      setLoading(false);
    }
  }

  const fieldStyle: React.CSSProperties = {
    display: "block",
    width: "100%",
    boxSizing: "border-box",
    padding: 12,
    margin: "6px 0 12px",
    borderRadius: 10,
    border: "1px solid #cbd5e1",
    background: "#ffffff",
    color: "#000000",
  };

  const buttonStyle: React.CSSProperties = {
    display: "block",
    width: "100%",
    boxSizing: "border-box",
    padding: 12,
    margin: "0 0 12px 0",
    borderRadius: 10,
    border: "1px solid transparent",
    background: BTN_BLUE,
    color: "#ffffff",
    fontWeight: 700,
    cursor: "pointer",
    textAlign: "center",
    textDecoration: "none",
  };

  return (
    <div style={{ padding: 24, maxWidth: 520, margin: "0 auto", background: BG_DARK }}>
      <h1 style={{ fontSize: 22, fontWeight: 800, marginBottom: 12, color: "#fff" }}>
        런던마켓으로 로그인
      </h1>

      <form onSubmit={onSubmit}>
        <label style={{ display: "block", marginTop: 6, marginBottom: 4, color: "#e5e7eb" }}>
          이름
        </label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="예) 홍길동"
          type="text"
          style={fieldStyle}
        />

        <label style={{ display: "block", marginTop: 6, marginBottom: 4, color: "#e5e7eb" }}>
          비밀번호 (전화번호 뒷자리)
        </label>
        <input
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="예) 1234"
          type="password"
          style={fieldStyle}
        />

        <div style={{ display: "flex", gap: 8, alignItems: "center", margin: "8px 0 12px", color: "#fff" }}>
          <input
            type="checkbox"
            checked={remember}
            onChange={(e) => setRemember(e.target.checked)}
          />
          <span>로그인 유지</span>
        </div>

        {/* 로그인 버튼 */}
        <button
          disabled={loading}
          type="submit"
          style={buttonStyle}
          onMouseEnter={(e) => (e.currentTarget.style.background = BTN_BLUE_HOVER)}
          onMouseLeave={(e) => (e.currentTarget.style.background = BTN_BLUE)}
        >
          {loading ? "로그인 중..." : "로그인"}
        </button>

        {/* ✅ 카카오 채팅문의 버튼 (로그인 버튼 바로 아래, 동일 모양/크기) */}
        <a
          href="http://pf.kakao.com/_IxgdJj/chat"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="카카오 채팅으로 문의하기"
          style={{ ...buttonStyle, marginTop: 8 }}
          onMouseEnter={(e) => (e.currentTarget as HTMLAnchorElement).style.background = BTN_BLUE_HOVER}
          onMouseLeave={(e) => (e.currentTarget as HTMLAnchorElement).style.background = BTN_BLUE}
        >
          카카오 채팅문의
        </a>

        {/* 앱 설치 버튼 (기존 그대로, 같은 스타일) */}
        <InstallButton style={{ ...buttonStyle, marginTop: 8 }}>
          앱 설치
        </InstallButton>

        {error && <p style={{ color: "#fca5a5", marginTop: 8 }}>{error}</p>}
      </form>

      <ProductPreview
        primaryButtonStyle={buttonStyle}
        primaryButtonHover={BTN_BLUE_HOVER}
      />
    </div>
  );
}