// app/components/SessionHydrator.tsx
"use client";

import { useEffect } from "react";

/**
 * 앱 시작 시 기존 session_user 쿠키가 남아 있는 사용자를
 * 새 egose_session / egose_refresh 방식으로 조용히 승계한다.
 *
 * 주의:
 * HttpOnly 쿠키는 document.cookie로 읽을 수 없으므로
 * 클라이언트에서 쿠키 존재 여부를 판단하지 않고 서버 API에 맡긴다.
 */
export default function SessionHydrator() {
  useEffect(() => {
    if (typeof window === "undefined") return;

    const pathname = window.location.pathname;

    // 로그아웃 페이지에서는 자동 승계 금지
    if (pathname === "/logout") return;

    // 고객 공유링크에서는 굳이 승계 시도하지 않음
    if (pathname.startsWith("/simulator/share")) return;

    // 방금 로그아웃했다면 1회 승계 차단
    try {
      const justLoggedOut = sessionStorage.getItem("justLoggedOut");
      if (justLoggedOut === "1") {
        sessionStorage.removeItem("justLoggedOut");
        return;
      }
    } catch {}

    let cancelled = false;

    async function migrateLegacySession() {
      try {
        const res = await fetch("/api/auth/migrate-legacy", {
          method: "POST",
          credentials: "include",
          cache: "no-store",
        });

        const body = await res.json().catch(() => null);

        if (cancelled) return;

        // 홈 화면에서 기존 자동로그인이 승계되면 대시보드로 이동
        if (res.ok && body?.migrated === true && pathname === "/") {
          window.location.replace("/dashboard");
        }
      } catch {
        // 네트워크 오류는 조용히 무시
      }
    }

    migrateLegacySession();

    return () => {
      cancelled = true;
    };
  }, []);

  return null;
}