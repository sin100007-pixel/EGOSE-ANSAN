"use client";

import { useEffect, useState } from "react";

const NOTICE_STORAGE_KEY = "egose-ledger-apology-notice-hidden-v1";

export default function LedgerApologyNotice() {
  const [isReady, setIsReady] = useState(false);
  const [isHidden, setIsHidden] = useState(true);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(NOTICE_STORAGE_KEY);
      setIsHidden(saved === "true");
    } catch {
      setIsHidden(false);
    } finally {
      setIsReady(true);
    }
  }, []);

  const handleHideForever = () => {
    try {
      window.localStorage.setItem(NOTICE_STORAGE_KEY, "true");
    } catch {
      // localStorage를 사용할 수 없는 환경이어도 현재 화면에서는 닫히게 처리합니다.
    }

    setIsHidden(true);
  };

  if (!isReady || isHidden) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="ledger-apology-notice-title"
      aria-describedby="ledger-apology-notice-body"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 90,
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "center",
        padding: "118px 18px 18px",
        pointerEvents: "auto",
      }}
    >
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          inset: 0,
          background: "rgba(5, 4, 20, 0.38)",
          backdropFilter: "blur(2px)",
        }}
      />

      <section
        aria-label="거래내역보기 오류 사과문"
        style={{
          position: "relative",
          width: "100%",
          maxWidth: 360,
          borderRadius: 26,
          border: "1px solid rgba(255, 255, 255, 0.18)",
          background:
            "linear-gradient(180deg, rgba(42, 38, 86, 0.98) 0%, rgba(22, 18, 58, 0.98) 100%)",
          boxShadow:
            "0 22px 56px rgba(0,0,0,0.42), inset 0 1px 0 rgba(255,255,255,0.08)",
          padding: 16,
          color: "#FFFFFF",
        }}
      >
        <span
          aria-hidden="true"
          style={{
            position: "absolute",
            top: -9,
            left: 42,
            width: 18,
            height: 18,
            transform: "rotate(45deg)",
            borderLeft: "1px solid rgba(255,255,255,0.18)",
            borderTop: "1px solid rgba(255,255,255,0.18)",
            background: "rgba(42, 38, 86, 0.98)",
          }}
        />

        <div
          style={{
            position: "relative",
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            marginBottom: 9,
            borderRadius: 999,
            padding: "5px 10px",
            background: "rgba(255, 93, 93, 0.18)",
            color: "#FFD6D6",
            fontSize: 12,
            fontWeight: 900,
            letterSpacing: "-0.02em",
          }}
        >
          중요 공지
        </div>

        <h2
          id="ledger-apology-notice-title"
          style={{
            position: "relative",
            margin: "0 0 9px",
            color: "#FFFFFF",
            fontSize: 19,
            lineHeight: 1.25,
            fontWeight: 900,
            letterSpacing: "-0.04em",
          }}
        >
          거래내역보기 오류 사과문
        </h2>

        <p
          id="ledger-apology-notice-body"
          style={{
            position: "relative",
            margin: 0,
            color: "rgba(255,255,255,0.88)",
            fontSize: 14,
            lineHeight: "22px",
            fontWeight: 700,
            wordBreak: "keep-all",
          }}
        >
          최근 관리자 권한 설정 패치 과정 중에 오류가 발생해, 원장보기가 제대로
          작동하지 않은 사실이 있어 이에 대해 사과드립니다. 기능점검 체크리스트에
          해당항목을 추가해 같은 사고가 일어나지 않도록 노력하겠습니다.
          이용해주셔서 감사하고 불편을 끼쳐드려 죄송합니다.
        </p>

        <button
          type="button"
          onClick={handleHideForever}
          style={{
            position: "relative",
            width: "100%",
            marginTop: 14,
            border: "none",
            borderRadius: 17,
            padding: "12px 14px",
            background: "rgba(255,255,255,0.94)",
            color: "#17142F",
            fontSize: 15,
            fontWeight: 900,
            letterSpacing: "-0.03em",
            cursor: "pointer",
            boxShadow: "0 10px 24px rgba(0,0,0,0.22)",
          }}
        >
          다신 보지않기
        </button>
      </section>
    </div>
  );
}
