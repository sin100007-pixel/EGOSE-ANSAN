import type { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false } }
  );

  const { date_from, date_to, q = "", page = "1", limit = "50", format } = req.query as any;
  const p = Math.max(1, Number(page));
  const l = Math.max(1, Math.min(500, Number(limit)));
  const from = (p - 1) * l;
  const to = from + l - 1;

  let qb = supabase
    .from("ledger_entries")
    .select(
      "tx_date, erp_customer_code, customer_name, item_name, spec, unit, qty, price, debit, prev_balance, deposit, balance, remark, profit_loss, doc_no, line_no, erp_row_key",
      { count: "exact" }
    );

  if (date_from) qb = qb.gte("tx_date", date_from);
  if (date_to)   qb = qb.lte("tx_date", date_to);

  if (q) {
    qb = qb.or(
      [
        `customer_name.ilike.%${q}%`,
        `erp_customer_code.ilike.%${q}%`,
        `item_name.ilike.%${q}%`,
        `spec.ilike.%${q}%`,
        `remark.ilike.%${q}%`,
        `doc_no.ilike.%${q}%`,
      ].join(",")
    );
  }

  qb = qb.order("tx_date", { ascending: true })
         .order("doc_no", { ascending: true, nullsFirst: true })
         .order("line_no", { ascending: true, nullsFirst: true })
         .range(from, to);

  const { data, error, count } = await qb;
  if (error) return res.status(400).json({ error: error.message });

  // 합계 (페이지 합계가 아니라 기간 전체 합계가 필요하면 별도 쿼리)
  const sum = {
    debit:   (data || []).reduce((a, r: any) => a + (Number(r.debit   || 0)), 0),
    credit:  0, // 부가세를 별도로 쓰지 않는 화면이므로 0
    balance: (data || []).reduce((a, r: any) => a + (Number(r.balance || 0)), 0),
  };

  // CSV
  if (format === "csv") {
    const header = [
      "거래처","코드","품명","규격","단위","수량","단가","매출금액",
      "전일잔액","입금액","금일잔액","비고","손익","일자","전표","라인"
    ];
    const rows = (data || []).map((r: any) => [
      r.customer_name || "",
      r.erp_customer_code || "",
      r.item_name || "",
      r.spec || "",
      r.unit || "",
      r.qty ?? "",
      r.price ?? "",
      r.debit ?? "",
      r.prev_balance ?? "",
      r.deposit ?? "",
      r.balance ?? "",
      r.remark ?? "",         // 비고: 비어있으면 빈칸
      r.profit_loss ?? "",
      r.tx_date || "",
      r.doc_no || "",
      r.line_no || "",
    ]);
    const csv = [header, ...rows].map(a => a.join(",")).join("\r\n");
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename=ledger.csv`);
    return res.status(200).send(csv);
  }

  return res.status(200).json({ rows: data || [], total: count || 0, sum });
}
