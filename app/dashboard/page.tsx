// app/dashboard/page.tsx
import Image from "next/image";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import ProductToggle from "@/app/components/ProductToggle";
import InstallButton from "@/app/components/InstallButton";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const sessionCookie = cookies().get("session_user");
  if (!sessionCookie) redirect("/");
  const name = decodeURIComponent(sessionCookie.value || "");

  const user = await prisma.user.findFirst({ where: { name } });
  if (!user) redirect("/");

  // 공통 버튼 스타일 (로그아웃/ledger/설치/카카오 동일)
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
        <div
          style={{
            position: "relative",
            width: "100%",
            aspectRatio: "7 / 3",
            borderRadius: 12,
            overflow: "hidden",
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
      </header>

      <h1 style={{ fontSize: 28, fontWeight: 800, marginBottom: 16 }}>{name}님의 QR</h1>

      <div style={{ display: "flex", gap: 24, alignItems: "flex-start", flexWrap: "wrap" }}>
        <div style={{ width: 260, borderRadius: 12, overflow: "hidden", background: "#111" }}>
          <img src={user.qrUrl} alt="QR" style={{ display: "block", width: "100%", height: "auto" }} />
        </div>
        <div style={{ alignSelf: "center" }}>
          <p style={{ opacity: 0.9, marginTop: 8 }}>전화번호 뒷자리: {user.phoneLast4}</p>
        </div>
      </div>

      <section style={{ marginTop: 24 }}>
        {/* 로그아웃 */}
        <form action="/api/logout" method="POST">
          <button type="submit" style={btnStyle}>
            로그아웃
          </button>
        </form>

        {/* ✅ /ledger 이동 버튼 — 로그아웃 바로 아래, 동일 스타일 */}
        <a href="/ledger" style={{ textDecoration: "none" }}>
          <button type="button" style={btnStyle}>
            거래내역 보기(공사중)
          </button>
        </a>

        {/* 앱 설치 버튼 (PWA 설치 가능 시에만 보임) */}
        <InstallButton style={btnStyle}>앱 설치</InstallButton>

        {/* 카카오 채팅문의 */}
        <a href="http://pf.kakao.com/_IxgdJj/chat" target="_blank" rel="noreferrer" style={{ textDecoration: "none" }}>
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
          fontSize: 12,
          lineHeight: "18px",
          color: "rgba(255,255,255,0.6)",
          textAlign: "center",
        }}
      >
        <div>이고세(주)</div>
        <div>경기도 안산시 상록구 안산천서로 237</div>
        <div>Tel. 031-486-6882</div>
      </div>
    </main>
  );
}
