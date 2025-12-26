// app/dashboard/DashboardClient.tsx
"use client";

import React from "react";
import InstallButton from "@/app/components/InstallButton";
import ProductToggle from "@/app/components/ProductToggle";
import LondonMarketBanner from "@/app/components/LondonMarketBanner";
import Snowfall from "@/app/components/Snowfall";
import BgToWhiteOverlay from "@/app/components/BgToWhiteOverlay";

type Props = {
  name: string;
  phoneLast4: string;
  qrUrl: string;
};

export default function DashboardClient({ name, phoneLast4, qrUrl }: Props) {
  // ✅ 버튼 스타일: 글자색은 항상 흰색으로 고정
  const btnStyle: React.CSSProperties = {
    display: "block",
    width: "100%",
    boxSizing: "border-box",
    padding: 12,
    margin: "0 0 12px 0",
    borderRadius: 12,
    border: "1px solid transparent",
    background: "var(--btn-bg)", // 배경만 애니메이션
    color: "#ffffff", // ✅ 절대 고정 (중요)
    fontWeight: 700,
    textAlign: "center",
    cursor: "pointer",
  };

  const linkResetStyle: React.CSSProperties = {
    textDecoration: "none",
    color: "inherit",
  };

  return (
    <>
      <Snowfall count={90} opacity={0.85} zIndex={60} />

      <main
        className="dash-root"
        style={{
          maxWidth: 1100,
          margin: "0 auto",
          padding: "24px 16px 80px",
          minHeight: "100vh",
          background: "#0F0C2E",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* 배경 밝아짐 */}
        <BgToWhiteOverlay />

        <div style={{ position: "relative", zIndex: 1 }}>
          <header style={{ width: "100%", marginBottom: 16 }}>
            <LondonMarketBanner />
          </header>

          <h1 style={{ fontSize: 28, fontWeight: 800, marginBottom: 16, color: "#111" }}>
            {name}님의 QR
          </h1>

          <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
            <div style={{ width: 260 }}>
              <img src={qrUrl} alt="QR" style={{ width: "100%" }} />
            </div>
            <p style={{ marginTop: 12, color: "#111" }}>
              전화번호 뒷자리: {phoneLast4}
            </p>
          </div>

          <section style={{ marginTop: 24 }}>
            <a href="/ledger" style={linkResetStyle}>
              <button type="button" style={btnStyle}>
                거래내역 보기
              </button>
            </a>

            <InstallButton style={btnStyle}>앱 설치</InstallButton>

            <a
              href="http://pf.kakao.com/_IxgdJj/chat"
              target="_blank"
              rel="noreferrer"
              style={linkResetStyle}
            >
              <button type="button" style={btnStyle}>
                카카오 채팅문의
              </button>
            </a>

            {/* 판매중인 상품보기 */}
            <ProductToggle buttonStyle={btnStyle} />
          </section>
        </div>

        {/* 버튼 배경만 변하는 애니메이션 */}
        <style jsx>{`
          .dash-root {
            --btn-bg: #1739f7; /* 시작: 파랑 */

            animation: btnBgShift 4s ease-in-out forwards;
            animation-delay: 1s;
          }

          @keyframes btnBgShift {
            0% {
              --btn-bg: #1739f7;
            }
            50% {
              --btn-bg: #ff7a55;
            }
            100% {
              --btn-bg: #ff936e;
            }
          }
        `}</style>
      </main>
    </>
  );
}
