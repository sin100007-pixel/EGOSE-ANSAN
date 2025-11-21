"use client";

import { useEffect, useRef } from "react";
import { usePathname, useSearchParams } from "next/navigation";

/**
 * 페이지가 열릴 때마다 /api/pageview 로 현재 경로를 전송하는 컴포넌트.
 * App Router 라우팅으로 페이지 이동할 때도 자동으로 감지.
 */
export default function PageViewTracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const lastPathRef = useRef<string | null>(null);

  useEffect(() => {
    if (!pathname) return;

    const search = searchParams?.toString();
    const fullPath = search ? `${pathname}?${search}` : pathname;

    // 같은 경로로 연속 호출 방지
    if (lastPathRef.current === fullPath) return;
    lastPathRef.current = fullPath;

    fetch("/api/pageview", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path: fullPath }),
    }).catch(() => {
      // 실패해도 화면은 그대로 동작해야 하므로 무시
    });
  }, [pathname, searchParams]);

  return null;
}
