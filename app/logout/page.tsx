// app/logout/page.tsx
"use client";

import { useEffect } from "react";

export default function LogoutPage() {
  useEffect(() => {
    try {
      localStorage.removeItem("session_user");
      sessionStorage.setItem("justLoggedOut", "1");
    } catch {}
    // 홈으로 완전 새로고침 이동 (클라이언트 내비게이션 대신)
    window.location.replace("/");
  }, []);

  // ✅ 아무것도 렌더하지 않음 → 상단 진행선과 겹침/여백 문제 원천 차단
  return null;
}
