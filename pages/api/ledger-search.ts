// pages/api/ledger-search.ts
import type { NextApiRequest, NextApiResponse } from "next";
import * as https from "https";
import { URL } from "url";

type Data =
  | {
      ok: true;
      rows: any[];
      total: number;
      sum: { debit: number; credit: number; balance: number };
    }
  | { ok: false; error: string; detail?: any };

const SUPABASE_URL = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "")
  .replace(/\/+$/g, "")
  .trim();
const SERVICE_ROLE = (process.env.SUPABASE_SERVICE_ROLE_KEY ?? "").trim();

function httpsGet(
  urlStr: string,
  headers: Record<string, string>
): Promise<{ status: number; text: string; headers: any }> {
  return new Promise((resolve, reject) => {
    const u = new URL(urlStr);
    const req = https.request(
      { method: "GET", hostname: u.hostname, path: u.pathname + u.search, headers },
      (res) => {
        const chunks: Buffer[] = [];
        res.on("data", (d) => chunks.push(d as Buffer));
        res.on("end", () =>
          resolve({
            status: res.statusCode || 0,
            text: Buffer.concat(chunks).toString("utf8"),
            headers: res.headers,
          })
        );
      }
    );
    req.on("error", reject);
    req.end();
  });
}

export default async function handler(req: NextApiRequest, res: NextApiResponse<Data>) {
  try {
    if (!SUPABASE_URL || !SERVICE_ROLE) {
      return res.status(500).json({ ok: false, error: "Supabase 환경변수 누락" });
    }

    const date_from = String(req.query.date_from ?? "").slice(0, 10);
    const date_to = String(req.query.date_to ?? "").slice(0, 10);
    const q = String(req.query.q ?? "").trim();
    const page = Math.max(1, parseInt(String(req.query.page ?? "1"), 10) || 1);
    const limit = parseInt(String(req.query.limit ?? "50"), 10) || 50;
    const offset = (page - 1) * limit;
    const format = String(req.query.format ?? "").toLowerCase();

    const base = `${SUPABASE_URL}/rest/v1/ledger_entries`;
    const p = new URLSearchParams();

    // 필요한 컬럼만 쓰고 싶다면 * 대신 구체적으로 나열해도 OK
    p.set("select", "*");

    // 날짜 범위 (올바른 PostgREST 문법: column=op.value)
    if (date_from) p.set("tx_date", `gte.${date_from}`);
    if (date_to) p.append("tx_date", `lte.${date_to}`);

    // 검색 OR (괄호 포함, 콤마로 조건 구분)
    if (q) {
      const like = `*${q.replace(/[%]/g, "")}*`;
      p.set(
        "or",
        `(name.ilike.${like},item_name.ilike.${like},spec.ilike.${like},memo.ilike.${like})`
      );
    }

    // 정렬: 일자 ↓, 같은 일자는 업로드 순번(row_no) ↑
    p.set("order", "tx_date.desc,row_no.desc");

    // 페이징 + 총개수
    p.set("limit", String(limit));
    p.set("offset", String(offset));

    const url = `${base}?${p.toString()}`;
    const headers = {
      apikey: SERVICE_ROLE,
      Authorization: `Bearer ${SERVICE_ROLE}`,
      Prefer: "count=exact", // Content-Range 로 total 받기
    };

    const resp = await httpsGet(url, headers);
    if (resp.status < 200 || resp.status >= 300) {
      return res
        .status(400)
        .json({ ok: false, error: `조회 실패(${resp.status})`, detail: resp.text });
    }

    const rows = JSON.parse(resp.text || "[]");

    // 합계 계산
    const sum = rows.reduce(
      (acc: any, r: any) => {
        acc.debit += Number(r.amount ?? 0);
        acc.credit += Number(r.deposit ?? 0);
        acc.balance += Number(r.curr_balance ?? 0);
        return acc;
      },
      { debit: 0, credit: 0, balance: 0 }
    );

    // 전체 개수
    const contentRange = String(resp.headers["content-range"] || "*/0");
    const total = Number(contentRange.split("/")[1] || rows.length);

    // CSV 요청시 간단 다운로드
    if (format === "csv") {
      const header = ["일자","고객명","품명","규격","수량","단가","매출금액","전일잔액","입금액","금일잔액","비고"];
      const lines = [header.join(",")].concat(
        rows.map((r: any) =>
          [
            (r.tx_date ?? "").slice(0, 10),
            r.name ?? "",
            r.item_name ?? "",
            r.spec ?? "",
            r.qty ?? "",
            r.unit_price ?? "",
            r.amount ?? "",
            r.prev_balance ?? "",
            r.deposit ?? "",
            r.curr_balance ?? "",
            (r.memo ?? "").replace(/[\r\n,]+/g, " "),
          ].join(",")
        )
      );
      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      res.setHeader("Content-Disposition", "attachment; filename=ledger.csv");
      return res.status(200).send(lines.join("\n") as any);
    }

    return res.status(200).json({ ok: true, rows, total, sum });
  } catch (e: any) {
    return res.status(500).json({ ok: false, error: e?.message || String(e) });
  }
}
