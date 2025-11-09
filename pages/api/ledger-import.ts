// pages/api/ledger-import.ts
// CSV/XLSX 업로드 → Supabase REST 업서트 (Buffer + https 사용)
// - 거래처/코드가 빈칸으로 내려가는 엑셀을 위해 Forward-Fill 적용
// - "소계/합계/총계" 요약 행은 자동 제외

import type { NextApiRequest, NextApiResponse } from "next";
import { parse as parseCsv } from "csv-parse/sync";
import * as XLSX from "xlsx";
import * as https from "https";
import { URL } from "url";

export const config = { api: { bodyParser: false } };

// ===== ENV (개행/공백 제거) =====
const SUPABASE_URL = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "")
  .replace(/[\r\n]+/g, "")
  .replace(/\/+$/g, "")
  .trim();
const SERVICE_ROLE = (process.env.SUPABASE_SERVICE_ROLE_KEY ?? "")
  .replace(/[\r\n]+/g, "")
  .trim();

type Raw = Record<string, any>;
const S = (v: any) => String(v ?? "").trim();
const N = (v: any) => {
  const n = Number(String(v ?? "").replace(/[, ]/g, ""));
  return Number.isFinite(n) ? n : 0;
};
const toISO = (v: any) => {
  const t = S(v);
  if (/^\d{4}-\d{2}-\d{2}$/.test(t)) return t;
  if (/^\d{8}$/.test(t)) return `${t.slice(0, 4)}-${t.slice(4, 6)}-${t.slice(6, 8)}`;
  const n = Number(t);
  if (Number.isFinite(n) && n > 20000 && n < 80000) {
    const base = new Date(Date.UTC(1899, 11, 30)); // Excel serial
    return new Date(base.getTime() + n * 86400000).toISOString().slice(0, 10);
  }
  return "";
};
const keyOf = (parts: Array<string | number>) =>
  encodeURIComponent(parts.map((p) => String(p ?? "")).join("|"));

// ===== multipart by Buffer =====
async function parseMultipartByBuffer(req: NextApiRequest) {
  const ct = req.headers["content-type"]?.toString() || "";
  const m = ct.match(/boundary=(.*)$/);
  if (!m) throw new Error("No multipart boundary");
  const boundary = Buffer.from("--" + m[1], "utf8");
  const CRLF = Buffer.from("\r\n");
  const CRLFCRLF = Buffer.from("\r\n\r\n");

  const chunks: Buffer[] = [];
  for await (const c of req) chunks.push(Buffer.from(c as any));
  const body = Buffer.concat(chunks);

  const parts: Buffer[] = [];
  let start = body.indexOf(boundary);
  while (start !== -1) {
    const next = body.indexOf(boundary, start + boundary.length);
    if (next === -1) break;
    parts.push(body.slice(start + boundary.length, next));
    start = next;
  }

  let file: Buffer | undefined;
  let filename: string | undefined;
  let baseDate: string | undefined;

  for (const raw of parts) {
    let p = raw;
    if (p.slice(0, 2).equals(CRLF)) p = p.slice(2);
    const sep = p.indexOf(CRLFCRLF);
    if (sep < 0) continue;
    const headersBuf = p.slice(0, sep);
    let data = p.slice(sep + CRLFCRLF.length);

    if (data.slice(-2).equals(CRLF)) data = data.slice(0, -2);
    if (data.slice(-4).equals(Buffer.from("--\r\n"))) data = data.slice(0, -4);

    const headers = headersBuf.toString("utf8");
    const name = headers.match(/name="([^"]+)"/)?.[1];
    const fname = headers.match(/filename="([^"]*)"/)?.[1];

    if (name === "file") {
      file = data;
      filename = fname || "upload.bin";
    } else if (name === "base_date") {
      baseDate = data.toString("utf8").trim();
    }
  }

  return { file, filename, baseDate };
}

// ===== file parsers =====
function rowsFromXLSX(buf: Buffer): Raw[] {
  const wb = XLSX.read(buf, { type: "buffer" });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const table = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" }) as any[][];
  const LABELS = {
    code: ["거래처코드", "고객코드", "코드"],
    name: ["거래처명", "고객명", "상호", "거래처"],
    date: ["출고일자", "거래일자", "매출일자", "일자"],
    doc: ["전표번호", "문서번호"],
    line: ["행번호", "라인번호", "순번"],
    debit: ["공급가", "공급가액", "금액", "매출금액"],
    credit: ["부가세", "세액", "VAT"],
    bal: ["잔액", "총액", "합계"],
    desc: ["적요", "비고", "내용", "품명", "품목", "규격"],
  };
  const hit = (h: string, arr: string[]) => arr.some((k) => h.includes(k));
  let hi = 0,
    best = -1;
  for (let r = 0; r < Math.min(8, table.length); r++) {
    const row = table[r] || [];
    const score = row.reduce((a: number, c: any) => {
      const h = S(c);
      return (
        a +
        (hit(h, LABELS.code) ? 1 : 0) +
        (hit(h, LABELS.name) ? 1 : 0) +
        (hit(h, LABELS.date) ? 1 : 0) +
        (hit(h, LABELS.doc) ? 1 : 0) +
        (hit(h, LABELS.line) ? 1 : 0) +
        (hit(h, LABELS.debit) ? 1 : 0) +
        (hit(h, LABELS.credit) ? 1 : 0) +
        (hit(h, LABELS.bal) ? 1 : 0) +
        (hit(h, LABELS.desc) ? 1 : 0)
      );
    }, 0);
    if (score > best) {
      best = score;
      hi = r;
    }
  }
  const headers = (table[hi] || []).map((h) => S(h));
  const rows = table.slice(hi + 1);
  const out: Raw[] = [];
  for (const r of rows) {
    if (!Array.isArray(r) || r.every((x) => S(x) === "")) continue;
    const obj: Raw = {};
    headers.forEach((h, i) => (obj[h] = r[i]));
    out.push(obj);
  }
  return out;
}
function rowsFromCSV(buf: Buffer): Raw[] {
  return parseCsv(buf, { columns: true, bom: true, skip_empty_lines: true, trim: true });
}

// ===== Forward-Fill (거래처/코드 빈칸을 앞줄 값으로 채우기) =====
function forwardFillCustomerAndCode(rows: Record<string, any>[]) {
  const NAME_KEYS = ["customer_name", "거래처명", "상호", "거래처"];
  const CODE_KEYS = ["erp_customer_code", "거래처코드", "고객코드", "코드"];

  let lastName = "";
  let lastCode = "";

  return rows.map((r) => {
    const o: Record<string, any> = { ...r };

    const nameKey = NAME_KEYS.find((k) => k in o);
    const codeKey = CODE_KEYS.find((k) => k in o);

    const rawName = nameKey ? String(o[nameKey] ?? "").trim() : "";
    const rawCode = codeKey ? String(o[codeKey] ?? "").trim() : "";

    // 소계/합계/총계 같은 그룹 라벨은 forward-fill에 사용하지 않음
    const label = rawName || rawCode || "";
    if (/^\s*소계|합계|총계/.test(label)) return o;

    if (rawName) lastName = rawName;
    if (rawCode) lastCode = rawCode;

    if (nameKey && !rawName) o[nameKey] = lastName;
    if (codeKey && !rawCode) o[codeKey] = lastCode;

    return o;
  });
}

// ===== https.request 유틸 =====
function httpsRequestBuffer(
  urlStr: string,
  method: string,
  headers: Record<string, string>,
  body?: Buffer
): Promise<{ status: number; text: string }> {
  return new Promise((resolve, reject) => {
    try {
      const u = new URL(urlStr);
      const options: https.RequestOptions = {
        method,
        hostname: u.hostname,
        path: u.pathname + u.search,
        headers: {
          ...headers,
          ...(body ? { "Content-Length": String(Buffer.byteLength(body)) } : {}),
        },
      };
      const req = https.request(options, (res) => {
        const chunks: Buffer[] = [];
        res.on("data", (d) => chunks.push(d as Buffer));
        res.on("end", () => {
          const buf = Buffer.concat(chunks);
          resolve({ status: res.statusCode || 0, text: buf.toString("utf8") });
        });
      });
      req.on("error", reject);
      if (body && body.length) req.write(body);
      req.end();
    } catch (e) {
      reject(e);
    }
  });
}

// ===== REST 업서트 =====
async function upsertViaREST(table: string, rows: any[], onConflict: string) {
  if (!SUPABASE_URL || !SERVICE_ROLE) {
    throw new Error("Missing env: NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  }
  const url = `${SUPABASE_URL}/rest/v1/${table}?on_conflict=${encodeURIComponent(onConflict)}`;
  const APIKEY = SERVICE_ROLE;
  const AUTH = `Bearer ${APIKEY}`;
  const baseHeaders: Record<string, string> = {
    apikey: APIKEY,
    Authorization: AUTH,
    "Content-Type": "application/json; charset=utf-8",
    Prefer: "return=representation,resolution=merge-duplicates",
  };

  let upserted = 0;
  for (let i = 0; i < rows.length; i += 1000) {
    const chunk = rows.slice(i, i + 1000);
    const body = Buffer.from(JSON.stringify(chunk), "utf8");
    const { status, text } = await httpsRequestBuffer(url, "POST", baseHeaders, body);
    if (status < 200 || status >= 300) throw new Error(`REST upsert fail (${status}): ${text}`);
    let data: any = [];
    try {
      data = JSON.parse(text);
    } catch {}
    upserted += Array.isArray(data) ? data.length : 0;
  }
  return upserted;
}

// ===== handler =====
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  let stage = "start";
  try {
    if (req.method !== "POST") {
      res.setHeader("Allow", "POST");
      return res.status(405).json({ error: "Method Not Allowed", route: "pages/api/ledger-import" });
    }

    stage = "parse-multipart";
    const { file, baseDate } = await parseMultipartByBuffer(req);
    if (!file) return res.status(400).json({ error: "파일이 없습니다.", route: "pages/api/ledger-import", stage });

    stage = "detect-type";
    const isXlsx = file[0] === 0x50 && file[1] === 0x4b;

    stage = isXlsx ? "parse-xlsx" : "parse-csv";
    const raw0 = isXlsx ? rowsFromXLSX(file) : rowsFromCSV(file);

    // ★ Forward-Fill 적용
    const raw = forwardFillCustomerAndCode(raw0);

    stage = "map-rows";
    const rows = raw
      .map((r) => {
        let tx_date =
          (r as any).tx_date ||
          (r as any).출고일자 ||
          (r as any).거래일자 ||
          (r as any).매출일자 ||
          (r as any).date ||
          baseDate ||
          "";
        tx_date = toISO(tx_date);

        let code =
          (r as any).erp_customer_code ||
          (r as any).거래처코드 ||
          (r as any).고객코드 ||
          (r as any).코드 ||
          "";
        let name =
          (r as any).customer_name ||
          (r as any).거래처명 ||
          (r as any).상호 ||
          (r as any).거래처 ||
          "";

        const doc = (r as any).doc_no || (r as any).전표번호 || (r as any).문서번호 || "";
        const line =
          (r as any).line_no || (r as any).행번호 || (r as any).라인번호 || (r as any).순번 || "";

        const item = (r as any).품명 || (r as any).품목 || "";
        const spec = (r as any).규격 || "";
        const qty = (r as any).수량 ?? "";
        const price = (r as any).단가 ?? "";
        const amt = (r as any).매출금액 ?? (r as any).금액 ?? "";

        const desc = S(
          (r as any).description ||
            (r as any).적요 ||
            (r as any).비고 ||
            (r as any).내용 ||
            [item, spec, qty && `x${qty}`, price && `@${price}`, amt && `=${amt}`]
              .filter(Boolean)
              .join(" ")
        );

        const debit = N(
          (r as any).debit ??
            (r as any).공급가 ??
            (r as any).공급가액 ??
            (r as any).금액 ??
            (r as any).매출금액 ??
            amt
        );
        const credit = N((r as any).credit ?? (r as any).부가세 ?? (r as any).세액 ?? 0);
        const balance = N((r as any).balance ?? 0);

        let key: string = (r as any).erp_row_key || (r as any).rowkey || (r as any).고유키 || "";
        if (!key) {
          key =
            doc || line
              ? keyOf([tx_date, doc, line, code || name])
              : keyOf([tx_date, code || name, item, spec, N(qty), N(price), N(amt)]);
        }
        if (!code && name) code = name;

        return {
          erp_customer_code: S(code),
          customer_name: S(name),
          tx_date,
          doc_no: S(doc),
          line_no: S(line),
          description: desc,
          debit,
          credit,
          balance,
          erp_row_key: S(key),
          updated_at: new Date().toISOString(),
        };
      })
      // 유효 행만 남기기
      .filter((r) => r.tx_date && (r.erp_customer_code || r.customer_name) && r.erp_row_key)
      // ★ 소계/합계/총계 라벨 제외
      .filter(
        (r) =>
          !/합계|총계|^\s*소계/.test(r.customer_name || "") &&
          !/합계|총계|^\s*소계/.test(r.description || "")
      );

    stage = "upsert-rest";
    const upserted = await upsertViaREST("ledger_entries", rows, "erp_row_key");

    return res.status(200).json({
      ok: true,
      route: "pages/api/ledger-import",
      stage: "done",
      total: raw.length,
      valid: rows.length,
      upserted,
    });
  } catch (e: any) {
    return res
      .status(500)
      .json({ error: e?.message || String(e), route: "pages/api/ledger-import", stage });
  }
}
