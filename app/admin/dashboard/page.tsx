// app/admin/dashboard/page.tsx
import type React from "react";
import { prisma } from "@/lib/prisma";
import {
  extractSimulatorLinkToken,
  readSimulatorLinkInfoMap,
} from "@/lib/simulator-pageview-link";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type PageViewLog = {
  id: string;
  path: string;
  viewedAt: Date;
  deviceType: string | null;
  userAgent: string | null;
  ip: string | null;
  userName: string | null;
  simulatorToken?: string | null;
  simulatorInstallerName?: string | null;
  simulatorCustomerName?: string | null;
  simulatorMemo?: string | null;
};

async function readPageViewLogs(): Promise<PageViewLog[]> {
  try {
    return await prisma.pageView.findMany({
      select: {
        id: true,
        path: true,
        viewedAt: true,
        deviceType: true,
        userAgent: true,
        ip: true,
        userName: true,
        simulatorToken: true,
        simulatorInstallerName: true,
        simulatorCustomerName: true,
        simulatorMemo: true,
      },
      orderBy: { viewedAt: "desc" },
      take: 400,
    });
  } catch (err) {
    // 새 컬럼을 아직 DB에 추가하지 않은 경우에도 관리자 화면은 기존 로그 기준으로 열리게 합니다.
    console.error("pageview read with simulator link columns failed", err);

    return await prisma.pageView.findMany({
      select: {
        id: true,
        path: true,
        viewedAt: true,
        deviceType: true,
        userAgent: true,
        ip: true,
        userName: true,
      },
      orderBy: { viewedAt: "desc" },
      take: 400,
    });
  }
}

// 한국 시간(Asia/Seoul) 기준으로 YYYY-MM-DD HH:MM:SS 문자열 만들기
function formatKoreanDateTime(d: Date): string {
  try {
    const formatter = new Intl.DateTimeFormat("ko-KR", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
      timeZone: "Asia/Seoul", // ✅ 한국 시간
    });

    const parts = formatter.formatToParts(d);
    const get = (type: string) =>
      parts.find((p) => p.type === type)?.value?.padStart(2, "0") ?? "";

    const year = get("year");
    const month = get("month");
    const day = get("day");
    const hour = get("hour");
    const minute = get("minute");
    const second = get("second");

    // 최종 표기 형식: 2025-11-22 11:03:44
    return `${year}-${month}-${day} ${hour}:${minute}:${second}`;
  } catch {
    // 포맷이 실패하면, UTC 기준으로 9시간 더해서 한국 시간 비슷하게라도 보여주기
    const kst = new Date(d.getTime() + 9 * 60 * 60 * 1000);
    return kst.toISOString().replace("T", " ").slice(0, 19);
  }
}

// YYYY-MM-DD (한국 시간 기준)
function toYMD(d: Date): string {
  return formatKoreanDateTime(d).slice(0, 10);
}

// 화면에 보여줄 시각 (YYYY-MM-DD HH:MM:SS, 한국 시간 기준)
function formatDateTime(d: Date): string {
  return formatKoreanDateTime(d);
}

// 모바일에서는 초까지 유지하되 폭을 줄이기 위해 연도만 숨깁니다. (MM-DD HH:MM:SS)
function formatMobileDateTime(d: Date): string {
  return formatKoreanDateTime(d).slice(5, 19);
}

// 관리자 화면에서는 기존에 저장된 query까지 붙은 로그도 pathname만 표시
function cleanDisplayPath(value?: string | null): string {
  const raw = (value || "").trim();
  if (!raw) return "-";

  try {
    const url = raw.startsWith("/")
      ? new URL(raw, "https://egose.local")
      : new URL(raw);

    return url.pathname || "/";
  } catch {
    const withoutHash = raw.split("#")[0] || "";
    const withoutQuery = withoutHash.split("?")[0] || "/";
    return withoutQuery.startsWith("/") ? withoutQuery : `/${withoutQuery}`;
  }
}

function truncateText(value: string, maxLength = 27): string {
  if (value.length <= maxLength) return value;
  return `${value.slice(0, maxLength)}...`;
}

function formatPathForTable(value: string): string {
  const sharePrefix = "/simulator/share/";

  if (value.startsWith(sharePrefix)) {
    const token = value.slice(sharePrefix.length);
    return `${sharePrefix}${token.slice(0, 3)}...`;
  }

  return truncateText(value, 27);
}

// 공통 스타일들
const wrapperStyle: React.CSSProperties = {
  maxWidth: 1320,
  margin: "0 auto",
  padding: "26px 18px 44px",
  color: "#fff",
};

const headerAreaStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "flex-end",
  justifyContent: "space-between",
  gap: 16,
  marginBottom: 14,
};

const titleStyle: React.CSSProperties = {
  fontSize: 26,
  fontWeight: 900,
  margin: 0,
  letterSpacing: "-0.03em",
};

const descStyle: React.CSSProperties = {
  fontSize: 13,
  opacity: 0.82,
  margin: "7px 0 0",
  lineHeight: 1.55,
};

const statBarStyle: React.CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  justifyContent: "flex-end",
  gap: 8,
  minWidth: 280,
};

const statPillStyle: React.CSSProperties = {
  border: "1px solid rgba(255,255,255,0.18)",
  background: "rgba(255,255,255,0.08)",
  borderRadius: 999,
  padding: "7px 11px",
  fontSize: 12,
  fontWeight: 800,
  boxShadow: "0 8px 18px rgba(0,0,0,0.16)",
};

const viewportStyle: React.CSSProperties = {
  height: "calc(100vh - 154px)",
  minHeight: 360,
  overflow: "auto",
  WebkitOverflowScrolling: "touch" as any,
  background:
    "linear-gradient(180deg, rgba(255,255,255,0.075), rgba(255,255,255,0.025))",
  border: "1px solid rgba(255,255,255,0.18)",
  borderRadius: 16,
  boxShadow: "0 14px 34px rgba(0,0,0,0.28)",
};

const frameStyle: React.CSSProperties = {
  display: "inline-block",
  background: "rgba(13,18,64,0.72)",
  minWidth: "100%",
};

const tableStyle: React.CSSProperties = {
  width: "100%",
  borderCollapse: "collapse" as const,
  tableLayout: "auto" as const,
  whiteSpace: "nowrap" as const,
  fontSize: 13,
  color: "#fff",
  textAlign: "center" as const,
};

const headerCellStyle: React.CSSProperties = {
  position: "sticky" as const,
  top: 0,
  zIndex: 20,
  background: "linear-gradient(180deg, #2550ff 0%, #1739f7 100%)",
  color: "#fff",
  fontWeight: 900,
  letterSpacing: "0.02em",
  borderBottom: "1px solid rgba(255,255,255,0.72)",
  padding: "8px 10px",
  textShadow: "0 1px 0 rgba(0,0,0,0.25)",
  borderRight: "1px solid rgba(255,255,255,0.35)",
};

const baseRowStyle: React.CSSProperties = {
  borderTop: "1px solid rgba(255,255,255,0.11)",
};

const cellStyle: React.CSSProperties = {
  padding: "7px 10px",
  borderRight: "1px solid rgba(255,255,255,0.18)",
  borderBottom: "1px solid rgba(255,255,255,0.1)",
  verticalAlign: "middle",
};

const monoStyle: React.CSSProperties = {
  fontFamily:
    'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
  fontSize: 11,
  wordBreak: "break-all" as const,
};

const pathCellStyle: React.CSSProperties = {
  ...cellStyle,
  width: 250,
  minWidth: 250,
  maxWidth: 250,
  position: "relative" as const,
  overflow: "visible",
  textAlign: "left" as const,
};

const pathTextStyle: React.CSSProperties = {
  display: "inline-block",
  maxWidth: 210,
  minWidth: 0,
  flex: "1 1 auto",
  overflow: "hidden",
  textOverflow: "ellipsis",
  verticalAlign: "middle",
  fontFamily:
    'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
  fontSize: 12,
};

const linkDetailsStyle: React.CSSProperties = {
  position: "relative" as const,
  display: "inline-block",
  maxWidth: "100%",
};

const linkSummaryStyle: React.CSSProperties = {
  listStyle: "none",
  cursor: "pointer",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "flex-start",
  gap: 6,
  maxWidth: "100%",
  padding: "3px 7px",
  borderRadius: 9,
  color: "#e8eeff",
  textDecoration: "underline",
  textUnderlineOffset: 3,
};

const linkBadgeStyle: React.CSSProperties = {
  flex: "0 0 auto",
  fontSize: 10,
  fontWeight: 900,
  color: "#0d1240",
  background: "#fff4b8",
  borderRadius: 999,
  padding: "1px 6px",
  textDecoration: "none",
  boxShadow: "0 3px 8px rgba(0,0,0,0.18)",
};

const linkBubbleStyle: React.CSSProperties = {
  position: "absolute" as const,
  left: "50%",
  top: 32,
  transform: "translateX(-50%)",
  zIndex: 80,
  width: 330,
  maxWidth: "86vw",
  padding: "11px 12px",
  borderRadius: 14,
  border: "1px solid rgba(255,255,255,0.55)",
  background: "rgba(13,18,64,0.98)",
  boxShadow: "0 14px 34px rgba(0,0,0,0.5)",
  color: "#fff",
  textAlign: "left" as const,
  whiteSpace: "normal" as const,
  lineHeight: 1.45,
};

const bubbleTitleStyle: React.CSSProperties = {
  fontSize: 12,
  fontWeight: 900,
  marginBottom: 7,
  color: "#fff4b8",
};

const bubbleRowStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "52px 1fr",
  columnGap: 8,
  fontSize: 12,
  marginTop: 4,
};

const bubbleLabelStyle: React.CSSProperties = {
  opacity: 0.72,
  fontWeight: 800,
};

const bubbleValueStyle: React.CSSProperties = {
  wordBreak: "break-word" as const,
};

const bubblePathValueStyle: React.CSSProperties = {
  ...bubbleValueStyle,
  fontFamily:
    'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
  fontSize: 11,
  wordBreak: "break-all" as const,
};

export default async function AdminDashboardPage() {
  const logs = await readPageViewLogs();
  const tokens = logs
    .map((log) => log.simulatorToken || extractSimulatorLinkToken(log.path))
    .filter((token): token is string => Boolean(token));
  const simulatorLinkInfoMap = await readSimulatorLinkInfoMap(tokens);

  const todayYMD = toYMD(new Date());
  const todayLogCount = logs.filter((log) => toYMD(log.viewedAt) === todayYMD).length;
  const simulatorShareCount = logs.filter((log) =>
    cleanDisplayPath(log.path).startsWith("/simulator/share/")
  ).length;

  return (
    <div className="adminDashboardWrapper" style={wrapperStyle}>
      <style>{`
        .linkInfoSummary::-webkit-details-marker { display: none; }
        .linkInfoSummary::marker { content: ""; }
        .linkInfoDetails[open] .linkInfoSummary {
          background: rgba(255,255,255,0.14);
          color: #ffffff;
        }
        .adminLogTable tbody tr:nth-child(odd) td {
          background: rgba(255,255,255,0.018);
        }
        .adminLogTable tbody tr:nth-child(even) td {
          background: rgba(255,255,255,0.045);
        }
        .adminLogTable tbody tr:hover td {
          background: rgba(140,170,255,0.16);
        }
        .mobileTimeText { display: none; }
        .adminPathText,
        .adminNameText,
        .desktopTimeText,
        .mobileTimeText {
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .adminNameText {
          display: inline-block;
          max-width: 78px;
          vertical-align: middle;
        }
        @media (min-width: 641px) {
          .adminLogTable {
            table-layout: fixed !important;
          }
          .adminTimeCol {
            width: 150px !important;
            min-width: 150px !important;
            max-width: 150px !important;
          }
          .adminNameCol {
            width: 88px !important;
            min-width: 88px !important;
            max-width: 88px !important;
          }
          .adminPathCol {
            width: 250px !important;
            min-width: 250px !important;
            max-width: 250px !important;
          }
          .adminPathText {
            max-width: 210px !important;
          }
          .linkInfoSummary .adminPathText {
            max-width: 176px !important;
          }
          .adminLogTable th,
          .adminLogTable td {
            padding-left: 10px !important;
            padding-right: 10px !important;
          }
        }
        @media (max-width: 640px) {
          .adminDashboardWrapper {
            max-width: none !important;
            width: 100% !important;
            padding: 18px 8px 28px !important;
            box-sizing: border-box !important;
          }
          .adminHeaderArea {
            display: block !important;
            margin-bottom: 10px !important;
          }
          .adminTitle {
            font-size: 22px !important;
            line-height: 1.18 !important;
          }
          .adminDesc {
            font-size: 12px !important;
            margin-top: 6px !important;
            margin-bottom: 9px !important;
          }
          .adminStatBar {
            justify-content: flex-start !important;
            gap: 5px !important;
            min-width: 0 !important;
            margin-top: 8px !important;
          }
          .adminStatPill {
            padding: 5px 8px !important;
            font-size: 10.5px !important;
          }
          .adminLogViewport {
            height: calc(100vh - 142px) !important;
            min-height: 300px !important;
            overflow-x: hidden !important;
            border-radius: 12px !important;
          }
          .adminLogFrame {
            display: block !important;
            width: 100% !important;
            min-width: 0 !important;
          }
          .adminLogTable {
            width: 100% !important;
            table-layout: fixed !important;
            font-size: 11px !important;
          }
          .adminLogTable th,
          .adminLogTable td {
            padding: 6px 4px !important;
            box-sizing: border-box !important;
          }
          .adminHideMobile {
            display: none !important;
          }
          .adminTimeCol {
            width: 106px !important;
            min-width: 106px !important;
            max-width: 106px !important;
          }
          .adminNameCol {
            width: 54px !important;
            min-width: 54px !important;
            max-width: 54px !important;
          }
          .adminPathCol {
            width: auto !important;
            min-width: 0 !important;
            max-width: none !important;
          }
          .adminPathCell {
            width: auto !important;
            min-width: 0 !important;
            max-width: none !important;
            text-align: left !important;
            overflow: visible !important;
          }
          .desktopTimeText {
            display: none !important;
          }
          .mobileTimeText {
            display: inline-block !important;
            max-width: 98px !important;
            font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace !important;
            font-size: 10.5px !important;
          }
          .adminNameText {
            max-width: 46px !important;
          }
          .adminPathText {
            max-width: 100% !important;
            font-size: 10.5px !important;
            min-width: 0 !important;
          }
          .linkInfoDetails {
            width: 100% !important;
            max-width: 100% !important;
          }
          .linkInfoSummary {
            width: 100% !important;
            max-width: 100% !important;
            gap: 3px !important;
            padding: 1px 2px !important;
            box-sizing: border-box !important;
          }
          .adminLinkBadge {
            font-size: 9px !important;
            padding: 0 4px !important;
          }
          .adminLinkBubble {
            left: auto !important;
            right: 0 !important;
            top: 26px !important;
            transform: none !important;
            width: 270px !important;
            max-width: calc(100vw - 22px) !important;
            padding: 10px !important;
          }
          .adminFooterNote {
            font-size: 10px !important;
            line-height: 1.5 !important;
          }
        }
      `}</style>

      <div className="adminHeaderArea" style={headerAreaStyle}>
        <div>
          <h2 className="adminTitle" style={titleStyle}>페이지 방문 로그</h2>
          <p className="adminDesc" style={descStyle}>
            관계자가 아니라면 보고계신 페이지에서 이탈해 주시길 바랍니다.
          </p>
        </div>
        <div className="adminStatBar" style={statBarStyle}>
          <span className="adminStatPill" style={statPillStyle}>오늘 {todayLogCount}건</span>
          <span className="adminStatPill" style={statPillStyle}>최근 {logs.length}건</span>
          <span className="adminStatPill" style={statPillStyle}>고객링크 {simulatorShareCount}건</span>
        </div>
      </div>

      <div className="adminLogViewport" style={viewportStyle}>
        <div className="adminLogFrame" style={frameStyle}>
          <table className="adminLogTable" style={tableStyle}>
            <thead>
              <tr>
                <th className="adminTimeCol" style={{ ...headerCellStyle, width: 150, minWidth: 150, maxWidth: 150 }}>방문 시각</th>
                <th className="adminNameCol" style={{ ...headerCellStyle, width: 88, minWidth: 88, maxWidth: 88 }}>이름</th>
                <th className="adminPathCol" style={{ ...headerCellStyle, width: 250, minWidth: 250, maxWidth: 250, textAlign: "left" }}>경로</th>
                <th className="adminHideMobile" style={{ ...headerCellStyle, minWidth: 126 }}>기기</th>
                <th className="adminHideMobile" style={{ ...headerCellStyle, minWidth: 132 }}>IP</th>
                <th className="adminHideMobile" style={{ ...headerCellStyle, minWidth: 360, textAlign: "left" }}>User-Agent</th>
              </tr>
            </thead>

            <tbody>
              {logs.length === 0 && (
                <tr>
                  <td colSpan={6} style={{ ...cellStyle, textAlign: "center" }}>
                    아직 방문 기록이 없습니다.
                  </td>
                </tr>
              )}

              {logs.map((log, idx) => {
                const prev = idx > 0 ? logs[idx - 1] : null;

                const curYMD = toYMD(log.viewedAt);
                const prevYMD = prev ? toYMD(prev.viewedAt) : null;

                const sameDate = prev && prevYMD === curYMD;
                const sameUser =
                  prev && (prev.userName || "") === (log.userName || "");

                // 날짜가 바뀌면 빨간색, 같은 날짜 안에서 사람만 바뀌면 파란색
                let borderTopStyle: React.CSSProperties = {};
                if (prev) {
                  if (!sameDate) {
                    borderTopStyle = {
                      borderTop: "3px solid rgba(255,80,80,0.98)", // 빨간 선
                    };
                  } else if (!sameUser) {
                    borderTopStyle = {
                      borderTop: "3px solid rgba(140,170,255,0.95)", // 파란 선
                    };
                  }
                }

                const rowStyle: React.CSSProperties = {
                  ...baseRowStyle,
                  ...borderTopStyle,
                };

                const displayPath = cleanDisplayPath(log.path);
                const shortDisplayPath = formatPathForTable(displayPath);
                const ua = log.userAgent || "";
                const shortUA =
                  ua.length > 150 ? ua.slice(0, 150).concat("…") : ua;

                const token =
                  log.simulatorToken || extractSimulatorLinkToken(log.path);
                const liveLinkInfo = token ? simulatorLinkInfoMap[token] : null;
                const installerName =
                  log.simulatorInstallerName || liveLinkInfo?.installerName || "-";
                const customerName =
                  log.simulatorCustomerName || liveLinkInfo?.customerName || "-";
                const memo = log.simulatorMemo || liveLinkInfo?.memo || "-";
                const hasSimulatorLinkInfo =
                  Boolean(token) &&
                  (installerName !== "-" || customerName !== "-" || memo !== "-");

                // 기기 표기
                const deviceType = (() => {
                  const t = (log.deviceType || "").toLowerCase();
                  if (t === "ios") return "iPhone / iPad";
                  if (t === "android") return "Android";
                  if (t === "windows") return "Windows PC";
                  if (t === "macos") return "Mac";
                  if (t === "linux") return "Linux";
                  if (t === "other") return "기타";
                  return "알 수 없음";
                })();

                return (
                  <tr key={log.id} style={rowStyle}>
                    <td className="adminTimeCol" style={cellStyle} title={formatDateTime(log.viewedAt)}>
                      <span className="desktopTimeText">{formatDateTime(log.viewedAt)}</span>
                      <span className="mobileTimeText">{formatMobileDateTime(log.viewedAt)}</span>
                    </td>
                    <td className="adminNameCol" style={cellStyle} title={log.userName || "-"}>
                      <span className="adminNameText">{log.userName || "-"}</span>
                    </td>
                    <td className="adminPathCol adminPathCell" style={pathCellStyle}>
                      {hasSimulatorLinkInfo ? (
                        <details className="linkInfoDetails" style={linkDetailsStyle}>
                          <summary
                            className="linkInfoSummary"
                            style={linkSummaryStyle}
                            title={displayPath}
                          >
                            <span className="adminPathText" style={pathTextStyle}>{shortDisplayPath}</span>
                            <span className="adminLinkBadge" style={linkBadgeStyle}>정보</span>
                          </summary>
                          <div className="adminLinkBubble" style={linkBubbleStyle}>
                            <div style={bubbleTitleStyle}>고객 링크 정보</div>
                            <div style={bubbleRowStyle}>
                              <span style={bubbleLabelStyle}>경로</span>
                              <span style={bubblePathValueStyle}>{displayPath}</span>
                            </div>
                            <div style={bubbleRowStyle}>
                              <span style={bubbleLabelStyle}>시공자</span>
                              <span style={bubbleValueStyle}>{installerName}</span>
                            </div>
                            <div style={bubbleRowStyle}>
                              <span style={bubbleLabelStyle}>고객명</span>
                              <span style={bubbleValueStyle}>{customerName}</span>
                            </div>
                            <div style={bubbleRowStyle}>
                              <span style={bubbleLabelStyle}>메모</span>
                              <span style={bubbleValueStyle}>{memo}</span>
                            </div>
                          </div>
                        </details>
                      ) : (
                        <span className="adminPathText" style={pathTextStyle} title={displayPath}>
                          {shortDisplayPath}
                        </span>
                      )}
                    </td>
                    <td className="adminHideMobile" style={cellStyle}>{deviceType}</td>
                    <td className="adminHideMobile" style={cellStyle}>{log.ip || "-"}</td>
                    <td className="adminHideMobile" style={{ ...cellStyle, textAlign: "left" }}>
                      <span style={monoStyle}>{shortUA || "-"}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <p className="adminFooterNote" style={{ fontSize: 11, opacity: 0.68, marginTop: 10 }}>
        * 모바일에서는 방문 시각(초 포함), 이름, 경로만 보여줍니다. PC에서는 기기/IP/User-Agent까지 확인할 수 있습니다. <br />
        * 고객용 시뮬레이터 링크 경로의 정보 버튼을 누르면 시공자/고객명/메모를 확인할 수 있습니다. <br />
        * 기기 정보는 브라우저에서 전송하는 User-Agent 를 기반으로 대략 분류한 값입니다.
      </p>
    </div>
  );
}
