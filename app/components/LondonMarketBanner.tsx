// app/components/LondonMarketBanner.tsx
"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState } from "react";

type Props = {
  /** ✅ 태양이 다 뜬 뒤(5초)에 감사 문구를 보여줄지 */
  showThanksMessage?: boolean;
};

export default function LondonMarketBanner({ showThanksMessage = false }: Props) {
  const router = useRouter();
  const [clickCount, setClickCount] = useState(0);

  const handleClick = () => {
    setClickCount((prev) => {
      const next = prev + 1;

      // 10번 클릭되면 /admin/dashboard 로 이동
      if (next >= 10) {
        router.push("/admin/dashboard");
        return 0; // 이동 후 카운트 리셋
      }

      return next;
    });
  };

  return (
    <div
      onClick={handleClick}
      style={{
        position: "relative",
        width: "100%",
        aspectRatio: "16 / 9",
        borderRadius: 12,
        overflow: "hidden",
        cursor: "pointer",

        // ✅ 모바일에서 파란 클릭 하이라이트 제거
        WebkitTapHighlightColor: "transparent",
        userSelect: "none",
      }}
    >
      {/* 🌅 해(뒤) */}
      <div className="sun-half-rise" aria-hidden="true" />

      {/* ✅ 감사 문구(태양 다 뜬 뒤 등장) */}
      {showThanksMessage && (
        <div className="thanks-message" aria-hidden="true">
          <div>2025년 노고에 감사드립니다.</div>
          <div>2026년도 최선을 다하겠습니다.</div>
        </div>
      )}

      {/* 🏷️ 로고(앞) - 기존 스타일 유지(objectFit: cover) */}
      <Image
        src="/london-market-hero.png"
        alt="LONDON MARKET"
        fill
        priority
        sizes="100vw"
        style={{ objectFit: "cover", zIndex: 2 }}
      />

      <style jsx>{`
        .sun-half-rise {
          position: absolute;
          left: 50%;
          bottom: -20%;
          width: 260px;
          height: 260px;
          border-radius: 50%;
          background: radial-gradient(
            circle,
            rgba(255, 170, 110, 1) 0%,
            rgba(255, 120, 85, 0.95) 26%,
            rgba(255, 90, 70, 0.75) 46%,
            rgba(255, 90, 70, 0.38) 62%,
            rgba(255, 90, 70, 0.16) 72%,
            rgba(255, 90, 70, 0) 80%
          );
          filter: blur(0.6px);

          /* ✅ 시작: 윗부분만 살짝 보이게 */
          transform: translateX(-50%) translateY(210px) scale(0.93);

          /* ✅ 총 5초: 0~1초(20%) 정지 -> 이후 서서히 상승 */
          animation: sunHalfRise 5s ease-out forwards;
          z-index: 1;
        }

        @keyframes sunHalfRise {
          0%,
          20% {
            transform: translateX(-50%) translateY(210px) scale(0.93);
          }
          100% {
            transform: translateX(-50%) translateY(0) scale(1);
          }
        }

        /* ✅ 문구: bottom 기준 고정 (폴드 접힘/일반폰에서 겹침 방지 + 더 아래로) */
        .thanks-message {
          position: absolute;
          left: 46%;

          /* 🔥 여기만 조절하면 내려갑니다 (값이 작아질수록 더 아래로)
             기존: bottom: clamp(0px, 0%, 92px);
             변경: 음수 허용해서 "조금 더" 아래로 고정
          */
          bottom: clamp(-18px, -2%, 60px);

          transform: translateX(-50%);
          text-align: center;

          color: #f2e6c9; /* 아이보리 */
          font-weight: 800;
          line-height: 1.35;
          letter-spacing: 0.01em;

          width: min(92%, 420px);
          padding: 6px 10px;

          opacity: 0;
          filter: drop-shadow(0 1px 0 rgba(0, 0, 0, 0.15));

          animation: thanksIn 800ms ease forwards;
          animation-delay: 5s;

          z-index: 3;
          pointer-events: none;
        }

        .thanks-message div {
          font-size: clamp(11px, 2.8vw, 14px);
        }

        @keyframes thanksIn {
          from {
            opacity: 0;
            transform: translateX(-50%) translateY(6px);
          }
          to {
            opacity: 1;
            transform: translateX(-50%) translateY(0);
          }
        }

        /* ✅ (2) 아주 작은 화면(폴드 접힘 포함)에서만 추가로 더 내려줌 */
        @media (max-width: 380px) {
          .thanks-message {
            /* 기존: bottom: clamp(22px, 8%, 48px); */
            bottom: clamp(-26px, -4%, 36px);
          }
          .thanks-message div {
            font-size: 11px;
          }
        }

        @media (max-width: 480px) {
          .sun-half-rise {
            width: 200px;
            height: 200px;
            bottom: -56%;
            transform: translateX(-50%) translateY(190px) scale(0.95);
          }
        }
      `}</style>
    </div>
  );
}
