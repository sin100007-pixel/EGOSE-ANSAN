"use client";

import React, { useState } from "react";
import ProductPreview from "./product-preview";
import InstallButton from "./components/InstallButton";

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
        body: JSON.stringify({ name, password, remember }),
      });

      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body?.message || "로그인 실패");
      window.location.href = "/dashboard";
    } catch (err: any) {
      setError(err?.message || "로그인 실패");
    } finally {
      setLoading(false);
    }
  }

  // 다크 테마 입력 필드
  const fieldStyle: React.CSSProperties = {
    display: "block",
    width: "100%",
    boxSizing: "border-box",
    padding: 12,
    margin: "6px 0 12px",
    borderRadius: 10,
    border: "1px solid #334155",     // slate-700
    background: "#0b1220",           // 아주 짙은 남색(검정에 가까움)
    color: "#fff",
  };

  // 로그인/설치 버튼(같은 스타일)
  const buttonStyle: React.CSSProperties = {
    display: "block",
    width: "100%",
    boxSizing: "border-box",
    padding: 12,
    margin: "0 0 12px 0",
    borderRadius: 10,
    border: "1px solid #475569",
    background: "#000",              // ← 버튼 배경도 검정
    color: "#fff",
    fontWeight: 700,
    cursor: "pointer",
  };

  const labelStyle: React.CSSProperties = {
    display: "block",
    marginTop: 6,
    marginBottom: 4,
    color: "#e5e7eb",                // 조금 밝은 회색 텍스트
    fontSize: 14,
  };

  return (
    <div style={{ padding: 24, maxWidth: 520, margin: "0 auto" }}>
      <h1 style={{ fontSize: 22, fontWeight: 800, marginBottom: 12 }}>
        런던마켓으로 로그인
      </h1>

      <form onSubmit={onSubmit}>
        <label style={labelStyle}>이름</label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="예) 홍길동"
          type="text"
          style={fieldStyle}
        />

        <label style={labelStyle}>비밀번호 (전화번호 뒷자리)</label>
        <input
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="예) 1234"
          type="password"
          style={fieldStyle}
        />

        {/* 로그인 버튼 */}
        <button disabled={loading} type="submit" style={buttonStyle}>
          {loading ? "로그인 중..." : "로그인"}
        </button>

        {/* 로그인 바로 아래: 설치 버튼 (동일 스타일) */}
        <InstallButton style={{ ...buttonStyle, marginTop: 8 }}>
          앱 설치
        </InstallButton>

        {error && (
          <p style={{ color: "#fca5a5", marginTop: 8 }}>
            {error}
          </p>
        )}

        <div
          style={{
            display: "flex",
            gap: 8,
            alignItems: "center",
            margin: "8px 0 12px",
          }}
        >
          <input
            type="checkbox"
            checked={remember}
            onChange={(e) => setRemember(e.target.checked)}
          />
          <span>로그인 유지</span>
        </div>
      </form>

      {/* 상품 미리보기(기존 컴포넌트 유지) */}
      <ProductPreview />
    </div>
  );
}