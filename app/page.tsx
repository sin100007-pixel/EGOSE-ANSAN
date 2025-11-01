"use client";

import React, { useState } from "react";
import ProductPreview from "./product-preview";

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
      if (!res.ok) {
        throw new Error(body?.message || "로그인 실패");
      }

      // 로그인 성공 → 대시보드로 이동
      window.location.href = "/dashboard";
    } catch (err: any) {
      setError(err?.message || "로그인 실패");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ padding: 24 }}>
      <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 12 }}>로그인</h1>

      <form onSubmit={onSubmit}>
        <label>이름</label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="예) 홍길동"
          type="text"
          style={{
            display: "block",
            width: "100%",
            padding: 10,
            margin: "6px 0 12px",
            borderRadius: 8,
          }}
        />

        <label>비밀번호 (전화번호 뒷자리)</label>
        <input
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="예) 1234"
          type="password"
          style={{
            display: "block",
            width: "100%",
            padding: 10,
            margin: "6px 0 12px",
            borderRadius: 8,
          }}
        />

        <button
          disabled={loading}
          type="submit"
          style={{
            width: "100%",
            padding: 12,
            borderRadius: 10,
            background: "#2563eb",
            color: "#fff",
            fontWeight: 600,
          }}
        >
          {loading ? "로그인 중..." : "로그인"}
        </button>

        {error && (
          <p style={{ color: "#fca5a5", marginTop: 8 }}>{error}</p>
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

      {/* 👇 로그인 버튼 아래: 상품 미리보기 토글 버튼 */}
      <ProductPreview />
    </div>
  );
}

