import type { CSSProperties } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import BottomQuickNav from "@/app/components/BottomQuickNav";
import LondonMarketBanner from "@/app/components/LondonMarketBanner";
import EgoseBannerCarousel from "@/app/components/EgoseBannerCarousel";
import DashboardPriceNotice from "@/app/components/DashboardPriceNotice";
import { getCurrentEgoseUser } from "@/lib/server-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type IconOnlyShortcutProps = {
  href: string;
  imageSrc: string;
  label: string;
  minHeight?: number;
  radius?: number;
  imageScale?: string;
  imageMaxWidth?: number;
  padding?: number;
  showNewBadge?: boolean;
};

function IconOnlyShortcut({
  href,
  imageSrc,
  label,
  minHeight = 132,
  radius = 24,
  imageScale = "160%",
  imageMaxWidth = 210,
  padding = 8,
  showNewBadge = false,
}: IconOnlyShortcutProps) {
  return (
    <Link
      href={href as any}
      aria-label={label}
      title={label}
      prefetch={true}
      style={{
        position: "relative",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        minHeight,
        borderRadius: radius,
        textDecoration: "none",
        background:
          "linear-gradient(180deg, rgba(255,250,235,0.98) 0%, rgba(241,224,188,0.94) 100%)",
        border: "1px solid rgba(122,92,45,0.22)",
        boxShadow:
          "0 10px 24px rgba(0,0,0,0.18), inset 0 1px 0 rgba(255,255,255,0.55)",
        padding,
        overflow: "visible",
        isolation: "isolate",
      }}
    >
      {showNewBadge ? (
        <span
          aria-hidden="true"
          style={{
            position: "absolute",
            top: 6,
            right: -14,
            zIndex: 4,
            padding: "4px 9px",
            borderRadius: 999,
            background: "#FF6E86",
            color: "#FFFFFF",
            fontSize: 11,
            fontWeight: 900,
            lineHeight: 1,
            letterSpacing: "-0.02em",
            border: "2px solid #FFFFFF",
            boxShadow: "0 5px 12px rgba(0,0,0,0.20)",
            transform: "rotate(15deg)",
            transformOrigin: "center",
            whiteSpace: "nowrap",
            pointerEvents: "none",
          }}
        >
          새롭다!
        </span>
      ) : null}

      <img
        src={imageSrc}
        alt={label}
        style={{
          position: "relative",
          zIndex: 2,
          display: "block",
          width: imageScale,
          maxWidth: imageMaxWidth,
          height: "auto",
          objectFit: "contain",
          filter: "drop-shadow(0 6px 10px rgba(0,0,0,0.18))",
          pointerEvents: "none",
        }}
      />
    </Link>
  );
}

export default async function DashboardPage() {
  const user = await getCurrentEgoseUser();

  if (!user) redirect("/");

  const name = user.name;
  const canUseSimulator = user.canUseSimulator;

  const COLORS = {
    bgTop: "#0F0C2E",
    bgBottom: "#07061B",
    panel: "rgba(21, 18, 58, 0.96)",
    line: "rgba(255,255,255,0.10)",
    lineStrong: "rgba(255,255,255,0.14)",
    textSoft: "rgba(255,255,255,0.58)",
    white: "#FFFFFF",
  };

  const panelStyle: CSSProperties = {
    borderRadius: 28,
    border: `1px solid ${COLORS.line}`,
    background: COLORS.panel,
    boxShadow:
      "0 18px 50px rgba(0,0,0,0.28), inset 0 1px 0 rgba(255,255,255,0.03)",
    backdropFilter: "blur(8px)",
  };

  const qrBubbleStyle: CSSProperties = {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 20,
    padding: 6,
    background:
      "linear-gradient(180deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.04) 100%)",
    border: `1px solid ${COLORS.lineStrong}`,
    boxShadow: "inset 0 1px 0 rgba(255,255,255,0.04)",
  };

  const simbotBubbleStyle: CSSProperties = {
    position: "relative",
    display: "grid",
    gridTemplateRows: "1fr 1fr",
    gap: 8,
    borderRadius: 22,
    padding: 6,
    background:
      "linear-gradient(180deg, rgba(255,250,235,0.98) 0%, rgba(242,225,190,0.94) 100%)",
    border: "1px solid rgba(122,92,45,0.24)",
    boxShadow:
      "0 12px 26px rgba(0,0,0,0.18), inset 0 1px 0 rgba(255,255,255,0.62)",
    overflow: "visible",
  };

  const footerTextStyle: CSSProperties = {
    fontSize: 12,
    lineHeight: "18px",
    color: COLORS.textSoft,
    textAlign: "center",
  };

  const footerButtonStyle: CSSProperties = {
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
          padding: "2px 16px 210px",
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

        <section
          id="user-qr-card"
          style={{
            ...panelStyle,
            padding: 12,
            marginBottom: 14,
            overflow: "visible",
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

          {canUseSimulator ? (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "minmax(0, 1fr) 85px",
                gap: 8,
                alignItems: "stretch",
                overflow: "visible",
              }}
            >
              <div style={qrBubbleStyle}>
                <div
                  style={{
                    width: "100%",
                    maxWidth: 260,
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

              <div style={simbotBubbleStyle}>
                <IconOnlyShortcut
                  href="/simulator"
                  imageSrc="/simulator-buttons/simubot.png"
                  label="시뮬봇"
                  minHeight={85}
                  radius={18}
                  imageScale="184%"
                  imageMaxWidth={170}
                  padding={3}
                  showNewBadge
                />

                <IconOnlyShortcut
                  href="/simulator/links/new"
                  imageSrc="/simulator-buttons/simubot-admin.png"
                  label="시뮬봇 관리페이지"
                  minHeight={85}
                  radius={18}
                  imageScale="184%"
                  imageMaxWidth={170}
                  padding={3}
                  showNewBadge
                />
              </div>
            </div>
          ) : (
            <div style={qrBubbleStyle}>
              <div
                style={{
                  maxWidth: 240,
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
          )}

          <div style={{ marginTop: 10 }}>
            <Link
              href="/app-video-guide"
              prefetch={true}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                width: "100%",
                minHeight: 62,
                padding: "10px 14px",
                borderRadius: 20,
                textDecoration: "none",
                background:
                  "linear-gradient(180deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.04) 100%)",
                border: `1px solid ${COLORS.lineStrong}`,
                boxShadow: "inset 0 1px 0 rgba(255,255,255,0.04)",
                boxSizing: "border-box",
              }}
            >
              <span
                style={{
                  flex: "0 0 auto",
                  width: 42,
                  height: 42,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  borderRadius: "50%",
                  background: "rgba(255,255,255,0.08)",
                  boxShadow: "0 8px 18px rgba(0,0,0,0.16)",
                }}
              >
                <img
                  src="/dashboard-video-guide-icon.png"
                  alt="동영상 설명"
                  style={{
                    display: "block",
                    width: 34,
                    height: 34,
                    objectFit: "contain",
                  }}
                />
              </span>

              <div style={{ minWidth: 0 }}>
                <div
                  style={{
                    color: COLORS.white,
                    fontSize: 17,
                    lineHeight: 1.15,
                    fontWeight: 900,
                    letterSpacing: "-0.03em",
                  }}
                >
                  동영상 설명
                </div>
                <div
                  style={{
                    marginTop: 3,
                    color: COLORS.textSoft,
                    fontSize: 12,
                    lineHeight: 1.35,
                    letterSpacing: "-0.02em",
                  }}
                >
                  앱 기능 사용법을 영상으로 확인해보세요.
                </div>
              </div>
            </Link>
          </div>
        </section>

        <div style={{ margin: "0 0 12px" }}>
          <div style={{ overflow: "hidden" }}>
            <EgoseBannerCarousel />
          </div>
        </div>

        <footer
          style={{
            marginTop: 8,
            padding: "4px 10px 0",
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
              <button type="submit" style={footerButtonStyle}>
                로그아웃
              </button>
            </p>
          </form>
        </footer>
      </div>

      <DashboardPriceNotice />
      <BottomQuickNav current="dashboard" />
    </main>
  );
}
