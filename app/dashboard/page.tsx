import { redirect } from "next/navigation";
import BottomQuickNav from "@/app/components/BottomQuickNav";
import LondonMarketBanner from "@/app/components/LondonMarketBanner";
import EgoseBannerCarousel from "@/app/components/EgoseBannerCarousel";
import { isSimulatorAllowedUser } from "@/app/simulator/auth";
import { getCurrentEgoseUser } from "@/lib/server-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const user = await getCurrentEgoseUser();

  if (!user) redirect("/");

  const name = user.name;
  const canUseSimulator = await isSimulatorAllowedUser(name);

  const COLORS = {
    bgTop: "#0F0C2E",
    bgBottom: "#07061B",
    panel: "rgba(21, 18, 58, 0.96)",
    line: "rgba(255,255,255,0.10)",
    lineStrong: "rgba(255,255,255,0.14)",
    textSoft: "rgba(255,255,255,0.58)",
    white: "#FFFFFF",
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

  const footerButtonStyle: React.CSSProperties = {
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

        <div
          style={{
            marginBottom: 8,
          }}
        >
          <div
            style={{
              overflow: "hidden",
            }}
          >
            <EgoseBannerCarousel />
          </div>
        </div>

        <section
          id="user-qr-card"
          style={{
            ...panelStyle,
            padding: 12,
            marginBottom: 22,
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

        {canUseSimulator ? (
        <section
          style={{
            ...panelStyle,
            padding: 14,
            marginBottom: 18,
          }}
        >
          <a
            href="/simulator"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 12,
              textDecoration: "none",
              borderRadius: 20,
              padding: "15px 16px",
              background: "rgba(238,224,197,0.10)",
              border: `1px solid ${COLORS.lineStrong}`,
              color: COLORS.white,
            }}
          >
            <span>
              <span
                style={{
                  display: "block",
                  color: COLORS.white,
                  fontSize: 16,
                  fontWeight: 900,
                  lineHeight: 1.25,
                  marginBottom: 4,
                }}
              >
                시뮬레이터
              </span>
              <span
                style={{
                  display: "block",
                  color: COLORS.textSoft,
                  fontSize: 12,
                  fontWeight: 700,
                  lineHeight: 1.45,
                }}
              >
                색상팔레트, 유리한필름배치 추가필요.
              </span>
            </span>
            <span
              aria-hidden="true"
              style={{
                color: "#EEE0C5",
                fontSize: 22,
                fontWeight: 900,
              }}
            >
              →
            </span>
          </a>

          <a
            href="/simulator/links/new"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 12,
              textDecoration: "none",
              borderRadius: 20,
              padding: "15px 16px",
              marginTop: 10,
              background: "rgba(238,224,197,0.10)",
              border: `1px solid ${COLORS.lineStrong}`,
              color: COLORS.white,
            }}
          >
            <span>
              <span
                style={{
                  display: "block",
                  color: COLORS.white,
                  fontSize: 16,
                  fontWeight: 900,
                  lineHeight: 1.25,
                  marginBottom: 4,
                }}
              >
                시뮬레이터 링크생성기
              </span>
              <span
                style={{
                  display: "block",
                  color: COLORS.textSoft,
                  fontSize: 12,
                  fontWeight: 700,
                  lineHeight: 1.45,
                }}
              >
                색상프리셋, 만료연기 추가필요.
              </span>
            </span>
            <span
              aria-hidden="true"
              style={{
                color: "#EEE0C5",
                fontSize: 22,
                fontWeight: 900,
              }}
            >
              →
            </span>
          </a>

          <a
            href="/simulator/links/manage"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 12,
              textDecoration: "none",
              borderRadius: 20,
              padding: "15px 16px",
              marginTop: 10,
              background: "rgba(238,224,197,0.10)",
              border: `1px solid ${COLORS.lineStrong}`,
              color: COLORS.white,
            }}
          >
            <span>
              <span
                style={{
                  display: "block",
                  color: COLORS.white,
                  fontSize: 16,
                  fontWeight: 900,
                  lineHeight: 1.25,
                  marginBottom: 4,
                }}
              >
                링크관리
              </span>
              <span
                style={{
                  display: "block",
                  color: COLORS.textSoft,
                  fontSize: 12,
                  fontWeight: 700,
                  lineHeight: 1.45,
                }}
              >
                보낸 링크 확인 / 복사 / 삭제
              </span>
            </span>
            <span
              aria-hidden="true"
              style={{
                color: "#EEE0C5",
                fontSize: 22,
                fontWeight: 900,
              }}
            >
              →
            </span>
          </a>
        </section>
        ) : null}

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

      <BottomQuickNav current="dashboard" />
    </main>
  );
}