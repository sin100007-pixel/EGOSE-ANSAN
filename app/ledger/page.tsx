// app/ledger/page.tsx
import { cookies, headers } from "next/headers";

type Row = {
  tx_date: string;
  row_no: number | null;
  erp_customer_code: string | null;
  customer_name: string | null;
  item_name: string | null;
  spec: string | null;
  qty: number | null;
  unit_price: number | null;
  amount: number | null;
  prev_balance: number | null;
  deposit: number | null;
  curr_balance: number | null;
  memo: string | null;
  price?: number | null;
  debit?: number | null;
  balance?: number | null;
};

const fmt = (n: number | null | undefined) => (n == null ? "0" : n.toLocaleString());
const ymd = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

export default async function LedgerMyPage() {
  const sessionCookie = cookies().get("session_user");
  const sessionName = decodeURIComponent(sessionCookie?.value ?? "").trim();

  const today = new Date();
  const from = new Date();
  from.setMonth(from.getMonth() - 3);
  const date_from = ymd(from);
  const date_to = ymd(today);

  const h = headers();
  const proto = h.get("x-forwarded-proto") || "https";
  const host = h.get("x-forwarded-host") || h.get("host") || "";
  const base = `${proto}://${host}`;

  let rows: Row[] = [];
  let errorMsg = "";

  if (!sessionName) {
    errorMsg = "로그인 세션이 없습니다.";
  } else {
    const apiPath =
      `/api/ledger-search?order=excel&limit=2000` +
      `&date_from=${encodeURIComponent(date_from)}` +
      `&date_to=${encodeURIComponent(date_to)}` +
      `&q=${encodeURIComponent(sessionName)}`;

    try {
      const resp = await fetch(`${base}${apiPath}`, { cache: "no-store" });
      if (!resp.ok) {
        const t = await resp.text();
        errorMsg = `조회 실패: ${resp.status} ${t}`;
      } else {
        const json = await resp.json();
        rows = (json?.rows ?? []) as Row[];
      }
    } catch (e: any) {
      errorMsg = String(e?.message || e);
    }
  }

  return (
    <main className="p-6 text-white">
      <h1 className="text-3xl font-extrabold mb-4 text-center">내 거래 내역 (최근 3개월)</h1>

      <p className="mb-4 text-center">
        {sessionName ? `${sessionName} 님, 기간: ${date_from} ~ ${date_to}` : "로그인 필요"}
      </p>

      {errorMsg ? (
        <p className="text-red-400">{errorMsg}</p>
      ) : rows.length === 0 ? (
        <p className="text-center">최근 3개월 거래가 없습니다.</p>
      ) : (
        <div className="overflow-x-auto">
          {/* 표 전체에 흰색 가로/세로 선 + 중앙정렬 */}
          <table className="w-full text-sm border-collapse table-fixed">
            <thead className="bg-gray-900/50">
              <tr className="text-gray-100">
                {["일자", "품명", "수량", "단가", "공급가", "입금액", "잔액"].map((h) => (
                  <th
                    key={h}
                    className="px-3 py-2 text-center border border-white/40"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => {
                const isDeposit = r.item_name == null && (r.deposit ?? 0) > 0;
                const desc = isDeposit ? "입금" : r.item_name || r.memo || "";
                return (
                  <tr key={`${r.tx_date}-${i}`} className="odd:bg-gray-900/20">
                    <td className="px-3 py-2 text-center border border-white/20 whitespace-nowrap">
                      {r.tx_date}
                    </td>
                    <td className="px-3 py-2 text-center border border-white/20">
                      {desc}
                    </td>
                    <td className="px-3 py-2 text-center border border-white/20">
                      {!isDeposit ? (r.qty ?? "") : ""}
                    </td>
                    <td className="px-3 py-2 text-center border border-white/20">
                      {!isDeposit ? fmt(r.unit_price) : ""}
                    </td>
                    <td className="px-3 py-2 text-center border border-white/20">
                      {!isDeposit ? fmt(r.amount) : "0"}
                    </td>
                    <td className="px-3 py-2 text-center border border-white/20">
                      {fmt(r.deposit)}
                    </td>
                    <td className="px-3 py-2 text-center border border-white/20">
                      {fmt(r.curr_balance)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
