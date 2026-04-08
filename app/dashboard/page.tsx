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

      <CherryBlossomPetals />

      <div style={{ position: "relative", zIndex: 2 }}>
        <header
          style={{
            width: "100%",
            marginBottom: 16,
            transform: "translateX(-50px)",
          }}
        >
          <LondonMarketBanner />
        </header>

        <EgoseBannerCarousel />

        <h1 style={{ fontSize: 28, fontWeight: 800, marginBottom: 16 }}>
          {name}님의 QR
        </h1>

        {/* QR + 필름봇 버튼 */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(0, 1fr) 124px",
            gap: 14,
            alignItems: "center",
            width: "100%",
            maxWidth: 390,
          }}
        >
          <div
            style={{
              width: "100%",
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

          <a
            href="/product-test"
            aria-label="필름봇 페이지로 이동"
            style={{
              display: "block",
              width: "100%",
              textDecoration: "none",
            }}
          >
            <div
              style={{
                position: "relative",
                width: "100%",
                aspectRatio: "1 / 1",
                background: "#f7b6c8",
                borderRadius: 24,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxSizing: "border-box",
                padding: 10,
                boxShadow: "0 8px 20px rgba(0,0,0,0.18)",
                overflow: "visible",
              }}
            >
              <div
                style={{
                  position: "absolute",
                  top: -8,
                  right: -8,
                  padding: "4px 8px",
                  borderRadius: 999,
                  background: "#ff5f7a",
                  color: "#ffffff",
                  fontSize: 11,
                  fontWeight: 800,
                  lineHeight: 1,
                  letterSpacing: "0.04em",
                  boxShadow: "0 6px 14px rgba(0,0,0,0.22)",
                  border: "2px solid #ffffff",
                }}
              >
                NEW
              </div>

              <img
                src="/filmbot-button.png"
                alt="필름봇"
                style={{
                  display: "block",
                  width: "240%",
                  maxWidth: 180,
                  height: "auto",
                  objectFit: "contain",
                }}
              />
            </div>
          </a>
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