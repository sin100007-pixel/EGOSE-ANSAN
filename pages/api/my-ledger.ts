import type { NextApiRequest, NextApiResponse } from "next";
import * as https from "https";
import { URL } from "url";
import { jwtVerify } from "jose";

export const config = { api: { bodyParser: false } };

const SUPABASE_URL = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "")
  .replace(/[\r\n]+/g, "")
  .replace(/\/+$/g, "")
  .trim();
const SERVICE_ROLE = (process.env.SUPABASE_SERVICE_ROLE_KEY ?? "")
  .replace(/[\r\n]+/g, "")
  .trim();

const ACCESS_COOKIE_NAME = "egose_session";
const LEGACY_COOKIE_NAME = "session_user";

type LedgerRow = {
  tx_date: string;
  item_name: string;
  qty: number | null;
  unit_price: number | null;
  amount: number | null;
  deposit: number | null;
  curr_balance: number | null;
  memo?: string | null;
  uploaded_at?: string | null;
  created_at?: string | null;
  [key: string]: any;
};

type ApiOk = {
  ok: true;
  name: string;
  date_from: string;
  date_to: string;
  total: number;
  rows: LedgerRow[];
  sum: { debit: number; credit: number; balance: number };
  latestUploadedDate: string;
  latestUploadedAt: string;
};

type ApiErr = {
  ok: false;
  message: string;
  detail?: any;
};

function safeDecodeCookieValue(value?: string) {
  if (!value) return "";
  try {
    return decodeURIComponent(value).trim();
  } catch {
    return value.trim();
  }
}

async function getNameFromAccessToken(req: NextApiRequest) {
  const token = req.cookies?.[ACCESS_COOKIE_NAME];
  const secretText = process.env.APP_SECRET;

  if (!token || !secretText) return "";

  try {
    const secret = new TextEncoder().encode(secretText);
    const { payload } = await jwtVerify(token, secret);
    return typeof payload.name === "string" ? payload.name.trim() : "";
  } catch {
    return "";
  }
}

async function getLoginName(req: NextApiRequest) {
  const fromAccessToken = await getNameFromAccessToken(req);
  if (fromAccessToken) return fromAccessToken;

  // 보안패치 유예기간용: 기존 자동로그인 쿠키도 사용자 본인 조회에 한해서 허용
  return safeDecodeCookieValue(req.cookies?.[LEGACY_COOKIE_NAME]);
}

function httpsGet(urlStr: string, headers: Record<string, string>) {
  return new Promise<{ status: number; text: string; headers: any }>((resolve, reject) => {
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

function ymd(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

function safeYmd(value: any) {
  const raw = String(value ?? "").trim().replace(/\./g, "-").replace(/\//g, "-");
  if (/^\d{4}-\d{2}-\d{2}/.test(raw)) return raw.slice(0, 10);
  return "";
}

function toNumber(value: any): number | null {
  if (value === null || value === undefined || value === "") return null;
  const n = typeof value === "number" ? value : Number(String(value).replace(/[, ]+/g, ""));
  return Number.isFinite(n) ? n : null;
}

function normalizeRow(row: any): LedgerRow {
  return {
    ...row,
    tx_date: safeYmd(row.tx_date ?? row.date ?? row["일자"] ?? row["날짜"]),
    item_name: String(row.item_name ?? row.description ?? row.product_name ?? row["품명"] ?? "").trim(),
    qty: toNumber(row.qty ?? row.quantity ?? row["수량"]),
    unit_price: toNumber(row.unit_price ?? row.price ?? row["단가"]),
    amount: toNumber(row.amount ?? row.debit ?? row["공급가"] ?? row["매출금액"]),
    deposit: toNumber(row.deposit ?? row.credit ?? row["입금액"]),
    curr_balance: toNumber(row.curr_balance ?? row.balance ?? row["잔액"] ?? row["금일잔액"]),
    memo: row.memo ?? row.note ?? row["비고"] ?? null,
    uploaded_at: row.uploaded_at ?? row.uploadedAt ?? row.created_at ?? row.createdAt ?? null,
    created_at: row.created_at ?? row.createdAt ?? null,
  };
}

function contentRangeTotal(headers: any, fallback: number) {
  const contentRange = String(headers?.["content-range"] || "");
  const totalText = contentRange.includes("/") ? contentRange.split("/")[1] : "";
  const total = Number(totalText);
  return Number.isFinite(total) ? total : fallback;
}

function buildLedgerUrl(args: {
  customerColumn: "name" | "customer_name";
  loginName: string;
  dateFrom: string;
  dateTo: string;
  limit: number;
  offset: number;
  orderWithRowNo: boolean;
}) {
  const base = `${SUPABASE_URL}/rest/v1/ledger_entries`;
  const url = new URL(base);

  url.searchParams.set("select", "*");
  url.searchParams.set(args.customerColumn, `eq.${args.loginName}`);

  if (args.dateFrom) url.searchParams.set("tx_date", `gte.${args.dateFrom}`);
  if (args.dateTo) url.searchParams.append("tx_date", `lte.${args.dateTo}`);

  url.searchParams.set("order", args.orderWithRowNo ? "tx_date.desc,row_no.desc" : "tx_date.desc");
  url.searchParams.set("limit", String(args.limit));
  url.searchParams.set("offset", String(args.offset));

  return url.toString();
}

async function fetchRows(loginName: string, dateFrom: string, dateTo: string, limit: number, offset: number) {
  const headers = {
    apikey: SERVICE_ROLE,
    Authorization: `Bearer ${SERVICE_ROLE}`,
    Prefer: "count=exact",
  } as Record<string, string>;

  const attempts = [
    { customerColumn: "name" as const, orderWithRowNo: true },
    { customerColumn: "name" as const, orderWithRowNo: false },
    { customerColumn: "customer_name" as const, orderWithRowNo: false },
  ];

  let lastFailure: { status: number; text: string } | null = null;

  for (const attempt of attempts) {
    const url = buildLedgerUrl({
      customerColumn: attempt.customerColumn,
      loginName,
      dateFrom,
      dateTo,
      limit,
      offset,
      orderWithRowNo: attempt.orderWithRowNo,
    });

    const resp = await httpsGet(url, headers);

    if (resp.status >= 200 && resp.status < 300) {
      const rawRows = JSON.parse(resp.text || "[]");
      const rows = Array.isArray(rawRows) ? rawRows.map(normalizeRow) : [];
      return {
        rows,
        total: contentRangeTotal(resp.headers, rows.length),
      };
    }

    lastFailure = { status: resp.status, text: resp.text };
  }

  throw new Error(
    lastFailure
      ? `거래내역 조회 실패(${lastFailure.status}): ${lastFailure.text}`
      : "거래내역 조회 실패"
  );
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ApiOk | ApiErr>
) {
  try {
    if (req.method !== "GET") {
      res.setHeader("Allow", "GET");
      return res.status(405).json({ ok: false, message: "Method Not Allowed" });
    }

    if (!SUPABASE_URL || !SERVICE_ROLE) {
      return res.status(500).json({
        ok: false,
        message: "환경변수 누락: NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY",
      });
    }

    const loginName = await getLoginName(req);
    if (!loginName) {
      return res.status(401).json({ ok: false, message: "로그인이 필요합니다." });
    }

    const to = new Date();
    const from = new Date(to);
    from.setMonth(from.getMonth() - 3);

    const date_from = safeYmd(req.query.date_from) || ymd(from);
    const date_to = safeYmd(req.query.date_to) || ymd(to);

    const page = Math.max(1, parseInt(String(req.query.page ?? "1"), 10) || 1);
    const rawLimit = parseInt(String(req.query.limit ?? "2000"), 10) || 2000;
    const limit = Math.min(Math.max(rawLimit, 1), 5000);
    const offset = (page - 1) * limit;

    const { rows, total } = await fetchRows(loginName, date_from, date_to, limit, offset);

    const sum = rows.reduce(
      (acc, row) => {
        acc.debit += Number(row.amount ?? 0);
        acc.credit += Number(row.deposit ?? 0);
        acc.balance += Number(row.curr_balance ?? 0);
        return acc;
      },
      { debit: 0, credit: 0, balance: 0 }
    );

    const latestRow = rows.find((row) => row.tx_date || row.uploaded_at || row.created_at);
    const latestUploadedDate = latestRow?.tx_date || "";
    const latestUploadedAt = latestRow?.uploaded_at || latestRow?.created_at || "";

    return res.status(200).json({
      ok: true,
      name: loginName,
      date_from,
      date_to,
      total,
      rows,
      sum,
      latestUploadedDate,
      latestUploadedAt,
    });
  } catch (e: any) {
    return res.status(500).json({
      ok: false,
      message: e?.message || "거래내역을 불러오지 못했습니다.",
    });
  }
}
