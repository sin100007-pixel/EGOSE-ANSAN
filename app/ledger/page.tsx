"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import BottomQuickNav from "@/app/components/BottomQuickNav";

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
function toKoreanDate(ymdValue: string): string {
  const safe = toYMD(ymdValue);
  if (!safe) return "";
  const [year, month, day] = safe.split("-");
  return `${year}년 ${month}월 ${day}일`;
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
const getDisplayItemName = (s: string) => {
  const raw = (s || "").trim();
  if (!raw) return "";

  // 표시 규칙
  // 1) 괄호/꺾쇠/대괄호가 나오면 그 앞까지만 표시
  // 2) 공백은 초반 코드 일부로 허용하되, 6번째 글자 이후(0-based index 5 이후) 나오는 첫 공백에서 잘라냄
  //    예) PX450 발렌무디크림 -> PX450
  //        GZX154 GZ807S -> GZX154
  //        HSM 29 매트포그그레이 -> HSM 29
  let cutIndex = raw.length;

  const specialIndexes = [raw.indexOf("("), raw.indexOf("["), raw.indexOf("<")].filter(
    (v) => v >= 0
  );
  if (specialIndexes.length) {
    cutIndex = Math.min(cutIndex, ...specialIndexes);
  }

  for (let i = 0; i < raw.length; i += 1) {
    if (/\s/.test(raw[i]) && i >= 5) {
      cutIndex = Math.min(cutIndex, i);
      break;
    }
  }

  const display = raw.slice(0, cutIndex).trim().replace(/[＊*]+$/g, "");
  return display || raw;
};
const trimDisplayName = (s: string) => {
  const display = getDisplayItemName(s);
  return (display?.length ?? 0) > 12 ? display.slice(0, 12) + "…" : display || "";
};

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

const cleanText = (value?: string | null) => (value || "").trim();

const getBubbleTitle = (row: Row) => {
  const directOriginal =
    cleanText((row as any).full_item_name) ||
    cleanText((row as any).item_name_full) ||
    cleanText((row as any).original_item_name) ||
    cleanText((row as any).raw_item_name);

  if (directOriginal) return directOriginal;

  const item = cleanText(row.item_name);
  return item || "상세";
};

const getBubbleContent = (row: Row) => cleanText(row.memo);

const shouldShowInfoButton = (row: Row) => {
  const item = cleanText(row.item_name);
  const title = getBubbleTitle(row);
  const memo = getBubbleContent(row);

  return !!memo || (!!title && title !== item) || trimDisplayName(item) !== item;
};

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
  const [productQuery, setProductQuery] = useState("");
  const [dateStart, setDateStart] = useState("");
  const [dateEnd, setDateEnd] = useState("");
  const [latestUploadedDate, setLatestUploadedDate] = useState("");
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const startDateInputRef = useRef<HTMLInputElement | null>(null);
  const endDateInputRef = useRef<HTMLInputElement | null>(null);

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
    const fetchLatestUploadedDate = async () => {
      try {
        const r = await fetch("/api/ledger-search?limit=1", { cache: "no-store" });
        const data: ApiResp = await r.json();
        if (!data.ok) throw new Error(data.message || "최신 업데이트 조회 실패");

        const latestRow = data.rows?.[0];
        const latestDate =
          toYMD(latestRow?.tx_date) ||
          toYMD((latestRow as any)?.date) ||
          toYMD((latestRow as any)?.["일자"]) ||
          toYMD((latestRow as any)?.["날짜"]);

        setLatestUploadedDate(latestDate || "");
      } catch {
        setLatestUploadedDate("");
      }
    };

    fetchLatestUploadedDate();
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

  const normalizeText = (value: string) => value.replace(/\s+/g, "").toLowerCase();

  const normalizedRange = useMemo(() => {
    if (!dateStart && !dateEnd) return { start: "", end: "" };
    if (dateStart && dateEnd) {
      return dateStart <= dateEnd
        ? { start: dateStart, end: dateEnd }
        : { start: dateEnd, end: dateStart };
    }
    const singleDate = dateStart || dateEnd;
    return { start: singleDate, end: singleDate };
  }, [dateStart, dateEnd]);

  const filteredRows = useMemo(() => {
    const keyword = normalizeText(productQuery.trim());

    return rows.filter((r) => {
      const rowDate =
        toYMD(r.tx_date) ||
        toYMD((r as any).date) ||
        toYMD((r as any)["일자"]) ||
        toYMD((r as any)["날짜"]);

      const matchesDate =
        !normalizedRange.start ||
        (rowDate >= normalizedRange.start && rowDate <= normalizedRange.end);
      if (!matchesDate) return false;

      if (!keyword) return true;

      const target = normalizeText(`${r.item_name || ""} ${(r.memo || "") as string}`);
      return target.includes(keyword);
    });
  }, [rows, productQuery, normalizedRange]);

  const hasActiveFilters = !!(productQuery.trim() || dateStart || dateEnd);

  const filterSummary = useMemo(() => {
    const parts: string[] = [];
    const keyword = productQuery.trim();
    if (keyword) parts.push(`검색: ${keyword}`);
    if (normalizedRange.start && normalizedRange.end) {
      parts.push(
        normalizedRange.start === normalizedRange.end
          ? `${normalizedRange.start}`
          : `${normalizedRange.start} ~ ${normalizedRange.end}`
      );
    }
    return parts.join(" · ");
  }, [productQuery, normalizedRange]);

  const openDatePicker = (ref: React.RefObject<HTMLInputElement | null>) => {
    const input = ref.current;
    if (!input) return;

    try {
      if (typeof (input as HTMLInputElement & { showPicker?: () => void }).showPicker === "function") {
        (input as HTMLInputElement & { showPicker?: () => void }).showPicker?.();
        return;
      }
    } catch {}

    input.focus();
    input.click();
  };

  const setDatePreset = (preset: "7d" | "30d" | "month" | "all") => {
    if (preset === "all") {
      setDateStart("");
      setDateEnd("");
      return;
    }

    const end = new Date(date_to);
    let start = new Date(date_to);

    if (preset === "7d") start.setDate(start.getDate() - 6);
    if (preset === "30d") start.setDate(start.getDate() - 29);
    if (preset === "month") start = new Date(end.getFullYear(), end.getMonth(), 1);

    if (start.getTime() < date_from.getTime()) start = new Date(date_from);

    setDateStart(ymd(start));
    setDateEnd(ymd(end));
  };

  const isDepositRow = (r: Row) => (r.deposit ?? 0) > 0 && (r.amount ?? 0) === 0;

  return (
    <div className="wrap p-4 md:p-6 text-white" style={{ background: "#0b0d21", fontSize: 16, paddingBottom: 180 }}>
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
          조회기간: <span className="strong">{ymd(date_from)}</span> ~{" "}
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

        <div className={`filter-box ${isFilterOpen ? "is-open" : "is-collapsed"}`}>
          {latestUploadedDate ? (
            <div className="update-banner">{toKoreanDate(latestUploadedDate)} 까지 업데이트 완료!</div>
          ) : null}

          <button
            type="button"
            className="filter-toggle"
            onClick={() => setIsFilterOpen((prev) => !prev)}
            aria-expanded={isFilterOpen}
            aria-controls="ledger-filter-panel"
          >
            <span className="filter-toggle-copy">
              <span className="filter-toggle-title">검색 / 기간 필터</span>
              <span className={`filter-toggle-summary ${hasActiveFilters ? "is-active" : ""}`}>
                {hasActiveFilters ? filterSummary : "눌러서 펼치기"}
              </span>
            </span>
            <span className={`filter-toggle-icon ${isFilterOpen ? "is-open" : ""}`} aria-hidden="true">⌄</span>
          </button>

          {isFilterOpen ? (
            <div id="ledger-filter-panel" className="filter-panel">
              <div className="filter-grid">
                <label className="filter-field filter-field-search">
                  <span className="filter-label">제품명 검색</span>
                  <input
                    type="text"
                    value={productQuery}
                    onChange={(e) => setProductQuery(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        (e.currentTarget as HTMLInputElement).blur();
                      }
                    }}
                    enterKeyHint="go"
                    placeholder="제품명 입력"
                    className="filter-input"
                  />
                </label>

                <div className="filter-field filter-field-date">
                  <div className="filter-label-row">
                    <span className="filter-label">기간 지정</span>
                    <span className="filter-help">누르면 달력이 열립니다</span>
                  </div>

                  <div className="date-range-grid">
                    <div className="date-picker-card">
                      <span className="date-chip-label">시작일</span>
                      <button
                        type="button"
                        className="date-picker-btn"
                        onClick={() => openDatePicker(startDateInputRef)}
                        aria-label="시작일 선택"
                      >
                        <span>{dateStart || "시작일 선택"}</span>
                        <span className="date-picker-icon" aria-hidden="true">📅</span>
                      </button>
                      <input
                        ref={startDateInputRef}
                        type="date"
                        value={dateStart}
                        min={ymd(date_from)}
                        max={ymd(date_to)}
                        onChange={(e) => setDateStart(e.target.value)}
                        className="sr-only-date-input"
                        tabIndex={-1}
                        aria-hidden="true"
                      />
                    </div>

                    <div className="date-picker-card">
                      <span className="date-chip-label">종료일</span>
                      <button
                        type="button"
                        className="date-picker-btn"
                        onClick={() => openDatePicker(endDateInputRef)}
                        aria-label="종료일 선택"
                      >
                        <span>{dateEnd || "종료일 선택"}</span>
                        <span className="date-picker-icon" aria-hidden="true">📅</span>
                      </button>
                      <input
                        ref={endDateInputRef}
                        type="date"
                        value={dateEnd}
                        min={ymd(date_from)}
                        max={ymd(date_to)}
                        onChange={(e) => setDateEnd(e.target.value)}
                        className="sr-only-date-input"
                        tabIndex={-1}
                        aria-hidden="true"
                      />
                    </div>
                  </div>

                  <div className="preset-row" aria-label="빠른 기간 선택">
                    <button type="button" className="preset-btn" onClick={() => setDatePreset("7d")}>최근 7일</button>
                    <button type="button" className="preset-btn" onClick={() => setDatePreset("30d")}>최근 30일</button>
                    <button type="button" className="preset-btn" onClick={() => setDatePreset("month")}>이번달</button>
                    <button type="button" className="preset-btn" onClick={() => setDatePreset("all")}>전체</button>
                  </div>
                </div>
              </div>

              <div className="filter-actions">
                <button
                  type="button"
                  className="filter-reset"
                  onClick={() => {
                    setProductQuery("");
                    setDateStart("");
                    setDateEnd("");
                  }}
                >
                  필터 초기화
                </button>
                <span className="filter-result">표시 건수: {filteredRows.length}건</span>
              </div>
            </div>
          ) : (
            <div className="filter-collapsed-bar">
              <span className="filter-result">표시 건수: {filteredRows.length}건</span>
            </div>
          )}
        </div>
      </div>

      {/* 내부 스크롤 뷰포트 */}
      <div className={`scroll-viewport ${isFilterOpen ? "filters-open" : "filters-closed"}`}>
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
              ) : filteredRows.length === 0 ? (
                <tr>
                  <td className="py-5 text-white/80" colSpan={7}>
                    표시할 내역이 없습니다.
                  </td>
                </tr>
              ) : (
                filteredRows.map((r, i) => {
                  // 날짜 경계(굵은 선) 판단
                  const curYMD =
                    toYMD(r.tx_date) ||
                    toYMD((r as any).date) ||
                    toYMD((r as any)["일자"]) ||
                    toYMD((r as any)["날짜"]);
                  const prevYMD =
                    i > 0
                      ? toYMD(filteredRows[i - 1].tx_date) ||
                        toYMD((filteredRows[i - 1] as any).date) ||
                        toYMD((filteredRows[i - 1] as any)["일자"]) ||
                        toYMD((filteredRows[i - 1] as any)["날짜"])
                      : "";
                  const isDateBreak = i === 0 || curYMD !== prevYMD;

                  const rawItemName = (r.item_name || "").trim();
                  const displayName = getDisplayItemName(rawItemName);
                  const shortName = trimDisplayName(rawItemName);
                  const bubbleTitle = getBubbleTitle(r);
                  const bubbleContent = getBubbleContent(r);
                  const needInfo = shouldShowInfoButton(r);
                  const rowId = `${curYMD}-${rawItemName}-${i}`;

                  return (
                    <tr key={rowId} className={isDateBreak ? "dateBreak" : ""}>
                      <td className="col-date">{toMMDD(curYMD)}</td>
                      <td className="col-name">
                        <div className="name-wrap">
                          <span className="name-text" title={displayName || ""}>
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
                                  title: bubbleTitle || displayName || "상세",
                                  content: bubbleContent || "",
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

        .filter-box {
          margin-top: 10px;
          padding: 10px;
          border: 1px solid rgba(255, 255, 255, 0.2);
          border-radius: 12px;
          background: rgba(255, 255, 255, 0.05);
          backdrop-filter: blur(6px);
        }
        .filter-toggle {
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          padding: 10px 12px;
          border-radius: 12px;
          border: 1px solid rgba(255, 255, 255, 0.18);
          background: rgba(10, 14, 42, 0.72);
          color: #fff;
          text-align: left;
          box-shadow: inset 0 1px 0 rgba(255,255,255,0.04);
        }
        .filter-toggle-copy {
          display: flex;
          flex-direction: column;
          gap: 2px;
          min-width: 0;
        }
        .filter-toggle-title {
          font-size: 13px;
          font-weight: 800;
          color: #fff;
        }
        .filter-toggle-summary {
          font-size: 11px;
          font-weight: 600;
          color: rgba(255, 255, 255, 0.66);
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .filter-toggle-summary.is-active {
          color: #dbeafe;
        }
        .filter-toggle-icon {
          flex: 0 0 auto;
          font-size: 20px;
          line-height: 1;
          opacity: 0.88;
          transform: rotate(0deg);
          transition: transform 0.18s ease;
        }
        .filter-toggle-icon.is-open {
          transform: rotate(180deg);
        }
        .filter-panel {
          margin-top: 12px;
        }
        .filter-collapsed-bar {
          margin-top: 10px;
          display: flex;
          justify-content: flex-end;
        }
        .update-banner {
          margin-bottom: 10px;
          padding: 10px 12px;
          border-radius: 12px;
          border: 1px solid rgba(110, 231, 183, 0.32);
          background: rgba(16, 185, 129, 0.12);
          color: #d1fae5;
          font-size: 13px;
          font-weight: 800;
          line-height: 1.35;
          box-shadow: inset 0 1px 0 rgba(255,255,255,0.04);
        }
        .filter-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 12px;
        }
        .filter-field {
          display: flex;
          flex-direction: column;
          gap: 5px;
          min-width: 0;
        }
        .filter-field-search {
          max-width: calc(50% - 5px);
        }
        .filter-field-date {
          gap: 8px;
          padding-top: 2px;
        }
        .filter-label-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
          flex-wrap: wrap;
        }
        .filter-label {
          font-size: 12px;
          font-weight: 700;
          color: rgba(255, 255, 255, 0.85);
        }
        .filter-help {
          font-size: 11px;
          color: rgba(255, 255, 255, 0.66);
        }
        .date-range-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 10px;
        }
        .date-picker-card {
          position: relative;
          display: flex;
          flex-direction: column;
          gap: 6px;
          min-width: 0;
        }
        .date-chip-label {
          font-size: 11px;
          font-weight: 700;
          color: rgba(255, 255, 255, 0.72);
        }
        .date-picker-btn {
          width: 100%;
          min-height: 46px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          padding: 0 14px;
          border-radius: 12px;
          border: 1px solid rgba(255, 255, 255, 0.28);
          background: rgba(11, 13, 33, 0.92);
          color: #fff;
          font-size: 14px;
          text-align: left;
          box-shadow: inset 0 1px 0 rgba(255,255,255,0.04);
        }
        .date-picker-btn:hover {
          border-color: rgba(140, 170, 255, 0.8);
        }
        .date-picker-btn:focus {
          border-color: rgba(140, 170, 255, 0.95);
          box-shadow: 0 0 0 3px rgba(23, 57, 247, 0.18);
          outline: none;
        }
        .date-picker-icon {
          font-size: 16px;
          line-height: 1;
          opacity: 0.92;
          flex: 0 0 auto;
        }
        .sr-only-date-input {
          position: absolute;
          width: 1px;
          height: 1px;
          padding: 0;
          margin: -1px;
          overflow: hidden;
          clip: rect(0, 0, 0, 0);
          white-space: nowrap;
          border: 0;
          opacity: 0;
          pointer-events: none;
        }
        .preset-row {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }
        .preset-btn {
          min-height: 38px;
          padding: 0 12px;
          border-radius: 999px;
          border: 1px solid rgba(255, 255, 255, 0.24);
          background: rgba(255, 255, 255, 0.08);
          color: #fff;
          font-size: 12px;
          font-weight: 700;
          white-space: nowrap;
        }
        .preset-btn:hover {
          background: rgba(255, 255, 255, 0.16);
        }
        .filter-input {
          width: 100%;
          max-width: 100%;
          min-height: 46px;
          display: block;
          box-sizing: border-box;
          border-radius: 12px;
          border: 1px solid rgba(255, 255, 255, 0.28);
          background: rgba(11, 13, 33, 0.92);
          color: #fff;
          padding: 0 14px;
          outline: none;
          font-size: 14px;
          box-shadow: inset 0 1px 0 rgba(255,255,255,0.04);
        }
        .filter-input:focus {
          border-color: rgba(140, 170, 255, 0.95);
          box-shadow: 0 0 0 3px rgba(23, 57, 247, 0.18);
        }
        .filter-actions {
          margin-top: 12px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          flex-wrap: wrap;
        }
        .filter-reset {
          height: 36px;
          padding: 0 12px;
          border-radius: 10px;
          border: 1px solid rgba(255, 255, 255, 0.28);
          background: #1739f7;
          color: #fff;
          font-size: 13px;
          font-weight: 700;
        }
        .filter-reset:hover {
          background: #0e2fe9;
        }
        .filter-result {
          font-size: 12px;
          font-weight: 700;
          color: rgba(255, 255, 255, 0.8);
        }

        /* 내부 스크롤 */
        .scroll-viewport {
          min-height: 320px;
          overflow: auto;
          -webkit-overflow-scrolling: touch;
          background: rgba(255, 255, 255, 0.02);
        }
        .scroll-viewport.filters-open {
          height: calc(100vh - 345px);
        }
        .scroll-viewport.filters-closed {
          height: calc(100vh - 235px);
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
          min-width: 210px;
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
          max-width: 20ch;
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
          .filter-grid {
            grid-template-columns: 1fr;
          }
          .filter-field-search {
            max-width: 100%;
          }
          .date-range-grid {
            grid-template-columns: 1fr;
          }
          .preset-row {
            gap: 6px;
          }
          .preset-btn {
            flex: 1 1 calc(50% - 6px);
            min-height: 40px;
            padding: 0 10px;
          }
          .filter-box {
            padding: 9px;
          }
          .filter-toggle {
            padding: 9px 10px;
          }
          .filter-toggle-title {
            font-size: 12px;
          }
          .filter-toggle-summary {
            font-size: 10px;
          }
          .update-banner {
            padding: 9px 10px;
            font-size: 12px;
          }
          .filter-input {
            height: 42px;
            font-size: 14px;
          }
          .date-picker-btn {
            min-height: 44px;
            font-size: 14px;
            padding: 0 12px;
          }
          .filter-actions {
            align-items: stretch;
          }
          .filter-reset {
            width: 100%;
            min-height: 42px;
          }
          .filter-result {
            width: 100%;
          }
          .col-date { min-width: 60px; }
          .col-name { min-width: 160px; }
          .col-qty  { min-width: 54px; }
          .name-text { max-width: 16ch; }
          .scroll-viewport.filters-open { height: calc(100vh - 445px); }
          .scroll-viewport.filters-closed { height: calc(100vh - 305px); }
        }
      `}</style>
      <BottomQuickNav current="ledger" />
    </div>
  );
}
