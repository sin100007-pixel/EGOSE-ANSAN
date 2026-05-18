"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

type UploadResult =
  | {
      ok: true;
      used_baseDate: boolean;
      baseDate: string;
      uploadedAt: string;
      inserted: number;
      skipped: number;
      preview: any[];
      message?: string;
    }
  | {
      ok: false;
      message: string;
      detail?: any;
    };

type UploadDateResponse =
  | {
      ok: true;
      dates: { date: string; count: number }[];
    }
  | {
      ok: false;
      error: string;
      detail?: any;
    };

type MonthInfo = {
  year: number;
  month: number; // 1~12
  label: string;
};

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];

function formatYMD(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function getTodayYMD() {
  return formatYMD(new Date());
}

function getMonthInfo(base: Date): MonthInfo {
  return {
    year: base.getFullYear(),
    month: base.getMonth() + 1,
    label: `${base.getFullYear()}년 ${base.getMonth() + 1}월`,
  };
}

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month, 0).getDate();
}

function getFirstDayOfWeek(year: number, month: number) {
  return new Date(year, month - 1, 1).getDay();
}

function makeDateKey(year: number, month: number, day: number) {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export default function LedgerUploadPage() {
  const today = getTodayYMD();

  const [baseDate, setBaseDate] = useState(today);
  const [selectedFileName, setSelectedFileName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<UploadResult | null>(null);
  const [calendarLoading, setCalendarLoading] = useState(false);
  const [uploadDateMap, setUploadDateMap] = useState<Record<string, number>>({});

  const months = useMemo(() => {
    const now = new Date();
    const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const current = new Date(now.getFullYear(), now.getMonth(), 1);
    return [getMonthInfo(prev), getMonthInfo(current)];
  }, []);

  async function fetchUploadDates() {
    try {
      setCalendarLoading(true);

      const first = months[0];
      const last = months[months.length - 1];

      const from = makeDateKey(first.year, first.month, 1);
      const to = formatYMD(new Date(last.year, last.month, 0));

      const resp = await fetch(
        `/api/ledger-upload-dates?from=${from}&to=${to}`,
        { cache: "no-store" }
      );

      const data = (await resp.json()) as UploadDateResponse;

      if (!resp.ok || !data.ok) {
        console.error("업로드 날짜 조회 실패", data);
        setUploadDateMap({});
        return;
      }

      const nextMap: Record<string, number> = {};
      for (const item of data.dates) {
        nextMap[item.date] = item.count;
      }
      setUploadDateMap(nextMap);
    } catch (e) {
      console.error(e);
      setUploadDateMap({});
    } finally {
      setCalendarLoading(false);
    }
  }

  useEffect(() => {
    fetchUploadDates();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    const form = e.currentTarget;
    const formData = new FormData(form);

    const file = formData.get("file");
    if (!(file instanceof File) || !file.name) {
      alert("업로드할 파일을 선택해줘.");
      return;
    }

    formData.set("base_date", baseDate);

    setIsSubmitting(true);
    setResult(null);

    try {
      const resp = await fetch("/api/ledger-import", {
        method: "POST",
        body: formData,
      });

      const data = (await resp.json()) as UploadResult;
      setResult(data);

      if (resp.ok && data.ok) {
        await fetchUploadDates();
      }
    } catch (err: any) {
      setResult({
        ok: false,
        message: "업로드 요청 중 오류",
        detail: err?.message || String(err),
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  function renderCalendar(monthInfo: MonthInfo) {
    const { year, month, label } = monthInfo;
    const firstDay = getFirstDayOfWeek(year, month);
    const daysInMonth = getDaysInMonth(year, month);

    const blanks = Array.from({ length: firstDay }, (_, idx) => (
      <div key={`blank-${year}-${month}-${idx}`} />
    ));

    const days = Array.from({ length: daysInMonth }, (_, idx) => {
      const day = idx + 1;
      const dateKey = makeDateKey(year, month, day);
      const uploaded = Boolean(uploadDateMap[dateKey]);
      const selected = baseDate === dateKey;
      const isToday = today === dateKey;

      return (
        <button
          key={dateKey}
          type="button"
          onClick={() => setBaseDate(dateKey)}
          style={{
            position: "relative",
            minHeight: 54,
            borderRadius: 12,
            border: selected
              ? "2px solid #ffd46a"
              : uploaded
              ? "1px solid rgba(51, 212, 114, 0.7)"
              : "1px solid rgba(255,255,255,0.12)",
            background: uploaded
              ? "rgba(51, 212, 114, 0.15)"
              : "rgba(255,255,255,0.04)",
            color: "#fff",
            cursor: "pointer",
            padding: "8px 10px",
            textAlign: "left",
          }}
        >
          <div style={{ fontSize: 15, fontWeight: 700, opacity: isToday ? 1 : 0.95 }}>
            {day}
          </div>

          {uploaded ? (
            <div
              style={{
                position: "absolute",
                right: 8,
                top: 8,
                width: 20,
                height: 20,
                borderRadius: "999px",
                background: "#28c76f",
                color: "#05130a",
                fontSize: 13,
                fontWeight: 900,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 4px 10px rgba(40,199,111,0.35)",
              }}
              title={`업로드 데이터 있음 (${uploadDateMap[dateKey]}건)`}
            >
              ✓
            </div>
          ) : null}

          <div
            style={{
              marginTop: 6,
              fontSize: 11,
              opacity: 0.75,
            }}
          >
            {selected ? "기준일 선택됨" : uploaded ? "업로드 있음" : ""}
          </div>

          {isToday ? (
            <div
              style={{
                position: "absolute",
                left: 8,
                bottom: 8,
                fontSize: 10,
                opacity: 0.75,
              }}
            >
              TODAY
            </div>
          ) : null}
        </button>
      );
    });

    return (
      <div
        key={`${year}-${month}`}
        style={{
          border: "1px solid rgba(255,255,255,0.12)",
          borderRadius: 18,
          padding: 16,
          background: "rgba(255,255,255,0.03)",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 12,
          }}
        >
          <div style={{ fontSize: 18, fontWeight: 800 }}>{label}</div>
          <div style={{ fontSize: 12, opacity: 0.75 }}>
            체크된 날짜 = 업로드 있음
          </div>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(7, 1fr)",
            gap: 8,
            marginBottom: 8,
          }}
        >
          {WEEKDAYS.map((day) => (
            <div
              key={`${label}-${day}`}
              style={{
                textAlign: "center",
                fontSize: 12,
                opacity: 0.7,
                fontWeight: 700,
                padding: "4px 0",
              }}
            >
              {day}
            </div>
          ))}
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(7, 1fr)",
            gap: 8,
          }}
        >
          {blanks}
          {days}
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        maxWidth: 1100,
        margin: "40px auto",
        padding: "0 16px 40px",
        color: "#fff",
      }}
    >
      <h2 style={{ fontSize: 40, lineHeight: 1.2, marginBottom: 24, fontWeight: 900 }}>
        원장 업로드 (CSV/XLSX)
      </h2>

      <div
        style={{
          border: "1px solid rgba(255,255,255,0.12)",
          borderRadius: 20,
          padding: 20,
          background: "rgba(255,255,255,0.04)",
          marginBottom: 22,
        }}
      >
        <form onSubmit={handleSubmit}>
          <div style={{ display: "grid", gap: 14 }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 8 }}>
                파일 선택
              </div>
              <input
                type="file"
                name="file"
                accept=".csv,.xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
                required
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  setSelectedFileName(file?.name ?? "");
                }}
              />
              <div style={{ marginTop: 8, fontSize: 13, opacity: 0.8 }}>
                {selectedFileName ? `선택 파일: ${selectedFileName}` : "선택된 파일 없음"}
              </div>
            </div>

            <div>
              <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 8 }}>
                기준일
              </div>
              <input
                type="date"
                name="base_date"
                value={baseDate}
                onChange={(e) => setBaseDate(e.target.value)}
                required
                style={{
                  minWidth: 180,
                  height: 40,
                  borderRadius: 10,
                  border: "1px solid rgba(255,255,255,0.16)",
                  background: "rgba(255,255,255,0.08)",
                  color: "#fff",
                  padding: "0 12px",
                }}
              />
              <div style={{ marginTop: 8, fontSize: 12, opacity: 0.75 }}>
                아래 달력 날짜를 누르면 기준일이 자동으로 들어가.
              </div>
            </div>

            <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
              <button
                type="submit"
                disabled={isSubmitting}
                style={{
                  height: 44,
                  padding: "0 18px",
                  borderRadius: 12,
                  border: "none",
                  background: isSubmitting ? "#6a6f88" : "#3f7cff",
                  color: "#fff",
                  fontSize: 15,
                  fontWeight: 800,
                  cursor: isSubmitting ? "default" : "pointer",
                }}
              >
                {isSubmitting ? "업로드 중..." : "업로드 & 반영"}
              </button>

              <button
                type="button"
                onClick={fetchUploadDates}
                disabled={calendarLoading}
                style={{
                  height: 44,
                  padding: "0 16px",
                  borderRadius: 12,
                  border: "1px solid rgba(255,255,255,0.16)",
                  background: "rgba(255,255,255,0.06)",
                  color: "#fff",
                  fontSize: 14,
                  fontWeight: 700,
                  cursor: calendarLoading ? "default" : "pointer",
                }}
              >
                {calendarLoading ? "달력 새로고침 중..." : "달력 새로고침"}
              </button>
            </div>
          </div>
        </form>

        <div style={{ marginTop: 14, fontSize: 13, opacity: 0.8, lineHeight: 1.6 }}>
          • 초록 체크(✓)가 있는 날짜는 해당 <b>기준일(tx_date)</b>로 업로드된 원장 데이터가 있다는 뜻이야.
          <br />
          • 전달 + 이번달 달력만 보여주도록 해놨어.
        </div>
      </div>

      {result ? (
        <div
          style={{
            marginBottom: 22,
            borderRadius: 16,
            padding: 16,
            background: result.ok
              ? "rgba(40,199,111,0.14)"
              : "rgba(255,91,91,0.14)",
            border: result.ok
              ? "1px solid rgba(40,199,111,0.45)"
              : "1px solid rgba(255,91,91,0.45)",
          }}
        >
          <div style={{ fontSize: 16, fontWeight: 900, marginBottom: 8 }}>
            {result.ok ? "업로드 성공" : "업로드 실패"}
          </div>

          {result.ok ? (
            <div style={{ fontSize: 14, lineHeight: 1.8 }}>
              <div>기준일: {result.baseDate}</div>
              <div>저장 건수: {result.inserted.toLocaleString()}건</div>
              <div>스킵 건수: {result.skipped.toLocaleString()}건</div>
              <div>메시지: {result.message ?? "-"}</div>
            </div>
          ) : (
            <div style={{ fontSize: 14, lineHeight: 1.8 }}>
              <div>메시지: {result.message}</div>
              {result.detail ? <div>상세: {String(result.detail)}</div> : null}
            </div>
          )}
        </div>
      ) : null}

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
          gap: 16,
        }}
      >
        {months.map(renderCalendar)}
      </div>
    </div>
  );
}