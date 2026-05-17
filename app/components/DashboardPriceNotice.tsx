"use client";

import { useEffect, useState } from "react";

const STORAGE_KEY = "egose-dashboard-price-notice-2026-05-18";

export default function DashboardPriceNotice() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    try {
      const hidden = window.localStorage.getItem(STORAGE_KEY);
      if (hidden !== "hidden") {
        setIsVisible(true);
      }
    } catch {
      setIsVisible(true);
    }
  }, []);

  const handleClose = () => {
    setIsVisible(false);
  };

  const handleHideForever = () => {
    try {
      window.localStorage.setItem(STORAGE_KEY, "hidden");
    } catch {
      // localStorage를 사용할 수 없는 환경이어도 현재 화면에서는 닫히게 처리합니다.
    }
    setIsVisible(false);
  };

  if (!isVisible) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="dashboard-price-notice-title"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 2000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 18,
        background: "rgba(7, 6, 27, 0.72)",
        backdropFilter: "blur(6px)",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 360,
          borderRadius: 26,
          padding: "26px 22px 22px",
          background:
            "linear-gradient(180deg, rgba(255,255,255,0.99) 0%, rgba(255,250,242,0.99) 100%)",
          border: "1px solid rgba(255,255,255,0.92)",
          boxShadow: "0 24px 70px rgba(0,0,0,0.38)",
          textAlign: "center",
        }}
      >
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            width: 76,
            height: 76,
            borderRadius: "50%",
            marginBottom: 12,
            background: "linear-gradient(180deg, #fffaf0 0%, #f5efe2 100%)",
            border: "3px solid rgba(255,255,255,0.96)",
            boxShadow:
              "0 10px 24px rgba(21, 13, 60, 0.16), inset 0 0 0 1px rgba(21, 13, 60, 0.08)",
            overflow: "hidden",
          }}
        >
          <img
            src="/filmbot-button.png"
            alt="필름봇"
            style={{
              display: "block",
              width: 120,
              height: "auto",
              objectFit: "contain",
            }}
          />
        </div>

        <h2
          id="dashboard-price-notice-title"
          style={{
            margin: "0 0 16px",
            color: "#d71920",
            fontSize: 24,
            lineHeight: 1.28,
            fontWeight: 900,
            letterSpacing: "-0.055em",
            wordBreak: "keep-all",
          }}
        >
          필름봇단가 (일부)
          <br />
          갱신완료!
        </h2>

        <div
          style={{
            margin: "0 0 16px",
            padding: "14px 16px",
            borderRadius: 18,
            background: "rgba(215, 25, 32, 0.07)",
            border: "1px solid rgba(215, 25, 32, 0.13)",
            color: "#d71920",
            fontSize: 15,
            lineHeight: 1.72,
            fontWeight: 900,
            letterSpacing: "-0.035em",
            textAlign: "left",
            wordBreak: "keep-all",
          }}
        >
          <div>05.11 현대L&amp;C 갱신완료.</div>
          <div>05.11 삼성필름 갱신완료.</div>
          <div>05.18 영림필름 갱신완료.</div>
        </div>

        <p
          style={{
            margin: 0,
            color: "#2a2438",
            fontSize: 15,
            lineHeight: 1.66,
            fontWeight: 800,
            letterSpacing: "-0.035em",
            wordBreak: "keep-all",
          }}
        >
          미쳐 날뛰는 필름 시장의 한줄기 빛!
          <br />
          ✨️삼성 SLG✨️단가를 필름봇의 검색설정을 열어 확인해보세요!
        </p>

        <div
          style={{
            display: "flex",
            alignItems: "stretch",
            gap: 10,
            marginTop: 22,
          }}
        >
          <button
            type="button"
            onClick={handleHideForever}
            style={{
              flex: 1,
              minHeight: 54,
              border: "none",
              borderRadius: 18,
              background: "linear-gradient(180deg, #21164f 0%, #150d3c 100%)",
              color: "#fff5d7",
              fontSize: 16,
              fontWeight: 900,
              letterSpacing: "-0.03em",
              boxShadow: "0 10px 22px rgba(21, 13, 60, 0.28)",
              cursor: "pointer",
            }}
          >
            다시 보지 않기
          </button>

          <button
            type="button"
            onClick={handleClose}
            style={{
              flex: "0 0 78px",
              minHeight: 54,
              border: "1px solid rgba(21, 13, 60, 0.16)",
              borderRadius: 18,
              background: "rgba(21, 13, 60, 0.08)",
              color: "#21164f",
              fontSize: 14,
              fontWeight: 900,
              letterSpacing: "-0.03em",
              cursor: "pointer",
            }}
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
}
