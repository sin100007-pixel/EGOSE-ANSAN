// pages/api/ledger-import.ts
import type { NextApiRequest, NextApiResponse } from "next";
import formidable from "formidable";
import * as XLSX from "xlsx";
import fs from "node:fs";
import { createClient } from "@supabase/supabase-js";

export const config = { api: { bodyParser: false } };

/** 느슨한 헤더 후보 */
const H = {
  date: ["일자", "기준일", "날짜", "date", "tx_date"],
  code: ["코드", "거래처코드", "거래처 코드", "code"],
  name: ["거래처", "거래처명", "name", "customer", "거래처 이름"],
  item: ["품명", "품목", "상품명", "item", "product"],
  spec: ["규격", "스펙", "사양", "spec"],
  qty: ["수량", "qty", "수 량"],
  unit_price: ["단가", "단 가", "unit price", "단 가(원)", "판매단가", "매출단가"],
  prev_balance: ["전일잔액", "전잔", "전잔액", "이월", "prev", "전일 잔액"],
  curr_balance: ["금일잔액", "당일잔액", "현재잔액", "금일 잔액", "curr", "현재 잔액"],
  amount: ["금액", "합계", "총액", "amount", "매출금액", "공급가액", "판매금액"],
  memo: ["비고", "메모", "비 고", "note", "memo"],
};

const str = (v: any) => (v === null || v === undefined ? "" : String(v).trim());
const toNumber = (v: any) => {
  const s = str(v).replace(/[, ]+/g, "");
  if (!s) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
};

/** 날짜 파서: 엑셀 직렬값/여러 구분자/2자리 연도 + baseDate 보정 */
function toISODate(input: any, baseDate?: string | Date): string | null {
  const useBase = () => {
    if (!baseDate) return null;
    const d = new Date(baseDate);
    if (isNaN(d.getTime())) return null;
    const y = d.getUTCFullYear();
    const m = String(d.getUTCMonth() + 1).padStart(2, "0");
    const dd = String(d.getUTCDate()).padStart(2, "0");
    return `${y}-${m}-${dd}`;
  };

  if (input === null || input === undefined || input === "") return useBase();

  const raw = str(input);
  if (!raw) return useBase();

  // 엑셀 직렬값
  if (/^\d{4,6}$/.test(raw)) {
    const serial = Number(raw);
    if (Number.isFinite(serial)) {
      const base = new Date(Date.UTC(1899, 11, 30)); // 1899-12-30
      base.setUTCDate(base.getUTCDate() + serial);
      const y = base.getUTCFullYear();
      const m = String(base.getUTCMonth() + 1).padStart(2, "0");
      const d = String(base.getUTCDate()).padStart(2, "0");
      return `${y}-${m}-${d}`;
    }
  }

  // 2025.11.09 / 2025/11/09 / 25-1-9 / 2025 11 09
  const norm = raw.replace(/[./\s]/g, "-");
  const m1 = norm.match(/^(\d{2,4})-(\d{1,2})-(\d{1,2})$/);
  if (m1) {
    let y = Number(m1[1]);
    const mm = Number(m1[2]);
    const dd = Number(m1[3]);
    if (y < 100) y += 2000;
    const d = new Date(Date.UTC(y, mm - 1, dd));
    if (!isNaN(d.getTime())) {
      const yy = d.getUTCFullYear();
      const mmm = String(d.getUTCMonth() + 1).padStart(2, "0");
      const ddd = String(d.getUTCDate()).padStart(2, "0");
      return `${yy}-${mmm}-${ddd}`;
    }
  }

  // 최후의 수단
  const d = new Date(raw);
  if (!isNaN(d.getTime())) {
    const y = d.getUTCFullYear();
    const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
    const dd = String(d.getUTCDate()).padStart(2, "0");
    return `${y}-${mm}-${dd}`;
  }

  return useBase();
}

/** 헤더 인덱스 매핑 */
function buildHeaderIndex(headerRow: any[]): Record<string, number> {
  const idx: Record<string, number> = {};
  const lower = headerRow.map((h) => str(h).toLowerCase());

  (Object.keys(H) as (keyof typeof H)[]).forEach((key) => {
    const candidates = H[key].map((s) => s.toLowerCase());
    const found = lower.findIndex((col) => candidates.some((c) => col.includes(c)));
    if (found >= 0) idx[key] = found;
  });

  return idx;
}

/** 중복 방지 키 */
function makeRowKey(o: { tx_date?: string | null; code?: string | null; item?: string | null; rowNo: number }) {
  return [
    o.tx_date || "",
    (o.code || "").replace(/\s+/g, ""),
    (o.item || "").replace(/\s+/g, ""),
    String(o.rowNo),
  ].join("|");
}

/** code가 비거나 "0"이면 name 또는 행번호로 대체 코드 생성 */
function makeErpCustomerCode(codeRaw: string, nameRaw: string, rowNo: number) {
  const code = (codeRaw || "").trim();
  if (code && code !== "0") return code;
  const name = (nameRaw || "").trim();
  if (name) {
    const slug = name.replace(/[^\p{L}\p{N}]+/gu, "").slice(0, 24); // 유니코드 글자/숫자만
    return slug || `UNK-${rowNo}`;
  }
  return `UNK-${rowNo}`;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method Not Allowed" });

  // Supabase (업서트 필요 → service key 사용)
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // baseDate: 필드/쿼리 둘 다 지원, 없으면 오늘
  const form = formidable({ multiples: false, keepExtensions: true });
  let fields: formidable.Fields, files: formidable.Files;
  try {
    [fields, files] = await new Promise((resolve, reject) => {
      form.parse(req, (err, f, fi) => (err ? reject(err) : resolve([f, fi])));
    });
  } catch (err: any) {
    return res.status(400).json({ error: `폼 파싱 실패: ${err.message}`, stage: "formidable" });
  }

  const getField = (k: string) => {
    const v = (fields as any)[k];
    return Array.isArray(v) ? v[0] : v;
  };

  const q = (k: string) => {
    const v = (req.query as any)[k];
    return Array.isArray(v) ? v[0] : v;
  };

  let baseDateRaw =
    getField("baseDate") ||
    getField("date") ||
    getField("startDate") ||
    q("baseDate") ||
    q("date") ||
    q("startDate");

  const today = new Date();
  const baseDate =
    baseDateRaw && String(baseDateRaw).trim()
      ? String(baseDateRaw)
      : `${today.getUTCFullYear()}-${String(today.getUTCMonth() + 1).padStart(2, "0")}-${String(
          today.getUTCDate()
        ).padStart(2, "0")}`;

  // 파일
  const fileObj = (files.file || files.upload || files.excel) as formidable.File | formidable.File[] | undefined;
  const fileOne = Array.isArray(fileObj) ? fileObj[0] : fileObj;
  if (!fileOne?.filepath) {
    return res.status(400).json({ error: "업로드 파일을 찾을 수 없습니다.(필드명: file)", stage: "nofile" });
  }

  // 엑셀 로드
  let workbook: XLSX.WorkBook;
  try {
    const buf = fs.readFileSync(fileOne.filepath);
    workbook = XLSX.read(buf, { type: "buffer" });
  } catch (err: any) {
    return res.status(400).json({ error: `엑셀 읽기 실패: ${err.message}`, stage: "xlsx" });
  }

  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  if (!sheet) return res.status(400).json({ error: "시트를 찾을 수 없습니다.", stage: "sheet" });

  const rows: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: true }) as any[][];
  if (!rows.length) return res.status(400).json({ error: "엑셀 내용이 비어 있습니다.", stage: "empty" });

  // 헤더 탐지 (최대 30행 스캔)
  let guessedHeaderRow = 0;
  let headerMap: Record<string, number> = {};
  for (let i = 0; i < Math.min(rows.length, 30); i++) {
    const m = buildHeaderIndex(rows[i]);
    if (Object.keys(m).length >= 2) {
      guessedHeaderRow = i;
      headerMap = m;
      break;
    }
  }
  if (!Object.keys(headerMap).length) {
    headerMap = buildHeaderIndex(rows[0] || []);
    guessedHeaderRow = 0;
  }
  const dataRows = rows.slice(guessedHeaderRow + 1);

  // 변환
  const valid: any[] = [];
  let total = 0;
  const rejected = { blank_row: 0, missing_date: 0 };
  const sample_in: any[] = [];
  const sample_out: any[] = [];

  dataRows.forEach((r, i) => {
    const joined = r.map((v: any) => str(v)).join("");
    if (!joined) {
      rejected.blank_row++;
      return;
    }

    // 헤더 미검출 대비: 첫 번째 컬럼을 날짜 후보로도 시도
    const rawDate: any = headerMap.date !== undefined ? r[headerMap.date] : r[0];

    const tx_date = toISODate(rawDate, baseDate);
    const code = str(headerMap.code !== undefined ? r[headerMap.code] : "");
    const name = str(headerMap.name !== undefined ? r[headerMap.name] : "");
    const item = str(headerMap.item !== undefined ? r[headerMap.item] : "");
    const spec = str(headerMap.spec !== undefined ? r[headerMap.spec] : "");
    const qty = toNumber(headerMap.qty !== undefined ? r[headerMap.qty] : null);
    const unit_price = toNumber(headerMap.unit_price !== undefined ? r[headerMap.unit_price] : null);
    const prev_balance = toNumber(headerMap.prev_balance !== undefined ? r[headerMap.prev_balance] : null);
    const curr_balance = toNumber(headerMap.curr_balance !== undefined ? r[headerMap.curr_balance] : null);
    const amount = toNumber(headerMap.amount !== undefined ? r[headerMap.amount] : null);
    const memo = str(headerMap.memo !== undefined ? r[headerMap.memo] : "");

    if (sample_in.length < 5) sample_in.push(r);

    // 날짜는 필수
    if (!tx_date) {
      rejected.missing_date++;
      return;
    }

    const erp_customer_code = makeErpCustomerCode(code, name, i + 1);

    const row: any = {
      tx_date, // YYYY-MM-DD
      code: code || null,
      name: name || null,
      item_name: item || null,
      spec: spec || null,
      qty,
      unit_price,
      prev_balance,
      curr_balance,
      amount,
      memo: memo || null,
      erp_customer_code, // NOT NULL 제약 대응
    };

    const erp_row_key = makeRowKey({ tx_date, code, item, rowNo: i + 1 });
    const out = { ...row, erp_row_key };

    if (sample_out.length < 5) sample_out.push(out);

    valid.push(out);
    total++;
  });

  // 업서트
  const CHUNK = 500;
  let upserted = 0;

  for (let off = 0; off < valid.length; off += CHUNK) {
    const chunk = valid.slice(off, off + CHUNK);
    if (!chunk.length) continue;

    const { data, error } = await supabase
      .from("ledger_entries")
      .upsert(chunk, { onConflict: "erp_row_key", ignoreDuplicates: false })
      .select("erp_row_key"); // ← 실제 영향받은 행 반환

    if (error) {
      return res.status(400).json({
        error: error.message,
        stage: "upsert",
        at: `${off}~${Math.min(off + CHUNK - 1, valid.length - 1)}`,
        debug: { guessedHeaderRow, headerMap, baseDate, rejected, sample_in, sample_out },
      });
    }

    // 삽입 + 업데이트된 행 수
    upserted += data?.length ?? 0;
  }

  return res.status(200).json({
    ok: true,
    stage: "done",
    total_rows_scanned: dataRows.length,
    total_valid: valid.length,
    upserted,
    used_baseDate: !!baseDateRaw,
    debug: { guessedHeaderRow, headerMap, baseDate, rejected, sample_in, sample_out },
  });
}
