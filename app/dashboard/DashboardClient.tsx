"use client";

import React from "react";
import InstallButton from "@/app/components/InstallButton";
import ProductToggle from "@/app/components/ProductToggle";
import LondonMarketBanner from "@/app/components/LondonMarketBanner";
import Snowfall from "@/app/components/Snowfall";

type Props = {
  name: string;
  phoneLast4: string;
  qrUrl: string;
};

export default function DashboardClient({ name, phoneLast4, qrUrl }: Props) {
  // 버튼 글자는 항상 흰색 고정
  const btnStyle: React.CSSProperties = {
    display: "block",
    width: "100%",
    padding: 12,
    marginBottom: 12,
    borderRadius: 12,
    border: "none",
    background: "var(--btn-bg)",
    color: "#ffffff",
    fontWeight: 700,
    cursor: "pointer",
  };

  const linkStyle: React.CSSProperties = {
    textDecoration: "none",
    color: "inherit",
  };

  return (
    <>
      {/* 눈은 항상 맨 위 */}
      <Snowfall count={90} opacity={0.85} zIndex={9999} />

      <main className="dash-root">
        {/* ✅ 핵심: 오버레이를 main 안에 둬서 남색 background 위로 무조건 올라오게 */}
        <div className="brightOverlay" aria-hidden />

        <div className="content">
          {/* ✅ 배너 안에 “감사 문구(2줄)” 표시 */}
          <LondonMarketBanner showThanksMessage />

          {/* 흰색 -> 검정으로 바뀌는 텍스트 */}
          <h2 className="info-text title">{name}님의 QR</h2>

          <div className="row">
            <img src={qrUrl} alt="QR" className="qr" />
            <p className="info-text">전화번호 뒷자리: {phoneLast4}</p>
          </div>

          <section style={{ marginTop: 24 }}>
            <a href="/ledger" style={linkStyle}>
              <button type="button" style={btnStyle}>
                거래내역 보기
              </button>
            </a>

            <InstallButton style={btnStyle}>앱 설치</InstallButton>

            <a
              href="http://pf.kakao.com/_IxgdJj/chat"
              target="_blank"
              rel="noreferrer"
              style={linkStyle}
            >
              <button type="button" style={btnStyle}>
                카카오 채팅문의
              </button>
            </a>

            <ProductToggle buttonStyle={btnStyle} />
          </section>
        </div>

        <style jsx>{`
          .dash-root {
            min-height: 100svh;
            min-height: 100dvh;

            padding: 24px 16px max(80px, env(safe-area-inset-bottom));
            background: #0f0c2e;

            /* 색상 변수 */
            --info-fg: #ffffff;
            --btn-bg: #1739f7;

            /* ✅ z-index를 주지 말아야 오버레이/컨텐츠 레이어링이 정상 동작 */
            position: relative;
            overflow: hidden;

            /* 텍스트/버튼 색 변화(오버레이 타이밍과 동일) */
            animation: themeShift 4s ease-in-out forwards;
            animation-delay: 1s;
          }

          /* ✅ 남색 배경 위로 올라오는 “흰색 밝아짐 레이어” */
          .brightOverlay {
            position: fixed;
            inset: 0;
            background: #ffffff;
            opacity: 0;
            pointer-events: none;

            /* dash-root background 위 / content 아래 */
            z-index: 1;

            animation: brightOverlay 4s ease-in-out forwards;
            animation-delay: 1s;
          }

          @keyframes brightOverlay {
            0% {
              opacity: 0;
            }
            100% {
              opacity: 1;
            }
          }

          .content {
            position: relative;
            z-index: 2;
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

          .row {
            display: flex;
            gap: 24px;
            align-items: center;
            flex-wrap: wrap;
          }

          .qr {
            width: 240px;
            height: auto;
            display: block;
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
