// app/api/ledger/import/route.ts
// CSV/XLSX 업로드 → Supabase 업서트 (헤더 자동 탐지·한글 다양한 표기 흡수 강화)

import "server-only";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { parse as parseCsv } from "csv-parse/sync";
import * as XLSX from "xlsx";
import crypto from "node:crypto";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! // 서버 전용
);

type Raw = Record<string, any>;
const norm = (v: any) => String(v ?? "").trim();
const toNum = (v: any) => {
  const n = Number(String(v ?? "").replace(/[, ]/g, ""));
  return Number.isFinite(n) ? n : 0;
};
const toISO = (v: any) => {
  const t = norm(v);
  if (/^\d{4}-\d{2}-\d{2}$/.test(t)) return t;
  if (/^\d{8}$/.test(t)) return `${t.slice(0,4)}-${t.slice(4,6)}-${t.slice(6,8)}`;
  const n = Number(t);
  if (Number.isFinite(n) && n > 20000 && n < 80000) {
    const base = new Date(Date.UTC(1899,11,30));
    return new Date(base.getTime() + n*86400000).toISOString().slice(0,10);
  }
  return ""; // 날짜가 확실치 않으면 빈 값(필터에서 걸러짐)
};

// ---------- 파일 파서 ----------
function rowsFromCSV(buf: Buffer): Raw[] {
  return parseCsv(buf, { columns: true, bom: true, skip_empty_lines: true, trim: true });
}
function rowsFromXLSX(buf: Buffer): Raw[] {
  const wb = XLSX.read(buf, { type: "buffer" });
  const ws = wb.Sheets[wb.SheetNames[0]];
  // 머리말 행이 여러 줄인 경우 대비 위해 header 옵션 없이 로우로 읽어온 다음 헤더를 탐지한다.
  const arr = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" }) as any[][];
  return detectHeaderAndToObjects(arr);
}

// ---------- 헤더 자동 탐지 ----------
const LABELS = {
  code:  ["거래처코드","고객코드","코드","거래처ID","거래처 ID","거래처_코드","거래처코 드"],
  name:  ["거래처명","고객명","상호","거래처","업체명"],
  date:  ["출고일자","거래일자","매출일자","일자","전표일자","문서일자","판매일자"],
  docno: ["전표번호","문서번호","전표No","전표NO","전표 no","전표"],
  lineno:["행번호","라인번호","순번","no","No","NO","항번"],
  debit: ["공급가","공급가액","금액","차변","매출액","판매금액"],
  credit:["부가세","세액","세","대변","VAT"],
  balance:["잔액","미수잔액","합계","총액","총합계"],
  desc:  ["적요","비고","내용","메모","품목규격","규격","상세"],
  rowkey:["erp_row_key","고유키","rowkey","ROWKEY","키"]
};

function scoreHeaderCell(cell: string, keys: string[]): number {
  const t = norm(cell).toLowerCase();
  if (!t) return 0;
  return keys.some(k => t.includes(norm(k).toLowerCase())) ? 1 : 0;
}

function detectHeaderAndToObjects(table: any[][]): Raw[] {
  // 헤더 후보를 위쪽 10행까지 스캔
  const limit = Math.min(10, table.length);
  let headerRowIdx = -1;
  let bestScore = -1;

  for (let r = 0; r < limit; r++) {
    const row = table[r] || [];
    // 각 라벨 카테고리 중 5개 이상 매칭되면 유력
    const s =
      scoreRow(row, LABELS.code) +
      scoreRow(row, LABELS.name) +
      scoreRow(row, LABELS.date) +
      scoreRow(row, LABELS.docno) +
      scoreRow(row, LABELS.lineno) +
      scoreRow(row, LABELS.debit) +
      scoreRow(row, LABELS.credit) +
      scoreRow(row, LABELS.balance) +
      scoreRow(row, LABELS.desc) +
      scoreRow(row, LABELS.rowkey);

    if (s > bestScore) { bestScore = s; headerRowIdx = r; }
  }

  const headers = (table[headerRowIdx] || []).map((h: any) => norm(String(h)));
  const rows = table.slice(headerRowIdx + 1);

  // 헤더명을 표준 키로 매핑
  const mapIdx: Record<string, number> = {};
  function pickIndex(candidates: string[]): number {
    let idx = -1;
    for (let i = 0; i < headers.length; i++) {
      const h = headers[i];
      if (candidates.some(c => h.toLowerCase().includes(c.toLowerCase()))) { idx = i; break; }
    }
    return idx;
  }

  mapIdx["code"]   = pickIndex(LABELS.code);
  mapIdx["name"]   = pickIndex(LABELS.name);
  mapIdx["date"]   = pickIndex(LABELS.date);
  mapIdx["docno"]  = pickIndex(LABELS.docno);
  mapIdx["lineno"] = pickIndex(LABELS.lineno);
  mapIdx["debit"]  = pickIndex(LABELS.debit);
  mapIdx["credit"] = pickIndex(LABELS.credit);
  mapIdx["balance"]= pickIndex(LABELS.balance);
  mapIdx["desc"]   = pickIndex(LABELS.desc);
  mapIdx["rowkey"] = pickIndex(LABELS.rowkey);

  const out: Raw[] = [];
  for (const r of rows) {
    // 말줄임/빈행/합계행 제거
    const nm = mapIdx["name"] >= 0 ? norm(r[mapIdx["name"]]) : "";
    if (!Array.isArray(r) || r.every((x: any) => norm(x) === "")) continue;
    if (nm && /합계|총계/.test(nm)) continue;

    out.push({
      erp_customer_code: mapIdx["code"]   >= 0 ? norm(r[mapIdx["code"]])   : "",
      customer_name:     mapIdx["name"]   >= 0 ? norm(r[mapIdx["name"]])   : "",
      tx_date:           mapIdx["date"]   >= 0 ? toISO(r[mapIdx["date"]])  : "",
      doc_no:            mapIdx["docno"]  >= 0 ? norm(r[mapIdx["docno"]])  : "",
      line_no:           mapIdx["lineno"] >= 0 ? norm(r[mapIdx["lineno"]]) : "",
      description:       mapIdx["desc"]   >= 0 ? norm(r[mapIdx["desc"]])   : "",
      debit:             mapIdx["debit"]  >= 0 ? toNum(r[mapIdx["debit"]]) : 0,
      credit:            mapIdx["credit"] >= 0 ? toNum(r[mapIdx["credit"]]): 0,
      balance:           mapIdx["balance"]>= 0 ? toNum(r[mapIdx["balance"]]): 0,
      erp_row_key:       mapIdx["rowkey"] >= 0 ? norm(r[mapIdx["rowkey"]]) : "",
    });
  }
  return out;
}

function scoreRow(row: any[], keys: string[]): number {
  return row.reduce((acc, cell) => acc + scoreHeaderCell(String(cell ?? ""), keys), 0);
}

// ---------- 표준화 & 업서트 ----------
function buildKeyFallback(row: any, i: number) {
  const base = [
    norm(row.doc_no), norm(row.line_no), norm(row.tx_date),
    norm(row.customer_name), norm(row.erp_customer_code)
  ].join("|");
  return crypto.createHash("sha1").update(base || String(i)).digest("hex");
}

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const file = form.get("file") as File | null;
    if (!file) return NextResponse.json({ error: "파일이 없습니다." }, { status: 400 });

    const buf = Buffer.from(await file.arrayBuffer());
    const name = (file.name || "").toLowerCase();
    const isXlsx = name.endsWith(".xlsx") || name.endsWith(".xls") || /sheet|excel/i.test(file.type || "");
    const raw = isXlsx ? rowsFromXLSX(buf) : rowsFromCSV(buf);

    // 일부 컬럼 보정 + 필수 필터 간소화(거래처코드 없으면 이름으로 대체)
    const rows = raw.map((r, i) => {
      let tx_date = r.tx_date || r.출고일자 || r.거래일자 || r.매출일자 || r.date;
      tx_date = toISO(tx_date);

      let code = r.erp_customer_code || r.거래처코드 || r.고객코드 || "";
      let nameKor = r.customer_name || r.거래처명 || r.상호 || r.거래처 || "";
      if (!code && nameKor) code = nameKor; // 코드 없는 파일도 허용(이름으로 대체)

      const doc_no  = r.doc_no || r.전표번호 || r.문서번호 || "";
      const line_no = r.line_no || r.행번호 || r.라인번호 || r.순번 || "";
      const desc    = r.description || r.적요 || r.비고 || r.내용 || "";
      const debit   = toNum(r.debit ?? r.공급가 ?? r.공급가액 ?? r.금액 ?? r.매출액);
      const credit  = toNum(r.credit ?? r.부가세 ?? r.세액 ?? r.VAT);
      const balance = toNum(r.balance ?? r.잔액 ?? r.합계 ?? r.총액);
      const key     = r.erp_row_key || r.rowkey || r.고유키 || buildKeyFallback({doc_no,line_no,tx_date,customer_name:nameKor,erp_customer_code:code}, i);

      return {
        erp_customer_code: norm(code),
        customer_name: norm(nameKor),
        tx_date,
        doc_no: norm(doc_no),
        line_no: norm(line_no),
        description: norm(desc),
        debit, credit, balance,
        erp_row_key: norm(key),
        updated_at: new Date().toISOString()
      };
    })
    // 필수: 날짜 + (코드 or 이름) + 키
    .filter(r => r.tx_date && (r.erp_customer_code || r.customer_name) && r.erp_row_key)
    // 합계/총계 행 제거
    .filter(r => !/합계|총계/i.test(r.customer_name || "") && !/합계|총계/i.test(r.description || ""));

    // 배치 업서트
    let upserted = 0;
    for (let i=0;i<rows.length;i+=1000){
      const chunk = rows.slice(i,i+1000);
      const { data, error } = await supabase
        .from("ledger_entries")
        .upsert(chunk, { onConflict: "erp_row_key" })
        .select();
      if (error) th
