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
        return 0; // 이동 후 다시 0으로 리셋 (원하면 유지해도 됨)
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
        aspectRatio: "7 / 3",
        borderRadius: 12,
        overflow: "hidden",
        cursor: "pointer", // 살짝만 힌트
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
  );
}
