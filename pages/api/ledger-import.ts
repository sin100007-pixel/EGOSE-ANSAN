// pages/api/ledger-import.ts
import type { NextApiRequest, NextApiResponse } from "next";
import formidable from "formidable"; // named type import 제거
import * as fs from "fs";
import * as path from "path";
import * as XLSX from "xlsx";
import * as https from "https";
import { URL } from "url";

/** multipart/form-data 이므로 bodyParser 비활성화 */
export const config = { api: { bodyParser: false } };

/* ============================== 타입 ============================== */
type Row = Record<string, any>;
type Ok = {
  ok: true;
  used_baseDate: boolean;
  baseDate: string;
  inserted: number;
  skipped: number;
  preview: any[];
  message?: string;
};
type Err = { ok: false; message: string; detail?: any };
type Data = Ok | Err;

/* ============================== ENV ============================== */
const SUPABASE_URL = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "")
  .replace(/[\r\n]+/g, "")
  .replace(/\/+$/g, "")
  .trim();
const SERVICE_ROLE = (process.env.SUPABASE_SERVICE_ROLE_KEY ?? "")
  .replace(/[\r\n]+/g, "")
  .trim();

/* ============================== 유틸 ============================== */
const S = (v: any) => (v == null ? "" : String(v).trim());
function N(v: any): number | null {
  const s = S(v).replace(/[, ]+/g, "");
  if (!s) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}
function toYMD(input: any): string {
  if (input === null || input === undefined || input === "") return "";
  if (typeof input === "number" && input > 59) {
    const d = XLSX.SSF.parse_date_code(input);
    if (d) {
      const mm = String(d.m).padStart(2, "0");
      const dd = String(d.d).padStart(2, "0");
      return `${d.y}-${mm}-${dd}`;
    }
  }
  const s = String(input).trim().replace(/\./g, "-").replace(/\//g, "-");
  const m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (m) return `${m[1]}-${m[2].padStart(2, "0")}-${m[3].padStart(2, "0")}`;
  const d = new Date(s);
  if (isNaN(d.getTime())) return "";
  const y = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${mm}-${dd}`;
}
function zeroish(v: any): boolean {
  if (v === null || v === undefined) return true;
  const s = String(v).trim();
  if (s === "" || s === "0") return true;
  const n = Number(s.replace(/[, ]+/g, ""));
  return Number.isFinite(n) ? n === 0 : false;
}
function isAllZeroRow(r: Record<string, any>): boolean {
  const vals = Object.values(r ?? {});
  if (vals.length === 0) return true;
  return vals.every(zeroish);
}

/* 헤더 감지 */
const HEADER_WORDS = new Set([
  "거래처","고객명","코드","전표","코드명",
  "품명","상품명","품목",
  "규격","규격명",
  "단위",
  "수량",
  "단가",
  "매출금액","공급가액","판매금액",
  "전일잔액","이월",
  "입금액","입금",
  "금일잔액","현재잔액",
  "비고",
]);
function isHeaderLikeRow(cells: string[]): boolean {
  if (cells.length === 0) return false;
  if (["거래처","고객명","총계","합계"].includes(cells[0])) return true;
  const nonEmpty = cells.filter((s) => s !== "");
  if (nonEmpty.length === 0) return false;
  const headerCount = nonEmpty.filter((s) => HEADER_WORDS.has(s)).length;
  return headerCount >= Math.max(2, Math.floor(nonEmpty.length * 0.6));
}

/* ============================== 폼 파싱 ============================== */
// noImplicitAny 오류 방지 타입 명시
function parseForm(req: NextApiRequest): Promise<{ fields: any; files: any }> {
  const form = formidable({ multiples: false, keepExtensions: true });
  return new Promise((resolve, reject) => {
    form.parse(req as any, (err: any, fields: any, files: any) => {
      if (err) return reject(err);
      resolve({ fields, files });
    });
  });
}
function firstOf<T = any>(obj: Record<string, any> | undefined, keys: string[]): T | undefined {
  if (!obj) return undefined;
  for (const k of keys) {
    const v: any = (obj as any)[k];
    if (Array.isArray(v)) {
      if (v.length > 0 && v[0] !== undefined && v[0] !== "") return v[0] as T;
    } else if (v !== undefined && v !== "") {
      return v as T;
    }
  }
  return undefined;
}
function pickFirstFile(files: any): any {
  for (const key of Object.keys(files || {})) {
    const v: any = (files as any)[key];
    if (Array.isArray(v)) { if (v.length > 0) return v[0]; }
    else if (v) return v;
  }
  return null;
}

/* ============================== 파일 읽기 ============================== */
function readRowsFromUpload(filePath: string): Row[] {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === ".csv" || ext === ".txt") {
    const buf = fs.readFileSync(filePath, "utf8");
    const lines = buf.split(/\r?\n/).filter(Boolean);
    if (lines.length === 0) return [];
    const header = lines[0].split(/,|\t/).map((h) => h.trim());
    return lines.slice(1).map((line) => {
      const cols = line.split(/,|\t/);
      const obj: Row = {};
      header.forEach((h, i) => (obj[h] = (cols[i] ?? "").trim()));
      return obj;
    });
  }
  const wb = XLSX.read(fs.readFileSync(filePath));
  const ws = wb.Sheets[wb.SheetNames[0]];
  return XLSX.utils.sheet_to_json<Row>(ws, { defval: "" });
}

/* ============================== Supabase REST 호출 ============================== */
function httpsRequest(urlStr: string, method: string, headers: Record<string, string>, body?: string) {
  return new Promise<{ status: number; text: string; headers: any }>((resolve, reject) => {
    try {
      const u = new URL(urlStr);
      const req = https.request(
        { method, hostname: u.hostname, path: u.pathname + u.search, headers },
        (res) => {
          const chunks: Buffer[] = [];
          res.on("data", (d) => chunks.push(d as Buffer));
          res.on("end", () =>
            resolve({ status: res.statusCode || 0, text: Buffer.concat(chunks).toString("utf8"), headers: res.headers })
          );
        }
      );
      req.on("error", reject);
      if (body) req.write(body);
      req.end();
    } catch (e) { reject(e); }
  });
}

/* ============================== 메인 핸들러 ============================== */
export default async function handler(req: NextApiRequest, res: NextApiResponse<Data>) {
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, message: "POST only" });
  }

  try {
    const { fields, files } = await parseForm(req);

    // 기준일
    const baseDateField = firstOf<string>(fields as any, ["baseDate","base_date","기준일","date","startDate"]);
    const baseDateQuery = firstOf<string>(req.query as any, ["baseDate","base_date","기준일","date","startDate"]);
    const baseDateRaw = baseDateField ?? baseDateQuery;
    const today = toYMD(new Date());
    const baseDate = toYMD(baseDateRaw) || today;
    const used_baseDate = Boolean(toYMD(baseDateRaw));

    // 파일
    const fileObj: any = pickFirstFile(files);
    if (!fileObj?.filepath && !fileObj?.path) {
      return res.status(400).json({ ok: false, message: "업로드된 파일을 찾을 수 없습니다. (input type='file')" });
    }
    const filepath = fileObj.filepath || fileObj.path;
    const rawRows = readRowsFromUpload(filepath);
    if (rawRows.length === 0) {
      return res.status(400).json({ ok: false, message: "빈 파일입니다." });
    }

    // 컬럼 포인터
    const firstColKey = Object.keys(rawRows[0] || {})[0] || "col0";
    const K = (index: number) =>
      index === 0 ? firstColKey : `__EMPTY${index === 1 ? "" : "_" + (index - 1)}`;

    // 파싱 & 정리
    let currentName = "";
    let rowNo = 0;
    const normalized: any[] = [];

    for (const r of rawRows) {
      const c0 = S(r[firstColKey]);
      const c1 = S(r[K(1)]), c2 = S(r[K(2)]), c3 = S(r[K(3)]), c4 = S(r[K(4)]);

      // 0만 있는 줄/빈 줄/헤더/소계/총계 스킵
      if (isAllZeroRow(r)) continue;
      const emptyLine = Object.values(r).every((v) => S(v) === "");
      const headerLikeA = c0.includes("매출일보") && c1 === "코드";
      const headerLikeB = isHeaderLikeRow([c0, c1, c2, c3, c4]);
      if (emptyLine || headerLikeA || headerLikeB) continue;
      if (/^\s*소계\s*:/i.test(c0) || /^\s*총계/i.test(c0)) {
        if (/^\s*소계\s*:/i.test(c0)) currentName = c0.replace(/^소계\s*:/i, "").trim();
        continue;
      }

      // 고객명 추적
      if (/^\s*\*/.test(c0)) currentName = c0.replace(/^\s*\*\s*/, "").trim();
      else if (c0) currentName = c0.trim();
      const name = currentName;

      const erp_customer_code = S(r[K(1)]) || null;
      const item_name = S(r[K(2)]) || null;
      const spec = S(r[K(3)]) || null;

      const qty = N(r[K(5)]);
      const unit_price = N(r[K(6)]);
      const amount = N(r[K(7)]);
      const prev_balance = N(r[K(8)]);
      const deposit = N(r[K(9)]);
      const curr_balance = N(r[K(10)]);
      const memo = S(r[K(11)]) || null;

      // “품명/규격/비고” 비어 있고 숫자 전부 0/빈값 → 제외
      const allNumsZero =
        (qty ?? 0) === 0 &&
        (unit_price ?? 0) === 0 &&
        (amount ?? 0) === 0 &&
        (prev_balance ?? 0) === 0 &&
        (deposit ?? 0) === 0 &&
        (curr_balance ?? 0) === 0;
      const noTextCols =
        !(item_name && item_name.trim()) &&
        !(spec && spec.trim()) &&
        !(memo && memo.trim());
      if (allNumsZero && noTextCols) continue;

      const hasMeaning =
        (name && name !== "거래처" && name !== "고객명") ||
        (item_name && item_name !== "품명" && item_name !== "상품명") ||
        qty != null || unit_price != null || amount != null ||
        deposit != null || prev_balance != null || curr_balance != null;
      if (!hasMeaning) continue;

      rowNo += 1;
      const tx_date = toYMD((r as any)["tx_date"]) || baseDate;

      const erp_row_key = [
        tx_date,
        String(rowNo).padStart(5, "0"),
        erp_customer_code || "",
        item_name || "",
      ].join("|");

      normalized.push({
        erp_row_key,
        tx_date,            // YYYY-MM-DD
        row_no: rowNo,      // 업로드 순번 (정렬에 사용)
        erp_customer_code,
        name: name || null, // customer_name
        item_name,
        spec,
        qty,
        unit_price,
        amount,
        prev_balance,
        deposit,
        curr_balance,
        memo,
      });
    }

    /* 저장(Upsert) */
    if (!SUPABASE_URL || !SERVICE_ROLE) {
      return res.status(500).json({
        ok: false,
        message: "환경변수 누락: NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY",
      });
    }
    const endpoint = `${SUPABASE_URL}/rest/v1/ledger_entries`;
    const headers = {
      apikey: SERVICE_ROLE,
      Authorization: `Bearer ${SERVICE_ROLE}`,
      "Content-Type": "application/json",
      Prefer: "resolution=merge-duplicates,return=representation",
    };

    let inserted = 0;
    const chunkSize = 500;
    for (let i = 0; i < normalized.length; i += chunkSize) {
      const chunk = normalized.slice(i, i + chunkSize);
      const resp = await httpsRequest(endpoint, "POST", headers, JSON.stringify(chunk));
      if (resp.status >= 200 && resp.status < 300) {
        try {
          const arr = JSON.parse(resp.text || "[]");
          inserted += Array.isArray(arr) ? arr.length : chunk.length;
        } catch {
          inserted += chunk.length;
        }
      } else {
        return res.status(400).json({
          ok: false,
          message: `업서트 실패(${resp.status})`,
          detail: resp.text,
        });
      }
    }

    const preview = normalized.slice(0, 10);
    const skipped = rawRows.length - normalized.length;

    return res.status(200).json({
      ok: true,
      used_baseDate,
      baseDate,
      inserted,
      skipped,
      preview,
      message: used_baseDate
        ? "기준일을 반영해 업로드 & 저장 완료"
        : "기준일 미전달 → 오늘 날짜로 저장",
    });
  } catch (err: any) {
    console.error(err);
    return res.status(500).json({ ok: false, message: "업로드/저장 처리 중 오류", detail: err?.message });
  }
}
