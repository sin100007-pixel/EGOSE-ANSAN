// app/admin/ledger/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import DangerZone from "./DangerZone";

/* 숫자 파싱(콤마/공백 제거) */
function toNum(v: any): number | null {
  if (v === null || v === undefined || v === "") return null;
  const s = String(v).replace(/[, ]+/g, "");
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

/* 여러 후보 키 중 첫 값을 '문자열'로 반환 */
function pickStr(obj: any, keys: string[]): string | null {
  for (const k of keys) {
    const parts = k.split(".");
    let cur: any = obj;
    let ok = true;
    for (const p of parts) {
      if (cur && Object.prototype.hasOwnProperty.call(cur, p)) cur = cur[p];
      else { ok = false; break; }
    }
    if (ok && cur !== undefined && cur !== null) {
      const s = String(cur).trim();
      if (s.length) return s;
    }
  }
  return null;
}

/* 여러 후보 키 중 첫 값을 '숫자'로 반환 */
function pickNum(obj: any, keys: string[]): number | null {
  for (const k of keys) {
    const parts = k.split(".");
    let cur: any = obj;
    let ok = true;
    for (const p of parts) {
      if (cur && Object.prototype.hasOwnProperty.call(cur, p)) cur = cur[p];
      else { ok = false; break; }
    }
    if (!ok) continue;
    const n = toNum(cur);
    if (n !== null) return n;
  }
  return null;
}

type Row = {
  tx_date: string;
  erp_customer_code: string | null; // 코드(표시 안 함)
  customer_name: string | null;     // 거래처명
  item_name: string | null;         // 품명
  spec: string | null;              // 규격
  unit: string | null;              // 단위
  qty: number | null;               // 수량
  price: number | null;             // 단가
  debit: number | null;             // 매출금액
  prev_balance: number | null;      // 전일잔액
  deposit: number | null;           // 입금액
  balance: number | null;           // 금일잔액
  remark: string | null;            // 비고
  profit_loss: number | null;       // 손익
  doc_no: string | null;
  line_no: string | number | null;
  erp_row_key: string;
};

export default function LedgerDashboardPage() {
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, "0");
  const dd = String(today.getDate()).padStart(2, "0");

  const [dateFrom, setDateFrom] = useState<string>(`${yyyy}-${mm}-01`);
  const [dateTo, setDateTo] = useState<string>(`${yyyy}-${mm}-${dd}`);
  const [q, setQ] = useState<string>("");
  const [page, setPage] = useState<number>(1);
  const [limit, setLimit] = useState<number>(50);
  const [loading, setLoading] = useState<boolean>(false);

  const [rows, setRows] = useState<Row[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [sum, setSum] = useState<{ debit: number; credit: number; balance: number }>({ debit: 0, credit: 0, balance: 0 });

  const pages = useMemo(() => Math.max(1, Math.ceil(total / limit)), [total, limit]);

  const fmt = (n?: number | null) =>
    n === null || n === undefined ? "" : Number(n).toLocaleString("ko-KR");
  const isNeg = (n?: number | null) => (n ?? 0) < 0 ? "text-red-400" : undefined;

  const fetchData = async (goPage = page) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        date_from: dateFrom || "",
        date_to: dateTo || "",
        q,
        page: String(goPage),
        limit: String(limit),
      });
      const res = await fetch(`/api/ledger-search?${params.toString()}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "조회 실패");

      const normalized: Row[] = (json.rows || []).map((r: any) => {
        const qty = pickNum(r, ["qty", "quantity", "수량"]);
        const price = pickNum(
          r,
          ["price", "unit_price", "unitPrice", "unitprice", "판매단가", "매출단가", "단가", "data.unit_price"]
        );
        const debit = pickNum(
          r,
          ["debit", "amount", "sales_amount", "salesAmount", "공급가액", "매출금액", "판매금액", "data.amount"]
        );
        const prev_balance = pickNum(r, ["prev_balance", "prevBalance", "전일잔액", "이월", "previous_balance"]);
        const deposit = pickNum(r, ["deposit", "입금액", "입금", "credit"]);
        const balance = pickNum(r, ["balance", "curr_balance", "금일잔액", "현재잔액"]);

        return {
          tx_date: pickStr(r, ["tx_date", "date", "일자", "기준일"]) || "",
          erp_customer_code: pickStr(r, ["erp_customer_code", "code", "거래처코드", "코드"]),
          customer_name: pickStr(r, ["customer_name", "name", "거래처", "거래처명"]),
          item_name: pickStr(r, ["item_name", "품명", "item", "product"]),
          spec: pickStr(r, ["spec", "규격"]),
          unit: pickStr(r, ["unit", "단위"]),
          qty,
          price,
          debit,
          prev_balance,
          deposit,
          balance,
          remark: pickStr(r, ["remark", "memo", "비고"]),
          profit_loss: pickNum(r, ["profit_loss", "손익"]),
          doc_no: pickStr(r, ["doc_no", "전표번호"]),
          line_no: pickStr(r, ["line_no", "라인"]),
          erp_row_key: pickStr(r, ["erp_row_key"]) || `${Math.random()}`,
        };
      });

      setRows(normalized);
      setTotal(json.total || 0);
      setSum({
        debit: toNum(json?.sum?.debit) ?? 0,
        credit: toNum(json?.sum?.credit) ?? 0,
        balance: toNum(json?.sum?.balance) ?? 0,
      });
      setPage(goPage);
    } catch (e: any) {
      alert(e?.message || String(e));
    } finally {
      setLoading(false);
    }
  };

  const exportCSV = () => {
    const p = new URLSearchParams({
      date_from: dateFrom,
      date_to: dateTo,
      q,
      page: "1",
      limit: String(limit),
      format: "csv",
    });
    window.location.href = `/api/ledger-search?${p.toString()}`;
  };

  useEffect(() => { fetchData(1); }, []);

  const displayRows = useMemo(() => {
    type T = Row & { _display_name: string | null; _display_price: number | null; _display_debit: number | null; };
    const out: T[] = [];
    let lastName: string | null = null;

    for (const r of rows) {
      if ((r.customer_name ?? "").trim().startsWith("소계")) continue;

      const rawName = (r.customer_name ?? "").trim() || null;
      const displayName: string | null = (!rawName && lastName) ? lastName : rawName;
      if (displayName) lastName = displayName;

      let showPrice: number | null = r.price ?? null;
      let showDebit: number | null = r.debit ?? null;
      const qty = r.qty ?? null;

      if ((showPrice == null) && qty && r.debit != null) {
        const p = (r.debit as number) / qty;
        if (Number.isFinite(p)) showPrice = Math.round(p);
      }
      if ((showDebit == null) && qty != null && r.price != null) {
        const d = qty * (r.price as number);
        if (Number.isFinite(d)) showDebit = Math.round(d);
      }

      out.push({
        ...r,
        _display_name: displayName,
        _display_price: showPrice ?? null,
        _display_debit: showDebit ?? null,
      });
    }
    return out;
  }, [rows]);

  return (
    <div className="mx-auto max-w-7xl p-4 text-white">
      <h1 className="text-2xl font-bold mb-4">잔액 합계표</h1>

      {/* 검색 */}
      <div className="grid grid-cols-1 md:grid-cols-6 gap-2 items-end mb-3">
        <div className="md:col-span-2">
          <label className="block text-sm opacity-80">시작일</label>
          <input type="date" value={dateFrom} onChange={e=>setDateFrom(e.target.value)} className="w-full rounded-md px-3 py-2 text-black"/>
        </div>
        <div className="md:col-span-2">
          <label className="block text-sm opacity-80">종료일</label>
          <input type="date" value={dateTo} onChange={e=>setDateTo(e.target.value)} className="w-full rounded-md px-3 py-2 text-black"/>
        </div>
        <div className="md:col-span-2">
          <label className="block text-sm opacity-80">검색어(거래처/전표/품명)</label>
          <input value={q} onChange={e=>setQ(e.target.value)} className="w-full rounded-md px-3 py-2 text-black" placeholder="예: 고동희, PS010, GSPW15 ..." />
        </div>
        <div className="md:col-span-6 flex gap-2">
          <button onClick={()=>fetchData(1)} className="rounded-md bg-blue-600 hover:bg-blue-700 px-4 py-2 font-semibold" disabled={loading}>
            {loading ? "조회 중..." : "조회"}
          </button>
          <button onClick={exportCSV} className="rounded-md bg-emerald-600 hover:bg-emerald-700 px-4 py-2 font-semibold">
            CSV 다운로드
          </button>
          <div className="ml-auto flex items-center gap-2">
            <span className="opacity-80 text-sm">행/페이지</span>
            <select value={limit} onChange={e=>setLimit(Number(e.target.value))} className="rounded-md px-2 py-1 text-black">
              {[25,50,100,200].map(n=> <option key={n} value={n}>{n}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* 합계 */}
      <div className="rounded-lg bg-white/5 border border-white/10 p-3 mb-3 text-sm">
        <div className="flex flex-wrap gap-6">
          <div><span className="opacity-70 mr-2">총 건수</span><b>{total.toLocaleString()}건</b></div>
          <div><span className="opacity-70 mr-2">매출금액 합계</span><b>{fmt(sum.debit)}원</b></div>
          <div><span className="opacity-70 mr-2">부가세 합계</span><b>{fmt(sum.credit)}원</b></div>
          <div><span className="opacity-70 mr-2">금일잔액 합계</span><b>{fmt(sum.balance)}원</b></div>
        </div>
      </div>

      {/* 테이블 */}
      <div className="overflow-auto rounded-lg border border-white/10">
        <table className="min-w-full text-sm">
          <thead className="bg-white/10 sticky top-0">
            <tr>
              <th className="px-3 py-2 text-left">일자</th>
              <th className="px-3 py-2 text-left">고객명</th>
              <th className="px-3 py-2 text-left">품명</th>
              <th className="px-3 py-2 text-left">규격</th>
              <th className="px-3 py-2 text-right">수량</th>
              <th className="px-3 py-2 text-right">단가</th>
              <th className="px-3 py-2 text-right">매출금액</th>
              <th className="px-3 py-2 text-right">전일잔액</th>
              <th className="px-3 py-2 text-right">입금액</th>
              <th className="px-3 py-2 text-right">금일잔액</th>
              <th className="px-3 py-2 text-left">비고</th>
            </tr>
          </thead>
          <tbody>
            {displayRows.length === 0 && (
              <tr>
                <td className="px-3 py-6 text-center opacity-70" colSpan={11}>
                  데이터가 없습니다.
                </td>
              </tr>
            )}

            {displayRows.map((r) => {
              const ymd = (r.tx_date && String(r.tx_date).slice(0,10)) || "";
              const mmdd = ymd ? ymd.slice(5) : "";
              return (
                <tr key={r.erp_row_key} className="odd:bg-white/0 even:bg-white/5 align-top">
                  <td className="px-3 py-2 whitespace-nowrap">{mmdd}</td>
                  <td className="px-3 py-2">{r._display_name || ""}</td>
                  <td className="px-3 py-2">{r.item_name || ""}</td>
                  <td className="px-3 py-2">{r.spec || ""}</td>
                  <td className={`px-3 py-2 text-right ${isNeg(r.qty)}`}>{fmt(r.qty)}</td>
                  <td className={`px-3 py-2 text-right ${isNeg(r._display_price)}`}>{fmt(r._display_price)}</td>
                  <td className={`px-3 py-2 text-right ${isNeg(r._display_debit)}`}>{fmt(r._display_debit)}</td>
                  <td className={`px-3 py-2 text-right ${isNeg(r.prev_balance)}`}>{fmt(r.prev_balance)}</td>
                  <td className={`px-3 py-2 text-right ${isNeg(r.deposit)}`}>{fmt(r.deposit)}</td>
                  <td className={`px-3 py-2 text-right ${isNeg(r.balance)}`}>{fmt(r.balance)}</td>
                  <td className="px-3 py-2">{r.remark || ""}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* 페이지네이션 */}
      <div className="mt-3 flex items-center gap-2">
        <button
          onClick={() => fetchData(Math.max(1, page - 1))}
          disabled={page <= 1 || loading}
          className="rounded-md bg-white/10 hover:bg-white/20 px-3 py-1 disabled:opacity-40"
        >
          이전
        </button>
        <span className="opacity-80 text-sm">{page} / {pages}</span>
        <button
          onClick={() => fetchData(Math.min(pages, page + 1))}
          disabled={page >= pages || loading}
          className="rounded-md bg-white/10 hover:bg-white/20 px-3 py-1 disabled:opacity-40"
        >
          다음
        </button>
        <div className="ml-auto opacity-70 text-xs">정렬: 일자 ↓, 전표↑, 라인↑ (API 내부)</div>
      </div>

      <DangerZone />
    </div>
  );
}
