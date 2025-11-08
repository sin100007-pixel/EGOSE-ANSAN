// app/api/ledger/import/route.ts
// CSV/XLSX 업로드 → Supabase 업서트
// 환경변수(.env / Vercel Env):
//   NEXT_PUBLIC_SUPABASE_URL=...
//   SUPABASE_SERVICE_ROLE_KEY=...  // 서버 전용, 클라이언트 노출 금지

import "server-only";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { parse as parseCsv } from "csv-parse/sync";
import * as XLSX from "xlsx";
import crypto from "node:crypto";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// ---------- 유틸 ----------
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
  return ""; // 날짜 확실치 않으면 빈 값(필터에서 걸러짐)
};

// ---------- 파일 파서 ----------
function rowsFromCSV(buf: Buffer): Raw[] {
  return parseCsv(buf, { columns: true, bom: true, skip_empty_lines: true, trim: true });
}

function rowsFromXLSX(buf: Buffer): Raw[] {
  const wb = XLSX.read(buf, { type: "buffer" });
  const ws = wb.Sheets[wb.SheetNames[0]];
  // 헤더가 여러줄일 수 있어서 header:1 로 원시 행렬을 받아와 탐지
  const arr = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" }) as any[][];
  return detectHeaderAndToObjects(arr);
}

// ---------- 헤더 자동 탐지 ----------
const LABELS = {
  code:   ["거래처코드","고객코드","코드","거래처ID","거래처 ID"],
  name:   ["거래처명","고객명","상호","거래처","업체명"],
  date:   ["출고일자","거래일자","매출일자","일자","전표일자","문서일자","판매일자"],
  docno:  ["전표번호","문서번호","전표No","전표NO","전표 no","전표"],
  lineno: ["행번호","라인번호","순번","no","No","NO","항번"],
  debit:  ["공급가","공급가액","금액","차변","매출액","판매금액","매출금액"],
  credit: ["부가세","세액","세","대변","VAT"],
  balance:["잔액","미수잔액","합계","총액","총합계"],
  desc:   ["적요","비고","내용","메모","품목규격","규격","상세","품명","품목"],
  rowkey: ["erp_row_key","고유키","rowkey","ROWKEY","키"],
};

const scoreCell = (cell: string, keys: string[]) =>
  keys.some(k => norm(cell).toLowerCase().includes(norm(k).toLowerCase())) ? 1 : 0;

function detectHeaderAndToObjects(table: any[][]): Raw[] {
  // 위쪽 10행에서 헤더 후보 탐색
  let headerRowIdx = 0, best = -1;
  for (let r = 0; r < Math.min(10, table.length); r++) {
    const row = table[r] || [];
    const s =
      row.reduce((a,c)=>a+scoreCell(String(c??""), LABELS.code),0) +
      row.reduce((a,c)=>a+scoreCell(String(c??""), LABELS.name),0) +
      row.reduce((a,c)=>a+scoreCell(String(c??""), LABELS.date),0) +
      row.reduce((a,c)=>a+scoreCell(String(c??""), LABELS.docno),0) +
      row.reduce((a,c)=>a+scoreCell(String(c??""), LABELS.lineno),0) +
      row.reduce((a,c)=>a+scoreCell(String(c??""), LABELS.debit),0) +
      row.reduce((a,c)=>a+scoreCell(String(c??""), LABELS.credit),0) +
      row.reduce((a,c)=>a+scoreCell(String(c??""), LABELS.balance),0) +
      row.reduce((a,c)=>a+scoreCell(String(c??""), LABELS.desc),0);
    if (s > best) { best = s; headerRowIdx = r; }
  }

  const headers = (table[headerRowIdx] || []).map((h:any)=>norm(String(h)));
  const rows = table.slice(headerRowIdx+1);

  const pick = (cands: string[]) => {
    for (let i=0;i<headers.length;i++){
      const h = headers[i].toLowerCase();
      if (cands.some(c=>h.includes(c.toLowerCase()))) return i;
    }
    return -1;
  };

  const idx = {
    code:   pick(LABELS.code),
    name:   pick(LABELS.name),
    date:   pick(LABELS.date),
    docno:  pick(LABELS.docno),
    lineno: pick(LABELS.lineno),
    debit:  pick(LABELS.debit),
    credit: pick(LABELS.credit),
    balance:pick(LABELS.balance),
    desc:   pick(LABELS.desc),
    rowkey: pick(LABELS.rowkey),
  };

  const out: Raw[] = [];
  for (const r of rows) {
    if (!Array.isArray(r) || r.every((x:any)=>norm(x)==="")) continue;
    const nm = idx.name >= 0 ? norm(r[idx.name]) : "";
    if (nm && /합계|총계/.test(nm)) continue;

    out.push({
      erp_customer_code: idx.code   >= 0 ? norm(r[idx.code])   : "",
      customer_name:     idx.name   >= 0 ? norm(r[idx.name])   : "",
      tx_date:           idx.date   >= 0 ? toISO(r[idx.date])  : "",
      doc_no:            idx.docno  >= 0 ? norm(r[idx.docno])  : "",
      line_no:           idx.lineno >= 0 ? norm(r[idx.lineno]) : "",
      description:       idx.desc   >= 0 ? norm(r[idx.desc])   : "",
      debit:             idx.debit  >= 0 ? toNum(r[idx.debit]) : 0,
      credit:            idx.credit >= 0 ? toNum(r[idx.credit]): 0,
      balance:           idx.balance>= 0 ? toNum(r[idx.balance]):0,
      erp_row_key:       idx.rowkey >= 0 ? norm(r[idx.rowkey]) : "",
      품명:              undefined, // 일보 보조용(없어도 동작)
      규격:              undefined
    });
  }
  return out;
}

// ---------- 핸들러 ----------
export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const file = form.get("file") as File | null;
    const baseDate = String(form.get("base_date") || ""); // YYYY-MM-DD(선택)
    if (!file) return NextResponse.json({ error: "파일이 없습니다." }, { status: 400 });

    const buf = Buffer.from(await file.arrayBuffer());
    const fname = (file.name || "").toLowerCase();
    const isXlsx = fname.endsWith(".xlsx") || fname.endsWith(".xls") || /sheet|excel/i.test(file.type || "");
    const raw = isXlsx ? rowsFromXLSX(buf) : rowsFromCSV(buf);

    const rows = raw
      .map((r, i) => {
        // 날짜: 없으면 base_date 사용(일보)
        let tx_date = r.tx_date || r.출고일자 || r.거래일자 || r.매출일자 || r.date || baseDate;
        tx_date = toISO(tx_date);

        // 거래처/코드
        let code = r.erp_customer_code || r.거래처코드 || r.고객코드 || r.코드 || "";
        let nameKor = r.customer_name || r.거래처명 || r.상호 || r.거래처 || "";

        // 전표형이면 문서/행 사용
        const doc_no  = r.doc_no || r.전표번호 || r.문서번호 || "";
        const line_no = r.line_no || r.행번호 || r.라인번호 || r.순번 || "";

        // 일보의 품명/규격/수량/단가/금액을 설명에 녹임(있을 때만)
        const item = r.품명 || r.품목 || "";
        const spec = r.규격 || "";
        const qty  = r.수량 ?? "";
        const price= r.단가 ?? "";
        const amount = r.매출금액 ?? r.금액 ?? "";

        const desc = norm(
          r.description || r.적요 || r.비고 || r.내용 ||
          [item, spec, qty && `x${qty}`, price && `@${price}`, amount && `=${amount}`]
            .filter(Boolean).join(" ")
        );

        // 금액 보정
        const debit   = toNum(r.debit ?? r.공급가 ?? r.공급가액 ?? r.금액 ?? r.매출금액 ?? amount);
        const credit  = toNum(r.credit ?? r.부가세 ?? r.세액 ?? 0);
        const balance = toNum(r.balance ?? 0);

        // 고유키: 우선 제공된 키 → 전표형 키 → 일보 해시
        let key = r.erp_row_key || r.rowkey || r.고유키 || "";
        if (!key) {
          if (doc_no || line_no) {
            key = `${tx_date}|${doc_no}|${line_no}|${code || nameKor}`;
          } else {
            key = crypto.createHash("sha1").update(
              [tx_date, code || nameKor, item, spec, toNum(qty), toNum(price), toNum(amount)].join("|")
            ).digest("hex");
          }
        }

        if (!code && nameKor) code = nameKor; // 코드 없으면 이름으로 대체 허용

        return {
          erp_customer_code: norm(code),
          customer_name: norm(nameKor),
          tx_date,
          doc_no: norm(doc_no),
          line_no: norm(line_no),
          description: desc,
          debit, credit, balance,
          erp_row_key: norm(key),
          updated_at: new Date().toISOString()
        };
      })
      // 필수: 날짜 + (코드 or 이름) + 키
      .filter(r => r.tx_date && (r.erp_customer_code || r.customer_name) && r.erp_row_key)
      // 합계/총계 행 제거
      .filter(r => !/합계|총계/i.test(r.customer_name || "") && !/합계|총계/i.test(r.description || ""));

    // 업서트
    let upserted = 0;
    for (let i = 0; i < rows.length; i += 1000) {
      const chunk = rows.slice(i, i + 1000);
      const { data, error } = await supabase
        .from("ledger_entries")
        .upsert(chunk, { onConflict: "erp_row_key" })
        .select(); // 일부 버전은 인자 1개만 허용
      if (error) throw error;
      upserted += data?.length ?? 0;
    }

    return NextResponse.json({ ok: true, file: fname, total: raw.length, valid: rows.length, upserted });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || String(e) }, { status: 500 });
  }
}
