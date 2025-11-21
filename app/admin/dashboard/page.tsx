// app/admin/dashboard/page.tsx
import type React from "react";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// YYYY-MM-DD
function toYMD(d: Date): string {
  return d.toISOString().slice(0, 10);
}

// 화면에 보여줄 시각 (YYYY-MM-DD HH:MM:SS)
function formatDateTime(d: Date): string {
  const iso = d.toISOString(); // 2025-11-21T03:12:45.000Z
  const ymd = iso.slice(0, 10);
  const time = iso.slice(11, 19);
  return `${ymd} ${time}`;
}

// 공통 스타일들
const wrapperStyle: React.CSSProperties = {
  maxWidth: 1200,
  margin: "0 auto",
  padding: "24px 10px 40px",
  color: "#fff",
};

const titleStyle: React.CSSProperties = {
  fontSize: 24,
  fontWeight: 800,
  marginBottom: 4,
};

const descStyle: React.CSSProperties = {
  fontSize: 13,
  opacity: 0.8,
  marginBottom: 12,
};

const viewportStyle: React.CSSProperties = {
  height: "calc(100vh - 140px)",
  minHeight: 320,
  overflow: "auto",
  WebkitOverflowScrolling: "touch" as any,
  background: "rgba(255,255,255,0.02)",
};

const frameStyle: React.CSSProperties = {
  display: "inline-block",
  border: "1px solid #ffffff",
  borderRadius: 12,
  boxShadow: "0 6px 24px rgba(0,0,0,0.35)",
  background: "transparent",
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
  background: "#1739f7",
  color: "#fff",
  fontWeight: 800,
  letterSpacing: "0.02em",
  borderBottom: "1px solid #ffffff",
  padding: "6px 10px",
  textShadow: "0 1px 0 rgba(0,0,0,0.25)",
  borderRight: "1px solid rgba(255,255,255,0.45)",
};

const baseRowStyle: React.CSSProperties = {
  borderTop: "1px solid rgba(255,255,255,0.15)",
};

const cellStyle: React.CSSProperties = {
  padding: "4px 10px",
  borderRight: "1px solid rgba(255,255,255,0.3)",
  borderBottom: "1px solid rgba(255,255,255,0.15)",
  verticalAlign: "middle",
};

const monoStyle: React.CSSProperties = {
  fontFamily:
    'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
  fontSize: 11,
  wordBreak: "break-all" as const,
};

export default async function AdminDashboardPage() {
  const logs = await prisma.pageView.findMany({
    orderBy: { viewedAt: "desc" },
    take: 300,
  });

  return (
    <div style={wrapperStyle}>
      <h2 style={titleStyle}>페이지 방문 로그</h2>
      <p style={descStyle}>
        관계자가 아니라면 보고계신 페이지에서 이탈해 주시길 바랍니다.
      </p>

      <div style={viewportStyle}>
        <div style={frameStyle}>
          <table style={tableStyle}>
            <thead>
              <tr>
                <th style={{ ...headerCellStyle, minWidth: 140 }}>방문 시각</th>
                <th style={{ ...headerCellStyle, minWidth: 110 }}>이름</th>
                <th style={{ ...headerCellStyle, minWidth: 130 }}>경로</th>
                <th style={{ ...headerCellStyle, minWidth: 110 }}>기기</th>
                <th style={{ ...headerCellStyle, minWidth: 120 }}>IP</th>
                <th style={{ ...headerCellStyle, minWidth: 260 }}>
                  User-Agent (일부분)
                </th>
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
                  prev &&
                  (prev.userName || "") === (log.userName || "");

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

                const ua = log.userAgent || "";
                const shortUA =
                  ua.length > 90 ? ua.slice(0, 90).concat("…") : ua;

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
                    <td style={cellStyle}>{formatDateTime(log.viewedAt)}</td>
                    <td style={cellStyle}>{log.userName || "-"}</td>
                    <td style={cellStyle}>{log.path}</td>
                    <td style={cellStyle}>{deviceType}</td>
                    <td style={cellStyle}>{log.ip || "-"}</td>
                    <td style={{ ...cellStyle, textAlign: "left" }}>
                      <span style={monoStyle}>{shortUA || "-"}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <p style={{ fontSize: 11, opacity: 0.65, marginTop: 8 }}>
        * 이름은 로그인 시 생성된 session_user 쿠키 기준입니다. <br />
        * 기기 정보는 브라우저에서 전송하는 User-Agent 를 기반으로 대략 분류한
        값입니다.
      </p>
    </div>
  );
}
