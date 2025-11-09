// pages/api/ledger-import.ts
import type { NextApiRequest, NextApiResponse } from "next";
import formidable from "formidable";
import * as XLSX from "xlsx";
import fs from "node:fs";
import { createClient } from "@supabase/supabase-js";

// Next.js에서 멀티파트 직접 처리
export const config = { api: { bodyParser: false } };

/* ────────────────────────────────────────────────────────────────────────── */
/* 공통 유틸                                                                  */
/* ────────────────────────────────────────────────────────────────────────── */
const S = (v: any) => (v == null ? "" : String(v).trim());
const N = (v: any): number | null => {
  const s = S(v).replace(/[, ]+/g, "");
  if (!s) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
};

/** 날짜 파서: baseDate를 기본값으로 사용 + 엑셀 직렬값/여러 포맷 허용 */
function toISODate(input: any, baseDate?: string | Date): string | null {
  const fallback = () => {
    if (!baseDate) return null;
    const d = new Date(baseDate);
    if (isNaN(d.getTime())) return null;
    const y = d.getUTCFullYear();
    const m = String(d.getUTCMonth() + 1).padStart(2, "0");
    const dd = String(d.getUTCDate()).padStart(2, "0");
    return `${y}-${m}-${dd}`;
  };

  if (input == null || input === "") return fallback();
  const raw = S(input);

  // 엑셀 직렬값 (1899-12-30 기준)
  if (/^\d{4,6}$/.test(raw)) {
    const serial = Number(raw);
    if (Number.isFinite(serial)) {
      const base = new Date(Date.UTC(1899, 11, 30));
      base.setUTCDate(base.getUTCDate() + serial);
      const y = base.getUTCFullYear();
      const m = String(base.getUTCMonth() + 1).padStart(2, "0");
      const d = String(base.getUTCDate()).padStart(2, "0");
      return `${y}-${m}-${d}`;
    }
  }

  // 2025.11.09 / 25-11-9 / 2025 11 09 등
  const norm = raw.replace(/[./\s]/g, "-");
  const m1 = norm.match(/^(\d{2,4})-(\d{1,2})-(\d{1,2})$/);
  if (m1) {
    let y = Number(m1[1]);
    const mm = Number(m1[2]);
    const dd = Number(m1[3]);
    if (y < 100) y += 2000;
    const d = new Date(Date.UTC(y, mm - 1, dd));
    if (!isNaN(d.getTime())) {
      return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(
        d.getUTCDate()
      ).padStart(2, "0")}`;
    }
  }

  const d = new Date(raw);
  if (!isNaN(d.getTime())) {
    return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(
      d.getUTCDate()
    ).padStart(2, "0")}`;
  }
  return fallback();
}

/* ────────────────────────────────────────────────────────────────────────── */
/* 헤더 감지(느슨 매핑)                                                       */
/* ────────────────────────────────────────────────────────────────────────── */
const H = {
  date: ["일자", "기준일", "날짜", "date", "tx_date"],
  code: ["코드", "거래처코드", "거래처 코드", "code"],
  name: ["거래처", "거래처명", "name", "customer", "거래처 이름"],
  item: ["품명", "품목", "상품명", "item", "product"],
  spec: ["규격", "스펙", "사양", "spec"],
  qty: ["수량", "qty", "수 량"],
  unit_price: ["단가", "unit price", "판매단가", "매출단가", "단 가"],
  amount: ["금액", "합계", "총액", "amount", "매출금액", "공급가액", "판매금액"],
  deposit: ["입금액", "입금", "입 금", "deposit", "credit"], // ★입금
  prev_balance: ["전일잔액", "전잔", "이월", "previous", "prev_balance", "전 잔 액"],
  curr_balance: ["금일잔액", "현재잔액", "curr", "curr_balance", "금 일 잔 액"],
  memo: ["비고", "메모", "note", "memo"],
} as const;

function buildHeaderIndex(headerRow: any[]): Record<string, number> {
  const idx: Record<string, number> = {};
  const lower = (headerRow || []).map((h) => S(h).toLowerCase());
  (Object.keys(H) as (keyof typeof H)[]).forEach((key) => {
    const candidates = H[key].map((s) => s.toLowerCase());
    const found = lower.findIndex((col) => candidates.some((c) => col.includes(c)));
    if (found >= 0) idx[key] = found;
  });
  return idx;
}

/* ────────────────────────────────────────────────────────────────────────── */
/* 키 생성                                                                    */
/* ────────────────────────────────────────────────────────────────────────── */
function makeRowKey(o: { tx_date?: string | null; code?: string | null; item?: string | null; rowNo: number }) {
  return [o.tx_date || "", (o.code || "").replace(/\s+/g, ""), (o.item || "").replace(/\s+/g, ""), String(o.rowNo)].join(
    "|"
  );
}
function makeErpCustomerCode(codeRaw: string, nameRaw: string, rowNo: number) {
  const code = (codeRaw || "").trim();
  if (code && code !== "0") return code;
  const name = (nameRaw || "").trim();
  if (name) {
    const slug = name.replace(/[^\p{L}\p{N}]+/gu, "").slice(0, 24);
    return slug || `UNK-${rowNo}`;
  }
  return `UNK-${rowNo}`;
}

/* ────────────────────────────────────────────────────────────────────────── */
/* 메인 핸들러                                                                */
/* ────────────────────────────────────────────────────────────────────────── */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method Not Allowed" });

  // Supabase (업서트이므로 service role 권장)
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY! // 필수
  );

  // multipart parsing (A안: any 허용)
  const form = formidable({ multiples: false, keepExtensions: true });
  let fields: any, files: any;
  try {
    [fields, files] = await new Promise((resolve, reject) => {
      (form as any).parse(req, (err: any, f: any, fi: any) => (err ? reject(err) : resolve([f, fi])));
    });
  } catch (err: any) {
    return res.status(400).json({ error: `폼 파싱 실패: ${err.message}`, stage: "formidable" });
  }

  // baseDate 추출 (폼/쿼리 모두 허용, 없으면 오늘)
  const getField = (k: string) => (Array.isArray(fields?.[k]) ? fields[k][0] : fields?.[k]);
  const q = (k: string) => {
    const v = (req.query as any)[k];
    return Array.isArray(v) ? v[0] : v;
  };

  let baseDateRaw =
    getField("baseDate") || getField("date") || getField("startDate") || q("baseDate") || q("date") || q("startDate");

  const today = new Date();
  const baseDate =
    baseDateRaw && String(baseDateRaw).trim()
      ? String(baseDateRaw)
      : `${today.getUTCFullYear()}-${String(today.getUTCMonth() + 1).padStart(2, "0")}-${String(
          today.getUTCDate()
        ).padStart(2, "0")}`;

  // 파일 찾기
  const fileObj = (files?.file || files?.upload || files?.excel) as any;
  const fileOne = Array.isArray(fileObj) ? fileObj[0] : fileObj;
  if (!fileOne?.filepath) {
    return res.status(400).json({ error: "업로드 파일을 찾을 수 없습니다.(필드명: file)", stage: "nofile" });
  }

  // 엑셀 로딩
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

  // 헤더 감지(최대 30행)
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

  /* ──────────────────────────────────────────────────────────────────────── */
  /* 변환/정규화                                                              */
  /* ──────────────────────────────────────────────────────────────────────── */
  const valid: any[] = [];
  const rejected = { blank_row: 0, missing_date: 0 };
  const sample_in: any[] = [];
  const sample_out: any[] = [];

  // 같은 블록에서 거래처 셀 생략된 경우 이어받기
  let lastNonEmptyName = "";
  let lastNonEmptyCode = "";

  dataRows.forEach((r, i) => {
    // 완전 빈 행 skip
    const joined = r.map((v: any) => S(v)).join("");
    if (!joined) {
      rejected.blank_row++;
      return;
    }

    const rawDate = headerMap.date !== undefined ? r[headerMap.date] : r[0];
    const tx_date = toISODate(rawDate, baseDate);
    if (!tx_date) {
      rejected.missing_date++;
      return;
    }

    // 기본 필드
    let code = S(headerMap.code !== undefined ? r[headerMap.code] : "");
    let name = S(headerMap.name !== undefined ? r[headerMap.name] : "");
    let item = S(headerMap.item !== undefined ? r[headerMap.item] : "");
    const spec = S(headerMap.spec !== undefined ? r[headerMap.spec] : "");

    // 숫자들
    let qty = N(headerMap.qty !== undefined ? r[headerMap.qty] : null);
    let unit_price = N(headerMap.unit_price !== undefined ? r[headerMap.unit_price] : null);
    let amount = N(headerMap.amount !== undefined ? r[headerMap.amount] : null);
    let deposit = N(headerMap.deposit !== undefined ? r[headerMap.deposit] : null);
    const prev_balance = N(headerMap.prev_balance !== undefined ? r[headerMap.prev_balance] : null);
    const curr_balance = N(headerMap.curr_balance !== undefined ? r[headerMap.curr_balance] : null);
    const memo = S(headerMap.memo !== undefined ? r[headerMap.memo] : "");

    if (sample_in.length < 5) sample_in.push(r);

    // 거래처 이어받기
    if (!name && lastNonEmptyName) name = lastNonEmptyName;
    if (!code && lastNonEmptyCode) code = lastNonEmptyCode;
    if (name) lastNonEmptyName = name;
    if (code) lastNonEmptyCode = code;

    // 소계 행 제거 (거래처가 "소계..." 로 시작)
    if (name.startsWith("소계")) return;

    // 입금행 판정 & 금액 이동
    const isDepositLike =
      /입금/.test(item.replace(/\s/g, "")) ||
      /입금/.test(spec.replace(/\s/g, "")) ||
      (!item && headerMap.deposit !== undefined); // 품명 공란 + deposit 열 존재

    if (isDepositLike) {
      const candidates: (number | null)[] = [];
      candidates.push(deposit);
      candidates.push(amount);
      candidates.push(curr_balance); // 일부 양식 대비
      const picked = candidates.find((v) => v !== null) ?? null;
      if (picked !== null) {
        deposit = picked;
        amount = null;
        // 수량/단가/품명은 입금 맥락에서 의미없음 (보존 원하면 주석)
        // qty = null;
        // unit_price = null;
        if (!item) item = "입금";
      }
    } else {
      // 매출행: qty*unit_price → amount
      if (amount == null && qty != null && unit_price != null) {
        amount = Math.round(qty * unit_price);
      }
    }

    const erp_customer_code = makeErpCustomerCode(code, name, i + 1);

    const row: any = {
      tx_date,
      code: code || null,
      name: name || null,
      item_name: item || null,
      spec: spec || null,
      qty,
      unit_price,
      amount,
      deposit, // ★ 저장
      prev_balance,
      curr_balance,
      memo: memo || null,
      erp_customer_code,
      row_no: i + 1, // ★ 엑셀 원본 행 순서 저장 → 조회 시 row_no ASC 정렬
    };

    const erp_row_key = makeRowKey({ tx_date, code, item, rowNo: i + 1 });
    const out = { ...row, erp_row_key };

    if (sample_out.length < 5) sample_out.push(out);
    valid.push(out);
  });

  /* ──────────────────────────────────────────────────────────────────────── */
  /* 업서트                                                                   */
  /* ──────────────────────────────────────────────────────────────────────── */
  const CHUNK = 500;
  let upserted = 0;

  try {
    for (let off = 0; off < valid.length; off += CHUNK) {
      const chunk = valid.slice(off, off + CHUNK);
      if (!chunk.length) continue;

      const { data, error } = await supabase
        .from("ledger_entries")
        .upsert(chunk, { onConflict: "erp_row_key", ignoreDuplicates: false })
        .select("erp_row_key"); // 실제 영향받은 행 반환

      if (error) {
        return res.status(400).json({
          error: error.message,
          stage: "upsert",
          at: `${off}~${Math.min(off + CHUNK - 1, valid.length - 1)}`,
          debug: { guessedHeaderRow, headerMap, baseDate, sample_in, sample_out },
        });
      }
      upserted += data?.length ?? 0;
    }
  } catch (e: any) {
    return res.status(400).json({ error: e.message || String(e), stage: "upsert-unknown" });
  }

  return res.status(200).json({
    ok: true,
    stage: "done",
    total_rows_scanned: dataRows.length,
    total_valid: valid.length,
    upserted,
    used_baseDate: !!baseDateRaw,
    debug: {
      guessedHeaderRow,
      headerMap,
      baseDate,
      sample_in,
      sample_out,
    },
  });
}
