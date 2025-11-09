"use client";

export default function LedgerUploadPage() {
  return (
    <div style={{ maxWidth: 560, margin: "40px auto", color: "#fff" }}>
      <h2>원장 업로드 (CSV/XLSX)</h2>

      {/* ✅ JS 없이 순수 HTML 폼 → Pages API로 직결 */}
      <form
        method="POST"
        action="/api/ledger-import"
        encType="multipart/form-data"
        target="_blank"   // 응답 JSON을 새 탭에서 바로 확인(디버그용)
      >
        <div style={{ margin: "16px 0" }}>
          <input
            type="file"
            name="file"
            accept=".csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
            required
          />
        </div>
        <div style={{ margin: "16px 0" }}>
          <label>
            기준일:
            <input type="date" name="base_date" required style={{ marginLeft: 8 }} />
          </label>
        </div>

        <button type="submit">업로드 & 반영</button>
      </form>

      <p style={{ opacity: 0.8, marginTop: 12 }}>
        ※ 응답(JSON)이 새 탭에 열리면 성공입니다. (route: "pages/api/ledger-import" 표시)
      </p>
    </div>
  );
}
