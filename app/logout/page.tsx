// app/logout/page.tsx
"use client";

import { useEffect } from "react";
import TopSpacer from "../components/TopSpacer";

export default function LogoutPage() {
  useEffect(() => {
    try {
      // 자동 복구에 쓰이던 로컬 백업 제거
      localStorage.removeItem("session_user");
      // 이번 페이지 로드 동안은 자동복구 비활성화
      sessionStorage.setItem("justLoggedOut", "1");
    } catch {}
    // 홈으로 복귀 (서버 라우팅으로 교체 가능)
    window.location.replace("/");
  }, []);

  return (
    <div
      style={{
        background: "#0F0C2E",
        minHeight: "100vh",
        margin: 0,
        padding: 0, // ⛔️ 상단 패딩 제거: 진행선 + 패딩 합산으로 밀리는 현상 방지
      }}
    >
      {/* ✅ 모든 환경에서 얇은 시스템 진행선 대비 상단 여백만 확보 */}
      <TopSpacer height={8} />

      <p style={{ padding: 16, color: "#fff", fontWeight: 700 }}>로그아웃 중…</p>
    </div>
  );
}