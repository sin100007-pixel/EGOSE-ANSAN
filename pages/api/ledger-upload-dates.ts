// pages/api/ledger-upload-dates.ts
import type { NextApiRequest, NextApiResponse } from "next";
import * as https from "https";
import { URL } from "url";

type Data =
  | {
      ok: true;
      dates: { date: string; count: number }[];
    }
  | {
      ok: false;
      error: string;
      detail?: any;
    };

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
      {
        method: "GET",
        hostname: u.hostname,
        path: u.pathname + u.search,
        headers,
      },
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

function ymd(v: Date) {
  const y = v.getFullYear();
  const m = String(v.getMonth() + 1).padStart(2, "0");
  const d = String(v.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function defaultRange() {
  const now = new Date();
  const prevMonthFirst = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const currentMonthLast = new Date(now.getFullYear(), now.getMonth() + 1, 0);

  return {
    from: ymd(prevMonthFirst),
    to: ymd(currentMonthLast),
  };
}

export default async function handler(req: NextApiRequest, res: NextApiResponse<Data>) {
  if (req.method !== "GET") {
    return res.status(405).json({ ok: false, error: "GET only" });
  }

  try {
    if (!SUPABASE_URL || !SERVICE_ROLE) {
      return res.status(500).json({ ok: false, error: "Supabase 환경변수 누락" });
    }

    const defaults = defaultRange();
    const from = String(req.query.from ?? defaults.from).slice(0, 10);
    const to = String(req.query.to ?? defaults.to).slice(0, 10);

    const headers = {
      apikey: SERVICE_ROLE,
      Authorization: `Bearer ${SERVICE_ROLE}`,
    };

    const counts = new Map<string, number>();

    // 기존 문제:
    // 한 번에 limit 10000만 조회해서 4월 초 데이터에서 잘릴 수 있었음.
    // 해결:
    // 1000건씩 끝까지 페이지를 넘기며 조회.
    const pageSize = 1000;
    let offset = 0;

    while (true) {
      const base = `${SUPABASE_URL}/rest/v1/ledger_entries`;
      const p = new URLSearchParams();

      p.set("select", "tx_date");
      p.set("order", "tx_date.asc");
      p.set("limit", String(pageSize));
      p.set("offset", String(offset));

      if (from) p.set("tx_date", `gte.${from}`);
      if (to) p.append("tx_date", `lte.${to}`);

      const url = `${base}?${p.toString()}`;
      const resp = await httpsGet(url, headers);

      if (resp.status < 200 || resp.status >= 300) {
        return res.status(400).json({
          ok: false,
          error: `조회 실패(${resp.status})`,
          detail: resp.text,
        });
      }

      const rows = JSON.parse(resp.text || "[]") as { tx_date?: string | null }[];

      for (const row of rows) {
        const date = String(row?.tx_date ?? "").slice(0, 10);
        if (!date) continue;
        counts.set(date, (counts.get(date) ?? 0) + 1);
      }

      if (rows.length < pageSize) {
        break;
      }

      offset += pageSize;

      // 혹시라도 데이터가 비정상적으로 너무 많을 때 무한 조회 방지
      if (offset > 200000) {
        break;
      }
    }

    const dates = Array.from(counts.entries())
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date));

    return res.status(200).json({ ok: true, dates });
  } catch (e: any) {
    return res.status(500).json({
      ok: false,
      error: e?.message || "업로드 날짜 조회 중 오류",
      detail: e,
    });
  }
}