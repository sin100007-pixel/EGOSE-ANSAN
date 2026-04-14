import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import ProductToggle from "@/app/components/ProductToggle";
import InstallButton from "@/app/components/InstallButton";
import LondonMarketBanner from "@/app/components/LondonMarketBanner";
import EgoseBannerCarousel from "@/app/components/EgoseBannerCarousel";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function LedgerIcon() {
  return (
    <svg viewBox="0 0 24 24" width="24" height="24" fill="none" aria-hidden="true">
      <rect x="5" y="3.5" width="14" height="17" rx="2.8" stroke="currentColor" strokeWidth="1.9" />
      <line x1="8" y1="8" x2="16" y2="8" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
      <line x1="8" y1="12" x2="16" y2="12" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
      <line x1="8" y1="16" x2="13" y2="16" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
    </svg>
  );
}

function KakaoTalkLikeIcon() {
  return (
    <svg viewBox="0 0 24 24" width="24" height="24" fill="none" aria-hidden="true">
      <path
        d="M12 4.5c-4.7 0-8.5 3-8.5 6.8 0 2.4 1.5 4.5 3.9 5.7l-.8 3.2 3.5-2.2c.6.1 1.2.2 1.9.2 4.7 0 8.5-3 8.5-6.9S16.7 4.5 12 4.5Z"
        fill="currentColor"
      />
      <text
        x="12"
        y="13.1"
        textAnchor="middle"
        fontSize="4.2"
        fontWeight="800"
        fill="#F5E6A1"
        fontFamily="Arial, sans-serif"
      >
        TALK
      </text>
    </svg>
  );
}

function InstallIcon() {
  return (
    <svg viewBox="0 0 24 24" width="24" height="24" fill="none" aria-hidden="true">
      <path
        d="M12 4v9m0 0 3.5-3.5M12 13 8.5 9.5M5 16.5v1.2A2.3 2.3 0 0 0 7.3 20h9.4a2.3 2.3 0 0 0 2.3-2.3v-1.2"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function BottomItem({
  href,
  label,
  icon,
  target,
  rel,
}: {
  href: string;
  label: string;
  icon: React.ReactNode;
  target?: string;
  rel?: string;
}) {
  return (
    <a
      href={href}
      target={target}
      rel={rel}
      style={{
        textDecoration: "none",
        color: "#1B1B1B",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 6,
        minHeight: 74,
        borderRadius: 18,
        padding: "10px 6px",
        boxSizing: "border-box",
      }}
    >
      <div
        style={{
          width: 28,
          height: 28,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#2A2A2A",
        }}
      >
        {icon}
      </div>
      <div
        style={{
          fontSize: 12,
          fontWeight: 800,
          lineHeight: 1.1,
          letterSpacing: "-0.02em",
          textAlign: "center",
          whiteSpace: "nowrap",
        }}
      >
        {label}
      </div>
    </a>
  );
}

export default async function DashboardPage() {
  const sessionCookie = cookies().get("session_user");
  if (!sessionCookie) redirect("/");
  const name = decodeURIComponent(sessionCookie.value || "");

  const user = await prisma.user.findFirst({
    where: { name },
    select: { qrUrl: true },
  });

  if (!user) redirect("/api/logout");

  const COLORS = {
    bgTop: "#0F0C2E",
    bgBottom: "#07061B",
    panel: "rgba(21, 18, 58, 0.96)",
    line: "rgba(255,255,255,0.10)",
    lineStrong: "rgba(255,255,255,0.14)",
    cream: "#F5F1E8",
    creamStrong: "#EEDFC6",
    creamBorder: "#E6D7BD",
    textSoft: "rgba(255,255,255,0.58)",
    white: "#FFFFFF",
    badge: "#FF6E86",
  };

  const panelStyle: React.CSSProperties = {
    borderRadius: 28,
    border: `1px solid ${COLORS.line}`,
    background: COLORS.panel,
    boxShadow:
      "0 18px 50px rgba(0,0,0,0.28), inset 0 1px 0 rgba(255,255,255,0.03)",
    backdropFilter: "blur(8px)",
  };

  const footerTextStyle: React.CSSProperties = {
    fontSize: 12,
    lineHeight: "18px",
    color: COLORS.textSoft,
    textAlign: "center",
  };

  const logoutLinkStyle: React.CSSProperties = {
    ...footerTextStyle,
    textDecoration: "underline",
    background: "none",
    border: "none",
    padding: 0,
    marginTop: 10,
    cursor: "pointer",
  };

  return (
    <main
      style={{
        position: "relative",
        overflow: "hidden",
        minHeight: "100vh",
        background: `
          radial-gradient(circle at 18% 0%, rgba(78,64,169,0.30), transparent 30%),
          radial-gradient(circle at 85% 18%, rgba(42,73,166,0.22), transparent 28%),
          linear-gradient(180deg, ${COLORS.bgTop} 0%, ${COLORS.bgBottom} 100%)
        `,
      }}
    >
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          inset: 0,
          pointerEvents: "none",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: -90,
            right: -70,
            width: 240,
            height: 240,
            borderRadius: "50%",
            background: "rgba(255,255,255,0.05)",
            filter: "blur(34px)",
          }}
        />
        <div
          style={{
            position: "absolute",
            top: 260,
            left: -80,
            width: 200,
            height: 200,
            borderRadius: "50%",
            background: "rgba(234,217,188,0.08)",
            filter: "blur(40px)",
          }}
        />
      </div>

      <div
        style={{
          position: "relative",
          zIndex: 1,
          maxWidth: 460,
          margin: "0 auto",
          padding: "2px 16px 176px",
        }}
      >
        <header
          style={{
            display: "flex",
            justifyContent: "center",
            marginBottom: 4,
            marginTop: -10,
          }}
        >
          <LondonMarketBanner />
        </header>

        <div
          style={{
            ...panelStyle,
            padding: 4,
            marginBottom: 8,
          }}
        >
          <div
            style={{
              borderRadius: 16,
              overflow: "hidden",
              background: "rgba(255,255,255,0.03)",
            }}
          >
            <EgoseBannerCarousel />
          </div>
        </div>

        <section
          style={{
            ...panelStyle,
            padding: 12,
            marginBottom: 18,
          }}
        >
          <div style={{ marginBottom: 8 }}>
            <h1
              style={{
                margin: 0,
                color: COLORS.white,
                fontSize: 22,
                fontWeight: 900,
                lineHeight: 1.1,
                letterSpacing: "-0.03em",
              }}
            >
              {name}님의 QR
            </h1>
          </div>

          <div
            style={{
              borderRadius: 20,
              padding: 8,
              background:
                "linear-gradient(180deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.04) 100%)",
              border: `1px solid ${COLORS.lineStrong}`,
              boxShadow: "inset 0 1px 0 rgba(255,255,255,0.04)",
            }}
          >
            <div
              style={{
                maxWidth: 238,
                margin: "0 auto",
                borderRadius: 16,
                overflow: "hidden",
                background: "#FFFFFF",
                boxShadow: "0 12px 28px rgba(0,0,0,0.18)",
              }}
            >
              <img
                src={user.qrUrl}
                alt="QR"
                style={{
                  display: "block",
                  width: "100%",
                  height: "auto",
                }}
              />
            </div>
          </div>
        </section>

        <footer
          style={{
            ...panelStyle,
            padding: "16px 14px",
            background: "rgba(255,255,255,0.03)",
          }}
        >
          <div style={footerTextStyle}>
            <div style={{ color: "rgba(255,255,255,0.82)", marginBottom: 4 }}>
              이고세(주)
            </div>
            <div>경기도 안산시 상록구 안산천서로 237</div>
            <div>Tel. 031-486-6882</div>
          </div>

          <form action="/api/logout" method="POST" style={{ marginTop: 2 }}>
            <p style={{ textAlign: "center", margin: 0 }}>
              <button type="submit" style={logoutLinkStyle}>
                로그아웃
              </button>
            </p>
          </form>
        </footer>
      </div>

      <div
        style={{
          position: "fixed",
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 40,
          pointerEvents: "none",
        }}
      >
        <div
          style={{
            maxWidth: 460,
            margin: "0 auto",
            padding: "0 10px calc(0px + env(safe-area-inset-bottom))",
            pointerEvents: "auto",
          }}
        >
          <div
            style={{
              position: "relative",
              background: COLORS.cream,
              borderRadius: "28px 28px 0 0",
              border: "1px solid rgba(0,0,0,0.06)",
              boxShadow: "0 -10px 28px rgba(0,0,0,0.24)",
              padding: "14px 8px calc(12px + env(safe-area-inset-bottom))",
              overflow: "visible",
            }}
          >
            <a
              href="/product-test"
              aria-label="필름봇 페이지로 이동"
              style={{
                position: "absolute",
                left: "50%",
                top: -34,
                transform: "translateX(-50%)",
                width: 86,
                height: 86,
                borderRadius: "50%",
                background: COLORS.creamStrong,
                border: "4px solid #FFFFFF",
                boxShadow: "0 12px 24px rgba(0,0,0,0.20)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                textDecoration: "none",
                zIndex: 3,
              }}
            >
              <div
                style={{
                  position: "absolute",
                  top: -2,
                  right: -2,
                  padding: "4px 8px",
                  borderRadius: 999,
                  background: COLORS.badge,
                  color: "#fff",
                  fontSize: 10,
                  fontWeight: 900,
                  lineHeight: 1,
                  letterSpacing: "0.04em",
                  border: "2px solid #fff",
                }}
              >
                NEW
              </div>

              <img
                src="/filmbot-button.png"
                alt="필름봇"
                style={{
                  display: "block",
                  width: 46,
                  height: "auto",
                  objectFit: "contain",
                }}
              />
            </a>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr 92px 1fr 1fr",
                gap: 2,
                alignItems: "end",
              }}
            >
              <BottomItem href="/ledger" label="거래내역" icon={<LedgerIcon />} />

              <BottomItem
                href="http://pf.kakao.com/_IxgdJj/chat"
                target="_blank"
                rel="noreferrer"
                label="문의"
                icon={<KakaoTalkLikeIcon />}
              />

              <div aria-hidden="true" style={{ height: 1 }} />

              <ProductToggle bottomNav />

              <InstallButton
                style={{
                  width: "100%",
                  minHeight: 74,
                  borderRadius: 18,
                  border: "none",
                  background: "transparent",
                  color: "#1B1B1B",
                  boxShadow: "none",
                  padding: "10px 6px",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 6,
                  fontWeight: 800,
                  fontSize: 12,
                  lineHeight: 1.1,
                  letterSpacing: "-0.02em",
                  textAlign: "center",
                }}
              >
                <span
                  style={{
                    width: 28,
                    height: 28,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#2A2A2A",
                  }}
                >
                  <InstallIcon />
                </span>
                앱 설치
              </InstallButton>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}