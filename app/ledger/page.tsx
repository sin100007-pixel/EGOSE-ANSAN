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
const trim7 = (s: string) => ((s?.length ?? 0) > 7 ? s.slice(0, 7) + "…" : (s || ""));

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

/* ---------- 작은 말풍선 ---------- */
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
        onClick={(e) => { e.stopPropagation(); onClose(); }}
        aria-hidden="true"
      />
      <div
        id="eg-bubble"
        style={style}
        className={`eg-bubble ${arrowSide}`}
        role="dialog"
        aria-modal="true"
        onClick={(e) => { e.stopPropagation(); onClose(); }}
      >
        <div className="eg-bubble-head">
          <div className="eg-bubble-title" title={title || "상세"}>{title || "상세"}</div>
          <button
            className="eg-bubble-close"
            onClick={(e) => { e.stopPropagation(); onClose(); }}
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
  const BTN_BLUE = "#1739f7";
  const TOPBAR_H = 64;   // 상단바 높이
  const HDR_H = 44;      // 헤더바 높이

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

  // 기간: 최근 3개월
  const date_to = useMemo(() => new Date(), []);
  const date_from = useMemo(() => {
    const d = new Date(date_to);
    d.setMonth(d.getMonth() - 3);
    return d;
  }, [date_to]);

  const [loginName, setLoginName] = useState("");

  // 로그인 이름 확보
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

  // 데이터 로드
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
    <div className="wrap text-white" style={{ background: "#0b0d21", fontSize: 18 }}>
      {/* ✅ 상단 Topbar — 인앱 호환을 위해 sticky */}
      <div
        className="topbar"
        style={{
          position: "sticky",
          top: 0,
          zIndex: 1000,
          height: TOPBAR_H,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 16px",
          background: "#0b0d21",
          borderBottom: "1px solid rgba(255,255,255,.22)",
        }}
      >
        <div>
          <div className="text-[26px] md:text-[28px] font-extrabold leading-none">
            내 거래 내역 (최근 3개월)
          </div>
          <div className="text-white/80 text-[14px] mt-1">
            <span className="mr-2">{loginName || "고객"} 님,</span>
            기간: <span className="font-semibold">{ymd(date_from)}</span> ~{" "}
            <span className="font-semibold">{ymd(date_to)}</span>
          </div>
        </div>
        <Link
          href="/dashboard"
          className="no-underline inline-flex items-center justify-center"
          style={{
            background: BTN_BLUE,
            color: "#fff",
            padding: "10px 14px",
            borderRadius: 10,
            fontWeight: 800,
            border: "1px solid rgba(255,255,255,.25)",
            whiteSpace: "nowrap",
          }}
        >
          대시보드로
        </Link>
      </div>

      {/* ✅ 내부 스크롤 컨테이너 */}
      <div
        className="scroller"
        style={{
          height: `calc(100vh - ${TOPBAR_H}px)`,
          overflow: "auto",
          WebkitOverflowScrolling: "touch",
          padding: "0 16px 24px",
        }}
      >
        {/* ✅ 복제 헤더(Grid) — 스크롤해도 항상 상단 고정 */}
        <div
          className="hdr-grid"
          style={{
            position: "sticky",
            top: 0,
            zIndex: 800,
            display: "grid",
            gridTemplateColumns: "12% 32% 10% 12% 12% 10% 12%",
            height: HDR_H,
            alignItems: "center",
            border: "1px solid #fff",
            borderBottom: "1px solid #fff",
            background: BTN_BLUE,
            color: "#fff",
            fontWeight: 800,
            padding: "0 8px",
          }}
        >
          <div className="text-center">일자</div>
          <div className="text-center">품명</div>
          <div className="text-center">수량</div>
          <div className="text-center">단가</div>
          <div className="text-center">공급가</div>
          <div className="text-center">입금액</div>
          <div className="text-center">잔액</div>
        </div>

        {/* ✅ 테이블 본문만 스크롤 */}
        <div className="relative rounded-xl shadow-[0_6px_24px_rgba(0,0,0,.35)]">
          <table className="ledger w-full leading-tight" style={{ fontSize: 16 }}>
            <colgroup>
              <col style={{ width: "12%" }} />
              <col style={{ width: "32%" }} />
              <col style={{ width: "10%" }} />
              <col style={{ width: "12%" }} />
              <col style={{ width: "12%" }} />
              <col style={{ width: "10%" }} />
              <col style={{ width: "12%" }} />
            </colgroup>

            <tbody>
              {loading ? (
                <tr><td className="py-3 text-center" colSpan={7}>불러오는 중…</td></tr>
              ) : err ? (
                <tr><td className="py-3 text-center text-red-300" colSpan={7}>{err}</td></tr>
              ) : rows.length === 0 ? (
                <tr><td className="py-5 text-center text-white/80" colSpan={7}>표시할 내역이 없습니다.</td></tr>
              ) : (
                rows.map((r, i) => {
                  const shortName = trim7(r.item_name || "");
                  const needInfo =
                    (r.item_name?.length || 0) > 7 || (r.memo && r.memo.trim().length > 0);
                  const rowId = `${r.tx_date}-${r.item_name}-${i}`;

                  return (
                    <tr key={rowId}>
                      <td className="col-date text-center">{r.tx_date?.slice(5)}</td>
                      <td className="col-name text-center">
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

                      <td className="col-qty text-center">{!isDepositRow(r) ? (r.qty ?? "") : ""}</td>
                      <td className="text-center">{!isDepositRow(r) ? fmt(r.unit_price) : ""}</td>
                      <td className="text-center">{!isDepositRow(r) ? fmt(r.amount) : ""}</td>
                      <td className="text-center">{fmt(r.deposit)}</td>
                      <td className="text-center">{fmt(r.curr_balance)}</td>
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
          onClose={() => setBubble({ open: false, title: "", content: "", anchorEl: null, rowId: null })}
        />
      )}

      <style jsx>{`
        .ledger{
          border-collapse: separate;   /* sticky 헤더 충돌 방지 */
          border-spacing: 0;
          width: 100%;
          table-layout: fixed;         /* colgroup 퍼센트 폭 반영 */
          border: 1px solid #ffffff;
          text-align: center;
          border-radius: 12px; overflow: hidden;
        }

        tbody td{
          padding-block: 10px;
          padding-inline: 1.2ch;
          white-space: nowrap;
          vertical-align: middle;
          border-right: 1px solid rgba(255,255,255,.35);
          border-bottom: 1px solid rgba(255,255,255,.3);
          background: #0b0d21;
          color: #fff;
        }
        tbody tr:nth-child(even) td{ background: #101536; }
        tbody tr td:last-child{ border-right: none; }
        tbody tr:last-child td{ border-bottom: none; }

        /* 모바일 최적화 */
        @media (max-width: 480px) {
          .ledger { font-size: 15px; }
          tbody td { padding-block: 8px; padding-inline: .8ch; }
        }

        /* 말풍선 스타일은 컴포넌트 내부에 정의됨 */
      `}</style>
    </div>
  );
}
