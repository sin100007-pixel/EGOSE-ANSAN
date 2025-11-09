"use client";

import React, { useEffect, useMemo, useState } from "react";

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

/** 7글자 초과 시 말줄임 */
const trim7 = (s: string) => (s?.length ?? 0) > 7 ? s.slice(0, 7) + "…" : (s || "");

/* ---------- 타입 ---------- */
type Row = {
  tx_date: string;
  item_name: string;
  qty: number | null;
  unit_price: number | null;
  amount: number | null;      // 공급가
  deposit: number | null;     // 입금액
  curr_balance: number | null;// 잔액
  memo?: string | null;
};
type ApiResp = { ok: boolean; rows?: Row[]; message?: string };

/* ---------- 인라인 팝오버( i 옆 ) ---------- */
const InlinePopover: React.FC<{
  anchorRef: React.RefObject<HTMLButtonElement | null>;
  title: string;
  content: string;
  onClose: () => void;
}> = ({ anchorRef, title, content, onClose }) => {
  const [style, setStyle] = useState<React.CSSProperties>({});

  useEffect(() => {
    const btn = anchorRef.current;
    if (!btn) return;

    const rect = btn.getBoundingClientRect();
    const pad = 8;
    const panelWidth = 320;
    const panelHeight = 200;

    // 기본: 오른쪽
    let left = rect.right + pad;
    let top = rect.top + rect.height / 2 - panelHeight / 2;

    // 우측 넘어가면 왼쪽
    if (left + panelWidth > window.innerWidth - 6) {
      left = rect.left - pad - panelWidth;
    }
    // 상하 보정
    if (top < 6) top = 6;
    if (top + panelHeight > window.innerHeight - 6) {
      top = window.innerHeight - panelHeight - 6;
    }

    setStyle({
      position: "fixed",
      left,
      top,
      width: panelWidth,
      height: panelHeight,
      zIndex: 999,
    });

    const onEsc = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    const onClickAway = (e: MouseEvent) => {
      const panel = document.getElementById("inline-popover-panel");
      if (
        panel &&
        !panel.contains(e.target as Node) &&
        !btn.contains(e.target as Node)
      ) {
        onClose();
      }
    };
    window.addEventListener("keydown", onEsc);
    window.addEventListener("mousedown", onClickAway);
    return () => {
      window.removeEventListener("keydown", onEsc);
      window.removeEventListener("mousedown", onClickAway);
    };
  }, [anchorRef, onClose]);

  return (
    <div
      id="inline-popover-panel"
      style={style}
      className="rounded-lg shadow-2xl border border-white/80 bg-[#0f1129] text-white overflow-hidden"
      onMouseDown={(e) => e.stopPropagation()}
    >
      <div className="px-3 py-2 flex items-center justify-between border-b border-white/80">
        <div className="font-semibold truncate pr-2">{title || "상세"}</div>
        <button
          className="px-2 py-0.5 border border-white rounded text-xs hover:bg-white hover:text-[#0b0d21] transition"
          onClick={onClose}
        >
          닫기
        </button>
      </div>
      <div className="p-3 text-sm leading-relaxed whitespace-pre-wrap break-words h-[calc(200px-40px)] overflow-auto">
        {content}
      </div>
    </div>
  );
};

/* ---------- 페이지 ---------- */
export default function LedgerPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  // 팝오버: 페이지에 하나만 렌더, 버튼 ref만 보관
  const [popover, setPopover] = useState<{
    open: boolean;
    title: string;
    content: string;
    anchor: React.RefObject<HTMLButtonElement | null> | null;
  }>({ open: false, title: "", content: "", anchor: null });

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
        if (ls) {
          setLoginName(ls);
          return;
        }
      } catch {}
      setLoginName("");
    };
    getName();
  }, []);

  // 데이터 로드
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

  const isDepositRow = (r: Row) =>
    (r.deposit ?? 0) > 0 && (r.amount ?? 0) === 0;

  return (
    <div className="ledger-wrap p-4 md:p-6 text-white" style={{ background: "#0b0d21" }}>
      <h1 className="text-[28px] md:text-[34px] font-extrabold mb-3">내 거래 내역 (최근 3개월)</h1>

      <div className="mb-4 text-white/80">
        <span className="mr-2">{loginName || "고객"} 님,</span>
        기간: <span className="font-semibold">{ymd(date_from)}</span> ~{" "}
        <span className="font-semibold">{ymd(date_to)}</span>
      </div>

      <div className="overflow-auto rounded-lg">
        <table className="ledger-table min-w-[1200px] w-full text-[15px] leading-tight">
          <thead className="bg-[#12132a]">
            <tr>
              <th style={{minWidth:96}}>일자</th>
              <th style={{minWidth:360}}>품명</th>
              <th style={{minWidth:96}}>수량</th>
              <th>단가</th>
              <th>공급가</th>
              <th>입금액</th>
              <th>잔액</th>
            </tr>
          </thead>

          <tbody>
            {loading ? (
              <tr><td className="py-4" colSpan={7}>불러오는 중…</td></tr>
            ) : err ? (
              <tr><td className="py-4 text-red-300" colSpan={7}>{err}</td></tr>
            ) : rows.length === 0 ? (
              <tr><td className="py-6 text-white/80" colSpan={7}>표시할 내역이 없습니다.</td></tr>
            ) : (
              rows.map((r, i) => {
                const shortName = trim7(r.item_name || "");
                const needInfo = (r.item_name?.length || 0) > 7 || (r.memo && r.memo.trim().length > 0);

                // 각 행마다 ref 생성 (상태에 보관해서 팝오버에서 사용)
                const btnRef = React.createRef<HTMLButtonElement>();

                return (
                  <tr key={`${r.tx_date}-${i}`} className="bg-[#0b0d21]">
                    <td>{r.tx_date?.slice(5)}</td>

                    <td>
                      <div className="inline-flex items-center justify-center gap-2 max-w-full">
                        <span className="truncate max-w-[260px]">{shortName}</span>
                        {needInfo && (
                          <button
                            ref={btnRef}
                            type="button"
                            onClick={() =>
                              setPopover({
                                open: true,
                                title: r.item_name || "",
                                content: (r.memo && r.memo.trim()) || r.item_name || "",
                                anchor: btnRef,
                              })
                            }
                            className="shrink-0 inline-flex items-center justify-center w-5 h-5 rounded-full border border-white text-[11px] hover:bg-white hover:text-[#0b0d21] transition"
                            title="상세 보기"
                            aria-label="상세 보기"
                          >i</button>
                        )}
                      </div>
                    </td>

                    <td>{!isDepositRow(r) ? (r.qty ?? "") : ""}</td>
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

      {/* 페이지에 단 하나의 팝오버만 렌더 */}
      {popover.open && popover.anchor && (
        <InlinePopover
          anchorRef={popover.anchor}
          title={popover.title}
          content={popover.content}
          onClose={() => setPopover({ open: false, title: "", content: "", anchor: null })}
        />
      )}

      {/* ✅ 표 전용(스코프) 1px 흰색 테두리 + 가운데정렬 + 좌우여백 2ch */}
      <style jsx>{`
        .ledger-table {
          border-collapse: collapse;
          width: 100%;
          table-layout: auto;
          border: 1px solid #ffffff;
          text-align: center;                 /* 전체 가운데 정렬 */
        }
        .ledger-table th,
        .ledger-table td {
          border: 1px solid #ffffff;
          padding-block: 10px;                /* 위/아래 */
          padding-inline: 2ch;                /* 좌우 여백 = 스페이스 2칸 정도 */
          vertical-align: middle;
          white-space: nowrap;
        }
        .ledger-table thead th {
          border-bottom: 1px solid #ffffff;
          font-weight: 700;
        }
        .ledger-table td:nth-child(2) > div > span.truncate {
          display: inline-block;
        }
        @media (max-width: 480px) {
          .ledger-table { min-width: 720px; }
        }
      `}</style>
    </div>
  );
}
