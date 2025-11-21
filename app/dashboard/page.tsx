// app/dashboard/page.tsx
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import ProductToggle from "@/app/components/ProductToggle";
import InstallButton from "@/app/components/InstallButton";
import LondonMarketBanner from "@/app/components/LondonMarketBanner";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const sessionCookie = cookies().get("session_user");
  if (!sessionCookie) redirect("/");
  const name = decodeURIComponent(sessionCookie.value || "");

  const user = await prisma.user.findFirst({ where: { name } });
  if (!user) redirect("/");

  // 공통 버튼 스타일 (ledger/설치/카카오)
  const btnStyle: React.CSSProperties = {
    display: "block",
    width: "100%",
    boxSizing: "border-box",
    padding: 12,
    margin: "0 0 12px 0",
    borderRadius: 12,
    border: "1px solid transparent",
    background: "#1739f7",
    color: "#ffffff",
    fontWeight: 700,
    textAlign: "center",
    cursor: "pointer",
  };

  // 푸터(회사정보)와 동일 톤/크기의 링크형 로그아웃 스타일
  const footerTextStyle: React.CSSProperties = {
    fontSize: 12,
    lineHeight: "18px",
    color: "rgba(255,255,255,0.6)",
    textAlign: "center",
  };
  const logoutLinkStyle: React.CSSProperties = {
    ...footerTextStyle,
    textDecoration: "underline",
    background: "none",
    border: "none",
    padding: 0,
    marginTop: 8,
    cursor: "pointer",
  };

  return (
    <main
      style={{
        maxWidth: 1100,
        margin: "0 auto",
        padding: "24px 16px 80px",
        color: "#fff",
        background: "#0F0C2E",
        minHeight: "100vh",
      }}
    >
      <header style={{ width: "100%", marginBottom: 16 }}>
        {/* LONDON MARKET 이미지 10번 클릭 시 /admin/dashboard 로 이동 */}
        <LondonMarketBanner />
      </header>

      <h1 style={{ fontSize: 28, fontWeight: 800, marginBottom: 16 }}>
        {name}님의 QR
      </h1>

      <div
        style={{
          display: "flex",
          gap: 24,
          alignItems: "flex-start",
          flexWrap: "wrap",
        }}
      >
        <div
          style={{
            width: 260,
            borderRadius: 12,
            overflow: "hidden",
            background: "#111",
          }}
        >
          <img
            src={user.qrUrl}
            alt="QR"
            style={{ display: "block", width: "100%", height: "auto" }}
          />
        </div>
        <div style={{ alignSelf: "center" }}>
          <p style={{ opacity: 0.9, marginTop: 8 }}>
            전화번호 뒷자리: {user.phoneLast4}
          </p>
        </div>
      </div>

      <section style={{ marginTop: 24 }}>
        {/* /ledger 이동 버튼 */}
        <a href="/ledger" style={{ textDecoration: "none" }}>
          <button type="button" style={btnStyle}>
            거래내역 보기
          </button>
        </a>

        {/* 앱 설치 버튼 (PWA 설치 가능 시에만 보임) */}
        <InstallButton style={btnStyle}>앱 설치</InstallButton>

        {/* 카카오 채팅문의 */}
        <a
          href="http://pf.kakao.com/_IxgdJj/chat"
          target="_blank"
          rel="noreferrer"
          style={{ textDecoration: "none" }}
        >
          <button type="button" style={btnStyle}>
            카카오 채팅문의
          </button>
        </a>

        <ProductToggle />
      </section>

      {/* 회사 정보 푸터 */}
      <div
        style={{
          marginTop: 24,
          paddingTop: 8,
          borderTop: "1px solid rgba(255,255,255,0.08)",
          ...footerTextStyle,
        }}
      >
        <div>이고세(주)</div>
        <div>경기도 안산시 상록구 안산천서로 237</div>
        <div>Tel. 031-486-6882</div>
      </div>

      {/* 푸터 아래 링크형 로그아웃 */}
      <form action="/api/logout" method="POST" style={{ marginTop: 4 }}>
        <p style={{ textAlign: "center", margin: 0 }}>
          <button type="submit" style={logoutLinkStyle}>
            로그아웃
          </button>
        </p>
      </form>
    </main>
  );
}
