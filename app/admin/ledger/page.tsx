"use client";

import { useEffect, useMemo, useState } from "react";
import DangerZone from "./DangerZone";

/** 유틸: 숫자 파싱(콤마/공백 제거) */
function toNum(v: any): number | null {
  if (v === null || v === undefined || v === "") return null;
  const s = String(v).replace(/[, ]+/g, "");
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

/** 유틸: 여러 후보 키 중 첫 값 반환 */
function pick<T = any>(obj: any, keys: string[], map?: (x: any) => T): T | null {
  for (const k of keys) {
    if (obj && Object.prototype.hasOwnProperty.call(obj, k)) {
      const val = (obj as any)[k];
      return map ? map(val) : (val as T);
    }
    // 중첩 속성 지원 (예: data.unit_price)
    const parts = k.split(".");
    if (parts.length > 1) {
      let cur: any = obj;
      let ok = true;
      for (const p of parts) {
        if (cur && Object.prototype.hasOwnProperty.call(cur, p)) {
          cur = cur[p];
        } else {
          ok = false;
          break;
        }
      }
      if (ok) return map ? map(cur) : (cur as T);
    }
  }
  return null;
}

type Row = {
  tx_date: string;

  // 코드/거래처
  erp_customer_code: string | null; // 코드
  customer_name: string | null;     // 거래처

  // 품목
  item_name: string | null;         // 품명
  spec: string | null;              // 규격
  unit: string | null;              // 단위

  // 수치 (화면은 price/debit 사용)
  qty: number | null;               // 수량
  price: number | null;             // 단가
  debit: number | null;             // 매출금액(공급가)
  prev_balance: number | null;      // 전일잔액
  deposit: number | null;           // 입금액
  balance: number | null;           // 금일잔액

  // 기타
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

  const [dateFrom, setDateFrom] = useState(`${yyyy}-${mm}-01`);
  const [dateTo, setDateTo] = useState(`${yyyy}-${mm}-${dd}`);
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(50);
  const [loading, setLoading] = useState(false);

  const [rows, setRows] = useState<Row[]>([]);
  const [total, setTotal] = useState(0);
  const [sum, setSum] = useState({ debit: 0, credit: 0, balance: 0 });

  const pages = useMemo(() => Math.max(1, Math.ceil(total / limit)), [total, limit]);

  const fmt = (n?: number | null) =>
    n === null || n === undefined ? "" : Number(n).toLocaleString("ko-KR");
  const isNeg = (n?: number | null) => (n ?? 0) < 0 ? "text-red-400" : undefined;
  const isUNK = (s?: string | null) => !!s && /^UNK-\d+$/i.test(s);

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

      // ★ A안 + 강화: 다양한 키/형태를 화면 표준(price/debit)으로 정규화
      const normalized: Row[] = (json.rows || []).map((r: any) => {
        const qty = pick<number>(r, ["qty", "quantity", "수량"], toNum);

        // 단가 후보: unit_price, unitPrice, unitprice, price, 판매단가, 매출단가, 단가
        const price = pick<number>(
          r,
          ["price", "unit_price", "unitPrice", "unitprice", "판매단가", "매출단가", "단가", "data.unit_price"],
          toNum
        );

        // 매출금액 후보: amount, debit, sales_amount, 공급가액, 매출금액, 판매금액
        const debit = pick<number>(
          r,
          ["debit", "amount", "sales_amount", "salesAmount", "공급가액", "매출금액", "판매금액", "data.amount"],
          toNum
        );

        // 그 외 필드 매핑(가능한 폭넓게)
        const prev_balance = pick<number>(
          r,
          ["prev_balance", "prevBalance", "전일잔액", "이월", "previous_balance"],
          toNum
        );
        const deposit = pick<number>(r, ["deposit", "입금액", "입금", "credit"], toNum);
        const balance = pick<number>(r, ["balance", "curr_balance", "금일잔액", "현재잔액"], toNum);

        return {
          tx_date: pick<string>(r, ["tx_date", "date", "일자", "기준일"]) || "",
          erp_customer_code: pick<string>(r, ["erp_customer_code", "code", "거래처코드", "코드"]),
          customer_name: pick<string>(r, ["customer_name", "name", "거래처", "거래처명"]),
          item_name: pick<string>(r, ["item_name", "품명", "item", "product"]),
          spec: pick<string>(r, ["spec", "규격"]),
          unit: pick<string>(r, ["unit", "단위"]),
          qty,
          price,
          debit,
          prev_balance,
          deposit,
          balance,
          remark: pick<string>(r, ["remark", "memo", "비고"]),
          profit_loss: pick<number>(r, ["profit_loss", "손익"], toNum),
          doc_no: pick<string>(r, ["doc_no", "전표번호"]),
          line_no: pick<string | number>(r, ["line_no", "라인"]),
          erp_row_key: pick<string>(r, ["erp_row_key"]) || `${Math.random()}`,
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

  // === 표시용 보정 ===
  // 1) 거래처/코드 칸이 비거나 UNK-*면 직전 값 이어받기
  // 2) 단가/매출금액 표시 보정: price/debit이 없으면 qty와 다른 값을 이용해 계산
  const displayRows = useMemo(() => {
    const out: (Row & {
      _display_name: string | null;
      _display_code: string | null;
      _display_price: number | null;
      _display_debit: number | null;
    })[] = [];

    let lastName: string | null = null;
    let lastCode: string | null = null;

    for (const r of rows) {
      // 1) 고객명/코드 보정
      const rawName = (r.customer_name ?? "").trim() || null;
      const rawCode = (r.erp_customer_code ?? "").trim() || null;

      const name =
        (!rawName && lastName) ? lastName : rawName;
      const code =
        ((!rawCode || isUNK(rawCode)) && lastCode) ? lastCode : rawCode;

      if (name) lastName = name;
      if (code && !isUNK(code)) lastCode = code;

      // 2) 단가/매출금액 보정
      let showPrice: number | null = r.price ?? null;
      let showDebit: number | null = r.debit ?? null;
      const qty = r.qty ?? null;

      // price 없고 debit/qty 있으면 역산
      if ((showPrice === null || showPrice === undefined) && qty && r.debit != null) {
        const p = (r.debit as number) / qty;
        if (Number.isFinite(p)) showPrice = Math.round(p);
      }
      // debit 없고 qty/price 있으면 계산
      if ((showDebit === null || showDebit === undefined) && qty != null && r.price != null) {
        const d = qty * (r.price as number);
        if (Number.isFinite(d)) showDebit = Math.round(d);
      }

      out.push({
        ...r,
        _display_name: name,
        _display_code: code,
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
          <label className="block text-sm opacity-80">검색어(거래처/코드/전표/품명)</label>
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

      {/* 테이블: 요청하신 열만 표시 (거래처, 규격, 단위, 비고, 손익 제거) */}
      <div className="overflow-auto rounded-lg border border-white/10">
        <table className="min-w-full text-sm">
          <thead className="bg-white/10 sticky top-0">
            <tr>
              {/* <th className="px-3 py-2 text-left">거래처</th>  ← 제거 */}
              <th className="px-3 py-2 text-left">코드</th>
              <th className="px-3 py-2 text-left">품명</th>
              {/* <th className="px-3 py-2 text-left">규격</th> ← 제거 */}
              {/* <th className="px-3 py-2 text-left">단위</th> ← 제거 */}
              <th className="px-3 py-2 text-right">수량</th>
              <th className="px-3 py-2 text-right">단가</th>
              <th className="px-3 py-2 text-right">매출금액</th>
              <th className="px-3 py-2 text-right">전일잔액</th>
              <th className="px-3 py-2 text-right">입금액</th>
              <th className="px-3 py-2 text-right">금일잔액</th>
              {/* <th className="px-3 py-2 text-left">비고</th>  ← 제거 */}
              {/* <th className="px-3 py-2 text-right">손익</th> ← 제거 */}
            </tr>
          </thead>
          <tbody>
            {displayRows.length === 0 && (
              <tr>
                <td className="px-3 py-6 text-center opacity-70" colSpan={8}>
                  데이터가 없습니다.
                </td>
              </tr>
            )}

            {displayRows.map((r) => (
              <tr key={r.erp_row_key} className="odd:bg-white/0 even:bg-white/5">
                {/* 거래처 열은 제거했지만, 필요시 툴팁으로 확인 가능 */}
                {/* <td className="px-3 py-2">{r._display_name || ""}</td> */}
                <td className="px-3 py-2">{r._display_code || ""}</td>
                <td className="px-3 py-2">
                  {r.item_name || ""}
                  {/* 거래처명을 작은 회색으로 보이고 싶다면 아래 주석 해제
                  <div className="text-xs opacity-60">{r._display_name || ""}</div>
                  */}
                </td>
                {/* <td className="px-3 py-2">{r.spec || ""}</td> */}
                {/* <td className="px-3 py-2">{r.unit || ""}</td> */}
                <td className={`px-3 py-2 text-right ${isNeg(r.qty)}`}>{fmt(r.qty)}</td>
                <td className={`px-3 py-2 text-right ${isNeg(r._display_price)}`}>{fmt(r._display_price)}</td>
                <td className={`px-3 py-2 text-right ${isNeg(r._display_debit)}`}>{fmt(r._display_debit)}</td>
                <td className={`px-3 py-2 text-right ${isNeg(r.prev_balance)}`}>{fmt(r.prev_balance)}</td>
                <td className={`px-3 py-2 text-right ${isNeg(r.deposit)}`}>{fmt(r.deposit)}</td>
                <td className={`px-3 py-2 text-right ${isNeg(r.balance)}`}>{fmt(r.balance)}</td>
                {/* <td className="px-3 py-2">{r.remark ?? ""}</td> */}
                {/* <td className={`px-3 py-2 text-right ${isNeg(r.profit_loss)}`}>{fmt(r.profit_loss)}</td> */}
              </tr>
            ))}
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

      {/* 삭제 섹션 */}
      <DangerZone />
    </div>
  );
}
