// app/page.tsx
"use client";

import React, { useState } from "react";
import Image from "next/image";
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
      if (!res.ok) throw new Error(body?.message || "서버 오류가 발생했습니다.");

      try {
        localStorage.setItem("session_user", encodeURIComponent(name));
      } catch {}
      window.location.href = "/dashboard";
    } catch (err: any) {
      setError(err?.message || "서버 오류가 발생했습니다.");
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
    fontSize: 16,
    cursor: "pointer",
    textAlign: "center",
    textDecoration: "none",
  };

  return (
    <div style={{ background: BG_DARK, minHeight: "100vh" }}>
      <div style={{ padding: 24, maxWidth: 520, margin: "0 auto" }}>
        <header style={{ width: "100%", marginBottom: 16 }}>
          <div
            style={{
              position: "relative",
              width: "100%",
              aspectRatio: "7 / 3",
              borderRadius: 12,
              overflow: "hidden",
            }}
          >
            <Image
              src="/london-market-hero.png"
              alt="LONDON MARKET"
              fill
              priority
              sizes="100vw"
              style={{ objectFit: "cover" }}
            />
          </div>
        </header>

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
            비밀번호
          </label>
          <input
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="4자리 숫자"
            type="password"
            style={fieldStyle}
          />

          <div
            style={{
              display: "flex",
              gap: 8,
              alignItems: "center",
              margin: "8px 0 12px",
              color: "#fff",
            }}
          >
            <input
              type="checkbox"
              checked={remember}
              onChange={(e) => setRemember(e.target.checked)}
            />
            <span>로그인 유지</span>
          </div>

          <button
            disabled={loading}
            type="submit"
            style={buttonStyle}
            onMouseEnter={(e) => (e.currentTarget.style.background = BTN_BLUE_HOVER)}
            onMouseLeave={(e) => (e.currentTarget.style.background = BTN_BLUE)}
          >
            {loading ? "로그인 중..." : "로그인"}
          </button>

          {error && <p style={{ color: "#fca5a5", margin: "6px 0 10px" }}>{error}</p>}

          <InstallButton
            style={{ ...buttonStyle, marginTop: 8 }}
            onMouseEnter={(e) =>
              ((e.currentTarget as HTMLButtonElement).style.background = BTN_BLUE_HOVER)
            }
            onMouseLeave={(e) =>
              ((e.currentTarget as HTMLButtonElement).style.background = BTN_BLUE)
            }
          >
            앱 설치
          </InstallButton>

          <a
            href="http://pf.kakao.com/_IxgdJj/chat"
            target="_blank"
            rel="noopener noreferrer"
            style={{ ...buttonStyle, marginTop: 8 }}
            onMouseEnter={(e) =>
              ((e.currentTarget as HTMLAnchorElement).style.background = BTN_BLUE_HOVER)
            }
            onMouseLeave={(e) =>
              ((e.currentTarget as HTMLAnchorElement).style.background = BTN_BLUE)
            }
          >
            카카오 채팅문의
          </a>

          <div style={{ marginTop: 12 }}>
            <ProductPreview showToggle />
          </div>
        
        {/* 회사 정보 푸터 */}
        <div
          style={{
            marginTop: 24,
            paddingTop: 8,
            borderTop: "1px solid rgba(255,255,255,0.08)",
            fontSize: 12,
            lineHeight: "18px",
            color: "rgba(255,255,255,0.6)",
            textAlign: "center",
          }}
        >
          <div>이고세(주)</div>
          <div>경기도 안산시 상록구 안산천서로 237</div>
          <div>Tel. 031-486-6882</div>
        </div>

      </form>
      </div>
    </div>
  );
}

