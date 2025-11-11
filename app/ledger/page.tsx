"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";

/* 안전한 날짜 표기 */
function toYMD(input?: any): string {
  if (input === null || input === undefined) return "";
  if (typeof input === "number" && input > 59) {
    // excel serial (rough)
    const epoch = new Date(Date.UTC(1899, 11, 30));
    const d = new Date(epoch.getTime() + input * 86400000);
    const y = d.getUTCFullYear();
    const m = String(d.getUTCMonth() + 1).padStart(2, "0");
    const da = String(d.getUTCDate()).padStart(2, "0");
    return `${y}-${m}-${da}`;
  }
  const s = String(input).trim().replace(/\./g, "-").replace(/\//g, "-");
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  const d = new Date(s);
  if (isNaN(d.getTime())) return "";
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const da = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${da}`;
}
function toMMDD(ymd: string): string {
  return ymd ? ymd.slice(5) : "";
}

/* ---------- 유틸 ---------- */
const fmt = (n: number | string | null | undefined) => {
  if (n === null || n === undefined || n === "") return "";
  const v = typeof n === "string" ? Number(n) : n;
  if (Number.isNaN(v)) return "";
  return v.toLocaleString("ko-KR");
};
const ymd = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;
const trim7 = (s: string) => ((s?.length ?? 0) > 7 ? s.slice(0, 7) + "…" : s || "");

/* ---------- 타입 ---------- */
type Row = {
  tx_date: string;
  item_name: string;
  qty: number | null;
  unit_price: number | null;
  amount: number | null;
  deposit: number | null;
  curr_balance: number | null;
  memo?: string | null;
};
type ApiResp = { ok: boolean; rows?: Row[]; message?: string };

/* ---------- 말풍선 ---------- */
const Bubble: React.FC<{
  anchorEl: HTMLButtonElement | null;
  title: string;
  content: string;
  onClose: () => void;
}> = ({ anchorEl, title, content, onClose }) => {
  const [style, setStyle] = useState<React.CSSProperties>({});
  const [arrowSide, setArrowSide] = useState<"right" | "left">("right");

  useEffect(() => {
    if (!anchorEl) return;

    const calc = () => {
      const rect = anchorEl.getBoundingClientRect();
      const pad = 8;
      const w = 320;
      const h = 168;

      // 항상 오른쪽에 배치
      let left = rect.right + pad;
      let top = rect.top + rect.height / 2 - h / 2;

      const maxLeft = window.innerWidth - w - 8;
      if (left > maxLeft) left = Math.max(rect.right + 2, maxLeft);
      if (top < 8) top = 8;
      if (top + h > window.innerHeight - 8) top = window.innerHeight - h - 8;

      setStyle({ position: "fixed", left, top, width: w, height: h, zIndex: 999 });
      setArrowSide("right");
    };

    calc();
    const onEsc = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    const onClickAway = (e: MouseEvent) => {
      const panel = document.getElementById("eg-bubble");
      if (panel && !panel.contains(e.target as Node) && !anchorEl.contains(e.target as Node)) {
        onClose();
      }
    };

    window.addEventListener("resize", calc);
    window.addEventListener("scroll", calc, true);
    window.addEventListener("keydown", onEsc);
    window.addEventListener("mousedown", onClickAway);
    return () => {
      window.removeEventListener("resize", calc);
      window.removeEventListener("scroll", calc, true);
      window.removeEventListener("keydown", onEsc);
      window.removeEventListener("mousedown", onClickAway);
    };
  }, [anchorEl, onClose]);

  if (!anchorEl) return null;

  return (
    <>
      <div
        className="fixed inset-0 z-[998] bg-black/10"
        onClick={(e) => {
          e.stopPropagation();
          onClose();
        }}
        aria-hidden="true"
      />
      <div
        id="eg-bubble"
        style={style}
        className={`eg-bubble ${arrowSide}`}
        role="dialog"
        aria-modal="true"
        onClick={(e) => {
          e.stopPropagation();
          onClose();
        }}
      >
        <div className="eg-bubble-head">
          <div className="eg-bubble-title" title={title || "상세"}>
            {title || "상세"}
          </div>
          <button
            className="eg-bubble-close"
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
          >
            닫기
          </button>
        </div>
        <div className="eg-bubble-body">{content}</div>
      </div>

      <style jsx>{`
        .eg-bubble {
          border-radius: 12px;
          border: 1px solid rgba(255, 255, 255, 0.9);
          background: linear-gradient(180deg, #1a1d3a 0%, #0f1129 100%);
          color: #fff;
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.08);
          overflow: hidden;
          font-size: 14px;
        }
        .eg-bubble-head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 6px 8px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.6);
          background: rgba(255, 255, 255, 0.06);
        }
        .eg-bubble-title {
          font-weight: 600;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          padding-right: 6px;
        }
        .eg-bubble-close {
          font-size: 12px;
          padding: 2px 7px;
          border-radius: 7px;
          border: 1px solid #fff;
          background: transparent;
          color: #fff;
        }
        .eg-bubble-close:hover {
          background: #fff;
          color: #0b0d21;
        }
        .eg-bubble-body {
          padding: 8px;
          line-height: 1.5;
          white-space: pre-wrap;
          overflow: auto;
          height: calc(100% - 34px);
        }
        .eg-bubble.right::after,
        .eg-bubble.left::after {
          content: "";
          position: absolute;
          top: 50%;
          transform: translateY(-50%);
          width: 0;
          height: 0;
          border: 8px solid transparent;
        }
        .eg-bubble.right::after {
          left: -16px;
          border-right-color: #1a1d3a;
        }
        .eg-bubble.left::after {
          right: -16px;
          border-left-color: #1a1d3a;
        }
      `}</style>
    </>
  );
};

/* ---------- 페이지 ---------- */
export default function LedgerPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  const [bubble, setBubble] = useState<{
    open: boolean;
    title: string;
    content: string;
    anchorEl: HTMLButtonElement | null;
    rowId: string | null;
  }>({ open: false, title: "", content: "", anchorEl: null, rowId: null });

  // 최근 3개월
  const date_to = useMemo(() => new Date(), []);
  const date_from = useMemo(() => {
    const d = new Date(date_to);
    d.setMonth(d.getMonth() - 3);
    return d;
  }, [date_to]);

  const [loginName, setLoginName] = useState("");

  useEffect(() => {
    const getName = async () => {
      const usp = new URLSearchParams(window.location.search);
      const urlName = (usp.get("name") || "").trim();
      if (urlName) {
        setLoginName(urlName);
        try {
          localStorage.setItem("session_user", urlName);
        } catch {}
        return;
      }
      try {
        const r = await fetch("/api/whoami", { cache: "no-store" });
        const d = await r.json();
        if (d?.name) {
          setLoginName(d.name);
          try {
            localStorage.setItem("session_user", d.name);
          } catch {}
          return;
        }
      } catch {}
      try {
        const ls = (localStorage.getItem("session_user") || "").trim();
        if (ls) {
          setLoginName(ls);
          return;
        }
      } catch {}
      setLoginName("");
    };
    getName();
  }, []);

  useEffect(() => {
    const run = async () => {
      setErr("");
      setRows([]);
      if (!loginName) {
        setLoading(false);
        setErr("로그인 이름을 확인할 수 없습니다.");
        return;
      }
      setLoading(true);
      try {
        const q = encodeURIComponent(loginName);
        const url =
          `/api/ledger-search?order=excel&limit=2000` +
          `&date_from=${ymd(date_from)}` +
          `&date_to=${ymd(date_to)}` +
          `&q=${q}`;
        const r = await fetch(url, { cache: "no-store" });
        const data: ApiResp = await r.json();
        if (!data.ok) throw new Error(data.message || "불러오기 실패");
        setRows(data.rows || []);
      } catch (e: any) {
        setErr(e?.message || "에러가 발생했습니다.");
      } finally {
        setLoading(false);
      }
    };
    run();
  }, [loginName, date_from, date_to]);

  const isDepositRow = (r: Row) => (r.deposit ?? 0) > 0 && (r.amount ?? 0) === 0;

  return (
    <div className="wrap p-4 md:p-6 text-white" style={{ background: "#0b0d21", fontSize: 16 }}>
      {/* 상단 우측 고정 버튼 */}
      <Link
        href="/dashboard"
        className="no-underline"
        style={{
          position: "fixed",
          top: 12,
          right: 12,
          zIndex: 1000,
          background: "#1739f7",
          color: "#fff",
          padding: "8px 12px",
          borderRadius: 10,
          fontWeight: 800,
          boxShadow: "0 6px 16px rgba(0,0,0,.35)",
          border: "1px solid rgba(255,255,255,.25)",
        }}
        onMouseEnter={(e) => ((e.currentTarget as HTMLAnchorElement).style.background = "#0e2fe9")}
        onMouseLeave={(e) => ((e.currentTarget as HTMLAnchorElement).style.background = "#1739f7")}
      >
        대시보드로
      </Link>

      {/* 페이지 제목(sticky) */}
      <div className="page-sticky-title">
        <h1 className="title">내 거래 내역 (최근 3개월)</h1>
        <div className="subtitle">
          <span className="mr-2">{loginName || "고객"} 님,</span>
          기간: <span className="strong">{ymd(date_from)}</span> ~{" "}
          <span className="strong">{ymd(date_to)}</span>
        </div>

        {/* ✅ 안내문 - 로컬 CSS로 폰트 고정(모바일 6px / 데스크탑 7px) */}
        <div className="mt-2 px-1">
          <ul
            className="space-y-[2px] font-medium text-red-400 eg-notice"
            style={{ color: "#f87171" }} // red-400 강제
          >
            <li>* 금일 발주 건은 차일 오후12시에 반영됩니다.</li>
            <li>** 누락, 중복, 오기입이 있을 수 있습니다. 대략으로만 봐주세요.</li>
            <li>
              *** 최근거래의 대략을 보여주므로 정확한 내용은 이고세로 직접 연락주세요.
              Tel.031-486-6882
            </li>
            <li>
              **** ⓘ버튼을 누르면 축약된 품명이 모두 보이게 됩니다. 끌때는 풍선을 누르거나 배경을
              눌러주세요.
            </li>
          </ul>
        </div>
      </div>

      {/* 내부 스크롤 뷰포트 */}
      <div className="scroll-viewport">
        <div className="scroll-frame">
          <table className="ledger">
            <thead className="sticky-head">
              <tr>
                <th className="col-date">일자</th>
                <th className="col-name">품명</th>
                <th className="col-qty">수량</th>
                <th>단가</th>
                <th>공급가</th>
                <th>입금액</th>
                <th>잔액</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td className="py-3" colSpan={7}>
                    불러오는 중…
                  </td>
                </tr>
              ) : err ? (
                <tr>
                  <td className="py-3 text-red-300" colSpan={7}>
                    {err}
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td className="py-5 text-white/80" colSpan={7}>
                    표시할 내역이 없습니다.
                  </td>
                </tr>
              ) : (
                rows.map((r, i) => {
                  // 날짜 경계(굵은 선) 판단
                  const curYMD =
                    toYMD(r.tx_date) ||
                    toYMD((r as any).date) ||
                    toYMD((r as any)["일자"]) ||
                    toYMD((r as any)["날짜"]);
                  const prevYMD =
                    i > 0
                      ? toYMD(rows[i - 1].tx_date) ||
                        toYMD((rows[i - 1] as any).date) ||
                        toYMD((rows[i - 1] as any)["일자"]) ||
                        toYMD((rows[i - 1] as any)["날짜"])
                      : "";
                  const isDateBreak = i === 0 || curYMD !== prevYMD;

                  const shortName = trim7(r.item_name || "");
                  const needInfo =
                    (r.item_name?.length || 0) > 7 || (r.memo && r.memo.trim().length > 0);
                  const rowId = `${curYMD}-${r.item_name}-${i}`;

                  return (
                    <tr key={rowId} className={isDateBreak ? "dateBreak" : ""}>
                      <td className="col-date">{toMMDD(curYMD)}</td>
                      <td className="col-name">
                        <div className="name-wrap">
                          <span className="name-text" title={r.item_name || ""}>
                            {shortName}
                          </span>
                          {needInfo && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                if (bubble.open && bubble.rowId === rowId) {
                                  setBubble({
                                    open: false,
                                    title: "",
                                    content: "",
                                    anchorEl: null,
                                    rowId: null,
                                  });
                                  return;
                                }
                                setBubble({
                                  open: true,
                                  title: r.item_name || "",
                                  content: (r.memo && r.memo.trim()) || r.item_name || "",
                                  anchorEl: e.currentTarget,
                                  rowId,
                                });
                              }}
                              className="info-btn"
                              title="상세 보기"
                              aria-label="상세 보기"
                            >
                              i
                            </button>
                          )}
                        </div>
                      </td>

                      <td className="col-qty">{!isDepositRow(r) ? (r.qty ?? "") : ""}</td>
                      <td>{!isDepositRow(r) ? fmt(r.unit_price) : ""}</td>
                      <td>{!isDepositRow(r) ? fmt(r.amount) : ""}</td>
                      <td>{fmt(r.deposit)}</td>
                      <td>{fmt(r.curr_balance)}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {bubble.open && (
        <Bubble
          anchorEl={bubble.anchorEl}
          title={bubble.title}
          content={bubble.content}
          onClose={() =>
            setBubble({ open: false, title: "", content: "", anchorEl: null, rowId: null })
          }
        />
      )}

      {/* 스타일 */}
      <style jsx>{`
        :root {
          --cell-xpad: 2ch;
          --cell-ypad: 6px;
          --head-ypad: 7px;
          --table-font: 14px;
        }

        .page-sticky-title {
          position: sticky;
          top: 0;
          z-index: 40;
          background: #0b0d21;
          padding-bottom: 8px;
          margin-bottom: 8px;
        }
        .title {
          font-size: 24px;
          font-weight: 800;
          margin: 0 0 4px 0;
        }
        .subtitle {
          font-size: 15px;
          color: rgba(255, 255, 255, 0.8);
        }
        .subtitle .strong {
          font-weight: 700;
          color: #fff;
        }

        /* 내부 스크롤 */
        .scroll-viewport {
          height: calc(100vh - 120px);
          min-height: 320px;
          overflow: auto;
          -webkit-overflow-scrolling: touch;
          background: rgba(255, 255, 255, 0.02);
        }

        .scroll-frame {
          display: inline-block;
          border: 1px solid #ffffff;
          border-radius: 12px;
          box-shadow: 0 6px 24px rgba(0, 0, 0, 0.35);
          background: transparent;
        }

        .ledger {
          width: max-content;
          border-collapse: collapse;
          table-layout: auto;
          white-space: nowrap;
          font-size: var(--table-font);
          color: #fff;
          text-align: center;
        }

        .sticky-head th {
          position: sticky;
          top: 0;
          z-index: 20;
          background: #1739f7;
          color: #fff;
          font-weight: 800;
          letter-spacing: 0.02em;
          border-bottom: 1px solid #ffffff;
          text-shadow: 0 1px 0 rgba(0, 0, 0, 0.25);
          padding: var(--head-ypad) var(--cell-xpad);
        }

        thead th,
        tbody td {
          vertical-align: middle;
          border-right: 1px solid rgba(255, 255, 255, 0.35);
          border-bottom: 1px solid rgba(255, 255, 255, 0.3);
        }
        tbody td {
          padding: var(--cell-ypad) var(--cell-xpad);
          background: #0b0d21;
        }
        tbody tr:nth-child(even) td {
          background: #101536;
        }
        thead tr th:last-child,
        tbody tr td:last-child {
          border-right: none;
        }
        tbody tr:last-child td {
          border-bottom: none;
        }

        /* ✅ 날짜가 바뀌는 첫 행 위에 굵은 경계선 */
        .dateBreak td {
          border-top: 3px solid rgba(140, 170, 255, 0.95);
        }

        /* 컬럼 너비 */
        .col-date {
          min-width: 84px;
        }
        .col-name {
          min-width: 180px;
        }
        .col-qty {
          min-width: 70px;
        }

        .name-wrap {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          max-width: 100%;
          justify-content: center;
        }
        .name-text {
          display: inline-block;
          max-width: 18ch;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .info-btn {
          width: 20px;
          height: 20px;
          border-radius: 6px;
          border: 1px solid #fff;
          background: transparent;
          color: #fff;
          font-size: 12px;
          line-height: 1;
        }
        .info-btn:hover {
          background: #fff;
          color: #0b0d21;
        }

        /* 🔻 안내문 폰트/줄간격 고정 (TW purge/우선순위 영향 방지) */
        .eg-notice { font-size: 10px; line-height: 11px; }
        @media (min-width: 768px) {
          .eg-notice { font-size: 11px; line-height: 12px; }
        }

        @media (max-width: 480px) {
          :root {
            --table-font: 13.5px;
            --cell-ypad: 5px;
            --head-ypad: 6px;
          }
          .col-date { min-width: 60px; }
          .col-name { min-width: 140px; }
          .col-qty  { min-width: 54px; }
          .name-text { max-width: 14ch; }
          .scroll-viewport { height: calc(100vh - 128px); }
        }
      `}</style>
    </div>
  );
}
