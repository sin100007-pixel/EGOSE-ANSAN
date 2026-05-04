// app/components/SessionHydrator.tsx
"use client";

import { useEffect } from "react";

let lastHydratorRunKey: string | null = null;

function getSafeNextPath() {
  try {
    const params = new URLSearchParams(window.location.search);
    const next = params.get("next");

    if (!next) return "/dashboard";
    if (!next.startsWith("/")) return "/dashboard";
    if (next.startsWith("//")) return "/dashboard";

    return next;
  } catch {
    return "/dashboard";
  }
}

function shouldSkipAuthHydrator() {
  if (typeof window === "undefined") return true;

  const pathname = window.location.pathname;

  if (pathname === "/logout") return true;
  if (pathname.startsWith("/simulator/share")) return true;

  return false;
}

function shouldRedirectAfterAuth() {
  if (typeof window === "undefined") return false;

  const pathname = window.location.pathname;

  // 로그인 화면에서는 자동 로그인/승계 성공 후 대시보드 또는 next로 이동
  if (pathname === "/") return true;

  // middleware가 /?next=/dashboard 로 보낸 경우
  if (window.location.search.includes("next=")) return true;

  return false;
}

function redirectAfterAuth() {
  const nextPath = getSafeNextPath();

  window.setTimeout(() => {
    window.location.replace(nextPath);
  }, 80);
}

function getHydratorRunKey() {
  if (typeof window === "undefined") return "";
  return `${window.location.pathname}${window.location.search}`;
}

export default function SessionHydrator() {
  useEffect(() => {
    if (shouldSkipAuthHydrator()) return;

    try {
      const justLoggedOut = sessionStorage.getItem("justLoggedOut");
      if (justLoggedOut === "1") {
        sessionStorage.removeItem("justLoggedOut");
        return;
      }
    } catch {}

    // 개발환경 React StrictMode 중복 실행은 막되,
    // /dashboard -> /?next=/dashboard 처럼 주소가 바뀌면 반드시 다시 실행되게 한다.
    const runKey = getHydratorRunKey();
    if (lastHydratorRunKey === runKey) return;
    lastHydratorRunKey = runKey;

    async function refreshOrMigrateSession() {
      try {
        // 1) egose_refresh가 있으면 egose_session 자동 재발급 시도
        const refreshRes = await fetch("/api/auth/refresh", {
          method: "POST",
          credentials: "include",
          cache: "no-store",
        });

        const refreshBody = await refreshRes.json().catch(() => null);

        if (
          refreshRes.ok &&
          (refreshBody?.refreshed === true ||
            refreshBody?.reason === "ACCESS_STILL_VALID")
        ) {
          if (shouldRedirectAfterAuth()) {
            redirectAfterAuth();
          }

          return;
        }

        // 2) refresh가 없으면 기존 session_user 승계 시도
        const migrateRes = await fetch("/api/auth/migrate-legacy", {
          method: "POST",
          credentials: "include",
          cache: "no-store",
        });

        const migrateBody = await migrateRes.json().catch(() => null);

        if (migrateRes.ok && migrateBody?.migrated === true) {
          if (shouldRedirectAfterAuth()) {
            redirectAfterAuth();
          }

          return;
        }
      } catch {
        // 네트워크 오류는 조용히 무시
      }
    }

    refreshOrMigrateSession();
  }, []);

  return null;
}
