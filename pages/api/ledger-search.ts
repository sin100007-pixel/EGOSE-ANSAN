// pages/api/ledger-search.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";

const S = (v: any) => (v == null ? "" : String(v).trim());
const N = (v: any): number | null => {
  const s = S(v).replace(/[, ]+/g, "");
  if (!s) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method Not Allowed" });

  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY! || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const date_from = S(req.query.date_from);
    const date_to = S(req.query.date_to);
    const q = S(req.query.q).toLowerCase();
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.max(1, Math.min(200, Number(req.query.limit) || 50));
    const offset = (page - 1) * limit;

    // 정렬 옵션: excel(기본) | default
    const orderMode = (S(req.query.order) || "excel").toLowerCase();

    // 필요한 컬럼들 + row_no 포함
    let query = supabase
      .from("ledger_entries")
      .select(
        [
          "erp_row_key",
          "tx_date",
          "row_no",                // ✅ 엑셀 원본 순서
          "erp_customer_code",
          "name",
          "item_name",
          "spec",
          "qty",
          "unit_price",
          "amount",
          "prev_balance",
          "deposit",
          "curr_balance",
          "memo",
        ].join(","),
        { count: "exact" }
      );

    // 기간
    if (date_from) query = query.gte("tx_date", date_from);
    if (date_to) query = query.lte("tx_date", date_to);

    // 검색
    if (q) {
      query = query.or(
        [
          `name.ilike.%${q}%`,
          `erp_customer_code.ilike.%${q}%`,
          `item_name.ilike.%${q}%`,
          `spec.ilike.%${q}%`,
        ].join(",")
      );
    }

    // 소계 제거
    query = query.not("name", "ilike", "소계%");

    // ✅ 정렬: 기본은 엑셀 순서(row_no ASC). 없으면 예전 로직.
    if (orderMode === "excel") {
      query = query.order("row_no", { ascending: true, nullsFirst: false });
    } else {
      query = query.order("tx_date", { ascending: true }).order("erp_row_key", { ascending: true });
    }

    // 페이징
    query = query.range(offset, offset + limit - 1);

    const { data, error, count } = await query;
    if (error) throw error;

    // 정규화 & 입금행 표시 유지
    const rows = (data || []).map((r) => {
      const isDepositRow =
        typeof r.item_name === "string" && r.item_name.replace(/\s/g, "").includes("입금");

      const qty = N(r.qty);
      const unit_price = N(r.unit_price);
      const amount = N(r.amount);
      const deposit = N(r.deposit);
      const balance = N(r.curr_balance);

      return {
        erp_row_key: r.erp_row_key,
        tx_date: r.tx_date,
        row_no: r.row_no ?? null, // ✅ 그대로 내려줌(필요 시 화면 디버그용)
        erp_customer_code: r.erp_customer_code,
        customer_name: r.name,
        item_name: isDepositRow ? null : r.item_name,
        spec: r.spec,
        qty: isDepositRow ? null : qty,
        unit_price: isDepositRow ? null : unit_price,
        amount: isDepositRow ? null : amount,
        prev_balance: N(r.prev_balance),
        deposit: deposit ?? 0,
        curr_balance: balance ?? 0,
        memo: r.memo,

        // 화면 alias
        price: isDepositRow ? null : unit_price,
        debit: isDepositRow ? null : amount,
        balance: balance ?? 0,
      };
    });

    const sum = rows.reduce(
      (acc, r) => {
        acc.debit += r.debit ?? 0;
        acc.credit += r.deposit ?? 0;
        acc.balance += r.balance ?? 0;
        return acc;
      },
      { debit: 0, credit: 0, balance: 0 }
    );

    // CSV
    if (S(req.query.format) === "csv") {
      const header = [
        "row_no",               // ✅ 엑셀 순서 포함
        "tx_date",
        "erp_customer_code",
        "customer_name",
        "item_name",
        "qty",
        "unit_price",
        "amount",
        "prev_balance",
        "deposit",
        "curr_balance",
      ];
      const csv = [
        header.join(","),
        ...rows.map((r) =>
          [
            r.row_no ?? "",
            r.tx_date,
            r.erp_customer_code ?? "",
            (r.customer_name ?? "").replace(/,/g, " "),
            (r.item_name ?? "").replace(/,/g, " "),
            r.qty ?? "",
            r.unit_price ?? "",
            r.amount ?? "",
            r.prev_balance ?? "",
            r.deposit ?? "",
            r.curr_balance ?? "",
          ].join(",")
        ),
      ].join("\n");

      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="ledger_${date_from || "all"}_${date_to || "all"}_${orderMode}.csv"`
      );
      return res.status(200).send(csv);
    }

    return res.status(200).json({ ok: true, total: count ?? rows.length, rows, sum });
  } catch (err: any) {
    return res.status(400).json({ error: err.message || String(err) });
  }
}
