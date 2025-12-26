// app/components/LondonMarketBanner.tsx
"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function LondonMarketBanner() {
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
