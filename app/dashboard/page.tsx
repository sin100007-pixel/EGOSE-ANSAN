import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import ProductToggle from "@/app/components/ProductToggle";
import InstallButton from "@/app/components/InstallButton";
import LondonMarketBanner from "@/app/components/LondonMarketBanner";
import EgoseBannerCarousel from "@/app/components/EgoseBannerCarousel";
import CherryBlossomPetals from "@/app/components/CherryBlossomPetals";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const sessionCookie = cookies().get("session_user");
  if (!sessionCookie) redirect("/");
  const name = decodeURIComponent(sessionCookie.value || "");

  const user = await prisma.user.findFirst({ where: { name } });

  // DB에 회원이 없으면 세션 쿠키 삭제 후 이동
  if (!user) redirect("/api/logout");

  const btnStyle: React.CSSProperties = {
    display: "block",
    width: "100%",
    boxSizing: "border-box",
    padding: 12,
    margin: "0 0 12px 0",
    borderRadius: 12,
    border: "1px solid transparent",
    background: "#f7b6c8",
    color: "#111111",
    fontWeight: 700,
    textAlign: "center",
    cursor: "pointer",
  };

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
        position: "relative",
        overflow: "hidden",
        maxWidth: 1100,
        margin: "0 auto",
        padding: "24px 16px 80px",
        color: "#fff",
        background: "#0F0C2E",
        minHeight: "100vh",
      }}
    >
      {/* 오른쪽 벚꽃 배경 장식 */}
      <div
        style={{
          position: "absolute",
          top: -40,
          right: -10,
          width: "62%",
          maxWidth: 640,
          minWidth: 260,
          height: "100%",
          pointerEvents: "none",
          opacity: 0.94,
          zIndex: 0,
          display: "flex",
          justifyContent: "flex-end",
          alignItems: "flex-start",
        }}
      >
        <img
          src="/cherry-blossom-right.png"
          alt=""
          aria-hidden="true"
          style={{
            display: "block",
            width: "100%",
            height: "auto",
            objectFit: "contain",
            transform: "translateY(30px)",
          }}
        />
      </div>

      {/* 벚꽃잎 흩날림 */}
      <CherryBlossomPetals />

      {/* 실제 내용 */}
      <div style={{ position: "relative", zIndex: 2 }}>
        <header style={{ 
         width: "100%",
         marginBottom: 16,
         transform: "translateX(-50px)",
        }}>
          <LondonMarketBanner />
        </header>

        <EgoseBannerCarousel />

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
          <a href="/ledger" style={{ textDecoration: "none" }}>
            <button type="button" style={btnStyle}>
              거래내역 보기
            </button>
          </a>

          <InstallButton style={btnStyle}>앱 설치</InstallButton>

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

        <form action="/api/logout" method="POST" style={{ marginTop: 4 }}>
          <p style={{ textAlign: "center", margin: 0 }}>
            <button type="submit" style={logoutLinkStyle}>
              로그아웃
            </button>
          </p>
        </form>
      </div>
    </main>
  );
}