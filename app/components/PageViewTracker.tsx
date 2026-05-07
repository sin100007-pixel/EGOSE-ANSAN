"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

/**
 * 페이지가 열릴 때마다 /api/pageview 로 현재 경로를 전송하는 컴포넌트.
 * App Router 라우팅으로 페이지 이동할 때도 자동으로 감지.
 *
 * 실제 접속 URL에는 PWA/브라우저 캐시 리셋용 query가 붙을 수 있지만,
 * 관리자 방문 로그에는 pathname만 저장해서 통계가 지저분해지지 않게 합니다.
 */
export default function PageViewTracker() {
  const pathname = usePathname();
  const lastPathRef = useRef<string | null>(null);

  useEffect(() => {
    if (!pathname) return;

    const cleanPath = pathname || "/";

    // 같은 경로로 연속 호출 방지
    if (lastPathRef.current === cleanPath) return;
    lastPathRef.current = cleanPath;

    fetch("/api/pageview", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path: cleanPath }),
    }).catch(() => {
      // 실패해도 화면은 그대로 동작해야 하므로 무시
    });
  }, [pathname]);

  return null;
}
