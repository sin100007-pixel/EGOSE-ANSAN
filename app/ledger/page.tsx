"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";

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
const trim7 = (s: string) =>
  (s?.length ?? 0) > 7 ? s.slice(0, 7) + "…" : (s || "");

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
      const w = 240;
      const h = 140;

      let left = rect.right + pad;
      let top = rect.top + rect.height / 2 - h / 2;
      let side: "right" | "left" = "right";

      if (left + w > window.innerWidth - 8) {
        left = rect.left - pad - w;
        side = "left";
      }
      if (top < 8) top = 8;
      if (top + h > window.innerHeight - 8) top = window.innerHeight - h - 8;

      setStyle({ position: "fixed", left, top, width: w, height: h, zIndex: 999 });
      setArrowSide(side);
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
          <div className="eg-bubble-title" title={title || "상세"}>{title || "상세"}</div>
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
        .eg-bubble{
          border-radius: 12px;
          border: 1px solid rgba(255,255,255,.9);
          background: linear-gradient(180deg, #1a1d3a 0%, #0f1129 100%);
          color: #fff;
          box-shadow: 0 8px 24px rgba(0,0,0,.4), inset 0 1px 0 rgba(255,255,255,.08);
          overflow: hidden;
          font-size: 14px;
        }
        .eg-bubble-head{
          display:flex;align-items:center;justify-content:space-between;
          padding:6px 8px;border-bottom:1px solid rgba(255,255,255,.6);
          background: rgba(255,255,255,.06);
        }
        .eg-bubble-title{font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;padding-right:6px;}
        .eg-bubble-close{
          font-size:12px;padding:2px 7px;border-radius:7px;
          border:1px solid #fff;background:transparent;color:#fff;
        }
        .eg-bubble-close:hover{background:#fff;color:#0b0d21;}
        .eg-bubble-body{
          padding:8px;line-height:1.5;white-space:pre-wrap;overflow:auto;height:calc(100% - 34px);
        }
        .eg-bubble.right::after,.eg-bubble.left::after{
          content:"";position:absolute;top:50%;transform:translateY(-50%);
          width:0;height:0;border:8px solid transparent;
        }
        .eg-bubble.right::after{left:-16px;border-right-color:#1a1d3a;}
        .eg-bubble.left::after{right:-16px;border-left-color:#1a1d3a;}
      `}</style>
    </>
  );
};

/* ---------- 페이지 ---------- */
export default function LedgerPage() {
  const HEADER_BLUE = "#1739f7";

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
        try { localStorage.setItem("session_user", urlName); } catch {}
        return;
      }
      try {
        const r = await fetch("/api/whoami", { cache: "no-store" });
        const d = await r.json();
        if (d?.name) {
          setLoginName(d.name);
          try { localStorage.setItem("session_user", d.name); } catch {}
          return;
        }
      } catch {}
      try {
        const ls = (localStorage.getItem("session_user") || "").trim();
        if (ls) { setLoginName(ls); return; }
      } catch {}
      setLoginName("");
    };
    getName();
  }, []);

  useEffect(() => {
    const run = async () => {
      setErr(""); setRows([]);
      if (!loginName) { setLoading(false); setErr("로그인 이름을 확인할 수 없습니다."); return; }
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
    <div className="wrap p-4 md:p-6 text-white" style={{ background: "#0b0d21", fontSize: 18 }}>
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
          padding: "10px 14px",
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

      <h1 className="text-[26px] md:text-[36px] font-extrabold mb-3">내 거래 내역 (최근 3개월)</h1>

      <div className="mb-3 text-white/80" style={{ fontSize: 18 }}>
        <span className="mr-2">{loginName || "고객"} 님,</span>
        기간: <span className="font-semibold">{ymd(date_from)}</span> ~{" "}
        <span className="font-semibold">{ymd(date_to)}</span>
      </div>

      {/* ▼ 가로/세로 스크롤 : 바깥(뷰포트)이 스크롤 담당, 안쪽(프레임)이 흰색 테두리를 표 너비에 맞춰 감싼다 */}
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
                <tr><td className="py-3" colSpan={7}>불러오는 중…</td></tr>
              ) : err ? (
                <tr><td className="py-3 text-red-300" colSpan={7}>{err}</td></tr>
              ) : rows.length === 0 ? (
                <tr><td className="py-5 text-white/80" colSpan={7}>표시할 내역이 없습니다.</td></tr>
              ) : (
                rows.map((r, i) => {
                  const shortName = trim7(r.item_name || "");
                  const needInfo = (r.item_name?.length || 0) > 7 || (r.memo && r.memo.trim().length > 0);
                  const rowId = `${r.tx_date}-${r.item_name}-${i}`;

                  return (
                    <tr key={rowId}>
                      <td className="col-date">{r.tx_date?.slice(5)}</td>
                      <td className="col-name">
                        <div className="inline-flex items-center justify-center gap-1 max-w-full">
                          <span className="truncate max-w-[60vw] md:max-w-[260px]">{shortName}</span>
                          {needInfo && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                if (bubble.open && bubble.rowId === rowId) {
                                  setBubble({ open: false, title: "", content: "", anchorEl: null, rowId: null });
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
                              className="ml-0.5 shrink-0 inline-flex items-center justify-center w-6 h-6 rounded-md border border-white text-[13px] hover:bg-white hover:text-[#0b0d21] transition"
                              title="상세 보기" aria-label="상세 보기"
                            >i</button>
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

      {/* ✅ 스타일 */}
      <style jsx>{`
        /* === 셀 여백/폰트 조절 포인트 === */
        :root {
          --cell-xpad: 2ch;   /* 좌우 여백 (공백 2칸) */
          --cell-ypad: 10px;  /* 상하 여백 */
          --table-font: 16px; /* 표 폰트 */
        }

        /* 바깥: 스크롤 전용 */
        .scroll-viewport{
          max-height: 75vh;
          overflow: auto;
          background: rgba(255,255,255,.02);
        }

        /* 안쪽: 흰색 테두리(표 실제 너비에 맞춤) */
        .scroll-frame{
          display: inline-block;           /* 표 너비만큼만 차지 */
          border: 1px solid #ffffff;       /* 겉 테두리 */
          border-radius: 12px;
          box-shadow: 0 6px 24px rgba(0,0,0,.35);
          overflow: hidden;                /* 둥근 모서리 안으로 내용 자르기 */
          background: transparent;
        }

        .ledger{
          width: max-content;              /* 내용 기준 너비 */
          border-collapse: collapse;
          table-layout: auto;
          white-space: nowrap;             /* 줄바꿈 방지 → 셀 폭은 내용 기준 */
          font-size: var(--table-font);
          color: #fff;
          text-align: center;
        }

        .sticky-head th{
          position: sticky;
          top: 0;
          z-index: 10;
          background: #1739f7;            /* 로그인 버튼과 같은 파랑 */
          color: #fff;
          font-weight: 800;
          letter-spacing: .02em;
          border-bottom: 1px solid #ffffff;
          text-shadow: 0 1px 0 rgba(0,0,0,.25);
        }

        thead th, tbody td{
          padding: var(--cell-ypad) var(--cell-xpad); /* 좌우 2ch 고정 */
          vertical-align: middle;
          border-right: 1px solid rgba(255,255,255,.35);
          border-bottom: 1px solid rgba(255,255,255,.3);
        }
        thead tr th:last-child, tbody tr td:last-child{ border-right: none; }
        tbody tr:last-child td{ border-bottom: none; }

        /* 본문 줄무늬 */
        tbody tr td{ background: #0b0d21; }
        tbody tr:nth-child(even) td{ background: #101536; }

        /* 최소 너비(필요 시 조절) */
        .col-date { min-width: 96px; }
        .col-name { min-width: 320px; }
        .col-qty  { min-width: 84px; }

        /* 모바일 최소 보장 */
        @media (max-width: 480px) {
          :root{ --table-font: 15px; --cell-ypad: 8px; }
          .col-date { min-width: 60px; }
          .col-qty  { min-width: 54px; }
        }
      `}</style>
    </div>
  );
}
