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
  const btnStyle: React.CSSProperties = {
    display: "block",
    width: "100%",
    padding: 12,
    marginBottom: 12,
    borderRadius: 12,
    border: "none",
    background: "var(--btn-bg)",
    color: "#ffffff", // ✅ 버튼 글자는 항상 흰색
    fontWeight: 700,
    cursor: "pointer",
  };

  return (
    <>
      <Snowfall count={90} opacity={0.85} zIndex={60} />

      <main className="dash-root">
        <BgToWhiteOverlay />

        <div style={{ position: "relative", zIndex: 1 }}>
          <LondonMarketBanner />

          {/* ✅ 색이 변해야 하는 텍스트 */}
          <h2 className="info-text title">{name}님의 QR</h2>

          <div style={{ display: "flex", gap: 24, alignItems: "center" }}>
            <img src={qrUrl} alt="QR" style={{ width: 240 }} />
            <p className="info-text">전화번호 뒷자리: {phoneLast4}</p>
          </div>

          <section style={{ marginTop: 24 }}>
            <a href="/ledger" style={{ textDecoration: "none" }}>
              <button style={btnStyle}>거래내역 보기</button>
            </a>

            <InstallButton style={btnStyle}>앱 설치</InstallButton>

            <a
              href="http://pf.kakao.com/_IxgdJj/chat"
              target="_blank"
              rel="noreferrer"
              style={{ textDecoration: "none" }}
            >
              <button style={btnStyle}>카카오 채팅문의</button>
            </a>

            <ProductToggle buttonStyle={btnStyle} />
          </section>
        </div>

        <style jsx>{`
          .dash-root {
            /* ✅ 모바일 하단 남는 영역 방지 (핵심) */
            min-height: 100dvh;

            /* ✅ iOS 하단 안전영역까지 여유 */
            padding: 24px 16px max(80px, env(safe-area-inset-bottom));
            background: #0f0c2e;

            --info-fg: #ffffff;
            --btn-bg: #1739f7;

            animation: themeShift 4s ease-in-out forwards;
            animation-delay: 1s;
          }

          .info-text {
            color: var(--info-fg);
            transition: color 300ms ease;
          }

          .info-text.title {
            font-size: 28px;
            font-weight: 800;
            margin: 16px 0;
          }

          @keyframes themeShift {
            0% {
              --info-fg: #ffffff;
              --btn-bg: #1739f7;
            }

            40% {
              --info-fg: #666666;
              --btn-bg: #ff7a55;
            }

            100% {
              --info-fg: #111111;
              --btn-bg: #ff936e;
            }
          }
        `}</style>
      </main>
    </>
  );
}
