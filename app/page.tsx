// app/page.tsx
"use client";

import React, { useEffect, useRef, useState } from "react";
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

  // 자동 로그인 안내 풍선
  const [autoLogging, setAutoLogging] = useState(false);

  // ✅ 풍선을 이름 입력칸의 왼쪽 상단에 고정하기 위한 ref/좌표
  const formRef = useRef<HTMLFormElement | null>(null);
  const nameInputRef = useRef<HTMLInputElement | null>(null);
  const [bubblePos, setBubblePos] = useState<{ left: number; top: number }>({ left: 0, top: 0 });

  useEffect(() => {
    if (typeof window === "undefined") return;

    const justLoggedOut = sessionStorage.getItem("justLoggedOut") === "1";
    if (justLoggedOut) return;

    const hasCookie = document.cookie.includes("session_user=");
    if (hasCookie) return;

    try {
      const stored = localStorage.getItem("session_user");
      if (stored) {
        setAutoLogging(true);
        // 12초 뒤 자동 숨김
        const t = setTimeout(() => setAutoLogging(false), 12000);
        return () => clearTimeout(t);
      }
    } catch {}
  }, []);

  // ✅ 이름 입력칸 기준으로 풍선 위치 계산
  useEffect(() => {
    const calc = () => {
      if (!formRef.current || !nameInputRef.current) return;
      const formRect = formRef.current.getBoundingClientRect();
      const inputRect = nameInputRef.current.getBoundingClientRect();
      const left = inputRect.left - formRect.left;  // 이름 입력칸의 왼쪽
      const top = inputRect.top - formRect.top;     // 이름 입력칸의 위쪽
      setBubblePos({ left, top });
    };
    calc();
    window.addEventListener("resize", calc);
    window.addEventListener("scroll", calc, true);
    return () => {
      window.removeEventListener("resize", calc);
      window.removeEventListener("scroll", calc, true);
    };
  }, [autoLogging]);

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
    lineHeight: "20px",
    textAlign: "center",
    cursor: "pointer",
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: BG_DARK,
        color: "#fff",
        display: "flex",
        justifyContent: "center",
      }}
    >
      <div style={{ width: "100%", maxWidth: 560, padding: 16 }}>
        <header style={{ margin: "6px 0 14px" }}>
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

        <form ref={formRef} onSubmit={onSubmit} style={{ position: "relative" }}>
          {/* 이름 */}
          <label style={{ display: "block", marginTop: 6, marginBottom: 4, color: "#e5e7eb" }}>
            이름
          </label>
          <input
            ref={nameInputRef}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="예) 홍길동"
            type="text"
            style={fieldStyle}
          />

          {/* 비밀번호 */}
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

          {/* 🔔 자동 로그인 중 풍선 — 이름 입력칸의 왼쪽 상단에 고정 */}
          {autoLogging && (
            <div
              className="login-bubble at-name"
              role="status"
              aria-live="polite"
              style={{
                left: bubblePos.left,
                top: bubblePos.top,
                transform: "translateY(-110%)", // 입력칸 바로 위로 살짝 띄우기
              }}
            >
              <div className="bubble-head">
                <span className="dot" /> 자동 로그인 중
              </div>
              <div className="bubble-body">로그인중입니다. 잠시만 기다려주세요.</div>
            </div>
          )}

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
              id="rememberMe"
            />
            <label htmlFor="rememberMe">로그인 유지</label>
          </div>

          {/* 로그인 버튼 */}
          <button
            type="submit"
            disabled={loading}
            style={{
              ...buttonStyle,
              opacity: loading ? 0.7 : 1,
              pointerEvents: loading ? "none" : "auto",
            }}
            onMouseEnter={(e) =>
              ((e.currentTarget as HTMLButtonElement).style.background = BTN_BLUE_HOVER)
            }
            onMouseLeave={(e) =>
              ((e.currentTarget as HTMLButtonElement).style.background = BTN_BLUE)
            }
          >
            {loading ? "로그인 중…" : "로그인"}
          </button>

          {/* 에러 메시지 */}
          {error && (
            <div
              style={{
                marginTop: 8,
                marginBottom: 8,
                background: "rgba(239,68,68,.15)",
                border: "1px solid rgba(239,68,68,.5)",
                color: "#fecaca",
                padding: 10,
                borderRadius: 8,
                textAlign: "center",
                fontSize: 14,
              }}
            >
              {error}
            </div>
          )}

          {/* 앱 설치 버튼 (asChild 제거) */}
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

          {/* 카카오 채팅문의 — 로그인 버튼과 동일 스타일 */}
          <a
            href="http://pf.kakao.com/_IxgdJj/chat"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              ...buttonStyle,
              marginTop: 8,
              textDecoration: "none",
              display: "block",
              textAlign: "center",
              color: "#ffffff",
            }}
            onMouseEnter={(e) =>
              ((e.currentTarget as HTMLAnchorElement).style.background = BTN_BLUE_HOVER)
            }
            onMouseLeave={(e) =>
              ((e.currentTarget as HTMLAnchorElement).style.background = BTN_BLUE)
            }
          >
            카카오 채팅문의
          </a>

          <ProductPreview />

          <div
            style={{
              marginTop: 14,
              paddingTop: 10,
              borderTop: "1px dashed rgba(255,255,255,.25)",
              color: "rgba(255,255,255,.8)",
              fontSize: 12,
              textAlign: "center",
            }}
          >
            <div>이고세(주)</div>
            <div>경기도 안산시 상록구 안산천서로 237</div>
            <div>Tel. 031-486-6882</div>
          </div>
        </form>
      </div>

      {/* 로그인중 풍선 스타일 */}
      <style jsx>{`
        .login-bubble {
          position: absolute;
          width: 280px;
          border-radius: 12px;
          border: 1px solid rgba(255, 255, 255, 0.85);
          background: linear-gradient(180deg, #1a1d3a 0%, #0f1129 100%);
          color: #fff;
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.35), inset 0 1px 0 rgba(255, 255, 255, 0.06);
          overflow: hidden;
          z-index: 20;
        }
        /* ⬇️ 이름 입력칸 상단에 붙는 버전: 아래 방향 화살표 */
        .login-bubble.at-name::after {
          content: "";
          position: absolute;
          left: 22px;     /* 이름 입력칸의 왼쪽 쪽을 가리키게 */
          bottom: -16px;  /* 풍선 아래에서 아래쪽으로 뾰족 나가게 */
          border: 8px solid transparent;
          border-top-color: #1a1d3a; /* 아래로 향하는 삼각형 */
        }
        .bubble-head {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 10px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.5);
          background: rgba(255, 255, 255, 0.06);
          font-weight: 700;
          letter-spacing: 0.02em;
        }
        .bubble-body {
          padding: 10px;
          line-height: 1.45;
          font-size: 14px;
        }
        .dot {
          width: 8px;
          height: 8px;
          border-radius: 999px;
          background: #22c55e;
          display: inline-block;
          animation: blink 1.1s infinite;
        }
        @keyframes blink {
          0%, 100% { opacity: 0.25; }
          50% { opacity: 1; }
        }

        @media (max-width: 480px) {
          .login-bubble { width: min(280px, 92%); }
        }
      `}</style>
    </div>
  );
}
