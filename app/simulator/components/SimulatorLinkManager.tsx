"use client";

import { useEffect, useState } from "react";
import SimulatorLinkTabs from "./SimulatorLinkTabs";

type ManagedLink = {
  id: string;
  token: string;
  installer_name: string | null;
  customer_name: string | null;
  memo: string | null;
  expires_at: string;
  created_at: string;
  is_active: boolean;
  is_expired: boolean;
  film_scope: "all" | "custom";
  space_count: number;
  film_count: number;
  url: string;
  query_url: string;
};

const COLORS = {
  bg: "#05023B",
  panel: "rgba(12,10,72,0.74)",
  panelStrong: "rgba(10,8,72,0.94)",
  cream: "#EEE0C5",
  creamText: "#7A5A34",
  line: "rgba(238,224,197,0.16)",
  soft: "rgba(255,255,255,0.70)",
  white: "#FFFFFF",
};

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleString("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getStatus(link: ManagedLink) {
  if (!link.is_active) return "비활성";
  if (link.is_expired) return "만료";
  return "사용 가능";
}

function getStatusClass(link: ManagedLink) {
  if (!link.is_active || link.is_expired) return "statusExpired";
  return "statusActive";
}

export default function SimulatorLinkManager() {
  const [items, setItems] = useState<ManagedLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [deactivatingId, setDeactivatingId] = useState("");
  const [error, setError] = useState("");
  const [copyMessage, setCopyMessage] = useState("");

  const loadLinks = async () => {
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/simulator/links", {
        cache: "no-store",
      });
      const json = await res.json();

      if (!res.ok) {
        setError(json.error || "링크 목록을 불러오지 못했습니다.");
        return;
      }

      setItems(Array.isArray(json.items) ? json.items : []);
    } catch {
      setError("링크 목록을 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadLinks();
  }, []);

  const copyLink = async (url: string) => {
    setCopyMessage("");

    try {
      await navigator.clipboard.writeText(url);
      setCopyMessage("링크를 복사했습니다.");
    } catch {
      setCopyMessage("복사에 실패했습니다. 링크를 직접 선택해서 복사해주세요.");
    }
  };

  const deactivateLink = async (link: ManagedLink) => {
    const ok = window.confirm(
      `${link.customer_name || "고객명 없음"} 링크를 비활성화할까요?\n비활성화하면 고객이 더 이상 이 링크로 접속할 수 없습니다.`
    );

    if (!ok) return;

    setDeactivatingId(link.id);
    setError("");
    setCopyMessage("");

    try {
      const res = await fetch("/api/simulator/links", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ id: link.id }),
      });

      const json = await res.json();

      if (!res.ok) {
        setError(json.error || "링크를 비활성화하지 못했습니다.");
        return;
      }

      setItems((prev) =>
        prev.map((item) =>
          item.id === link.id ? { ...item, is_active: false } : item
        )
      );
    } catch {
      setError("링크를 비활성화하지 못했습니다.");
    } finally {
      setDeactivatingId("");
    }
  };

  return (
    <main className="page">
      <div className="pageInner">
        <a href="/dashboard" className="backButton">
          ← 대시보드
        </a>

        <section className="heroCard">
          <div className="stepBadge">고객 링크 관리</div>
          <h1>보낸 링크 내역</h1>
          <p>
            내가 만든 시뮬레이션 링크의 고객명, 메모, 만료일, 허용 공간과 필름 범위를 확인하고 비활성화할 수 있습니다.
          </p>
        </section>

        <section className="panel">
          <div className="listHeader">
            <div>
              <h2>링크 목록</h2>
              <p>최근 생성한 링크부터 표시됩니다.</p>
            </div>

            <button type="button" onClick={() => void loadLinks()} className="refreshButton">
              새로고침
            </button>
          </div>

          {error ? <div className="errorBox">{error}</div> : null}
          {copyMessage ? <div className="copyBox">{copyMessage}</div> : null}

          {loading ? (
            <div className="emptyBox">링크 목록을 불러오는 중...</div>
          ) : items.length === 0 ? (
            <div className="emptyBox">
              아직 만든 고객 링크가 없습니다. 하단의 <b>링크 생성</b>에서 새 링크를 만들어보세요.
            </div>
          ) : (
            <div className="linkList">
              {items.map((link) => (
                <article key={link.id} className="linkCard">
                  <div className="cardTop">
                    <div>
                      <div className="customerName">
                        {link.customer_name || "고객명 없음"}
                      </div>
                      <div className="memoText">
                        {link.memo || "메모 없음"}
                      </div>
                    </div>

                    <span className={`statusBadge ${getStatusClass(link)}`}>
                      {getStatus(link)}
                    </span>
                  </div>

                  <div className="infoGrid">
                    <div>
                      <span>생성일</span>
                      <strong>{formatDate(link.created_at)}</strong>
                    </div>
                    <div>
                      <span>유효기간</span>
                      <strong>{formatDate(link.expires_at)}</strong>
                    </div>
                    <div>
                      <span>허용 공간</span>
                      <strong>{link.space_count}개</strong>
                    </div>
                    <div>
                      <span>필름 범위</span>
                      <strong>
                        {link.film_scope === "all"
                          ? "삼성필름 전체"
                          : `선택 필름 ${link.film_count}개`}
                      </strong>
                    </div>
                  </div>

                  <div className="urlBox">{link.url}</div>

                  <div className="actionRow">
                    <button type="button" onClick={() => copyLink(link.url)}>
                      링크 복사
                    </button>

                    <a href={link.url} target="_blank" rel="noreferrer">
                      열어보기
                    </a>

                    <button
                      type="button"
                      onClick={() => deactivateLink(link)}
                      disabled={deactivatingId === link.id || !link.is_active}
                      className="deleteButton"
                    >
                      {!link.is_active
                        ? "비활성됨"
                        : deactivatingId === link.id
                          ? "처리 중"
                          : "비활성화"}
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>

      <SimulatorLinkTabs active="manage" />

      <style jsx>{`
        .page {
          min-height: 100vh;
          padding-bottom: 96px;
          box-sizing: border-box;
          background:
            radial-gradient(circle at top left, rgba(238, 224, 197, 0.1), transparent 24%),
            radial-gradient(circle at top right, rgba(255, 255, 255, 0.08), transparent 20%),
            linear-gradient(180deg, #060241 0%, ${COLORS.bg} 100%);
          color: ${COLORS.white};
        }

        .pageInner {
          width: min(980px, 100%);
          margin: 0 auto;
          padding: 18px 16px 56px;
          box-sizing: border-box;
        }

        .backButton {
          display: inline-flex;
          align-items: center;
          border: 1px solid ${COLORS.line};
          border-radius: 999px;
          padding: 10px 14px;
          background: ${COLORS.panelStrong};
          color: ${COLORS.cream};
          text-decoration: none;
          font-size: 14px;
          font-weight: 900;
          margin-bottom: 14px;
        }

        .heroCard,
        .panel,
        .linkCard {
          border: 1px solid ${COLORS.line};
          box-shadow: 0 18px 48px rgba(0, 0, 0, 0.22);
          background: ${COLORS.panel};
        }

        .heroCard {
          border-radius: 30px;
          padding: 22px 18px;
          background: linear-gradient(180deg, rgba(255, 255, 255, 0.08), rgba(255, 255, 255, 0.03));
          margin-bottom: 18px;
        }

        .stepBadge {
          display: inline-flex;
          border-radius: 999px;
          padding: 7px 11px;
          background: rgba(238, 224, 197, 0.1);
          color: ${COLORS.cream};
          font-size: 13px;
          font-weight: 900;
          margin-bottom: 12px;
        }

        h1 {
          margin: 0;
          font-size: clamp(28px, 5vw, 44px);
          line-height: 1.08;
          letter-spacing: -0.04em;
        }

        .heroCard p {
          margin: 12px 0 0;
          color: ${COLORS.soft};
          font-size: 15px;
          line-height: 1.7;
          word-break: keep-all;
        }

        .panel {
          border-radius: 28px;
          padding: 18px;
        }

        .listHeader {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 12px;
          margin-bottom: 14px;
        }

        .listHeader h2 {
          margin: 0;
          color: ${COLORS.cream};
          font-size: 22px;
          letter-spacing: -0.03em;
        }

        .listHeader p {
          margin: 6px 0 0;
          color: ${COLORS.soft};
          font-size: 13px;
        }

        .refreshButton,
        .actionRow button,
        .actionRow a {
          border: none;
          border-radius: 14px;
          min-height: 40px;
          padding: 0 13px;
          background: ${COLORS.cream};
          color: ${COLORS.creamText};
          font-size: 13px;
          font-weight: 900;
          text-decoration: none;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
        }

        .linkList {
          display: grid;
          gap: 12px;
        }

        .linkCard {
          border-radius: 22px;
          padding: 14px;
          background: rgba(255, 255, 255, 0.045);
        }

        .cardTop {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 12px;
          margin-bottom: 12px;
        }

        .customerName {
          color: ${COLORS.cream};
          font-size: 18px;
          font-weight: 900;
          line-height: 1.3;
        }

        .memoText {
          color: ${COLORS.soft};
          font-size: 13px;
          line-height: 1.45;
          margin-top: 4px;
        }

        .statusBadge {
          flex-shrink: 0;
          border-radius: 999px;
          padding: 7px 10px;
          font-size: 12px;
          font-weight: 900;
        }

        .statusActive {
          background: rgba(238, 224, 197, 0.14);
          color: ${COLORS.cream};
          border: 1px solid rgba(238, 224, 197, 0.35);
        }

        .statusExpired {
          background: rgba(255, 96, 96, 0.12);
          color: #ffd6d6;
          border: 1px solid rgba(255, 96, 96, 0.28);
        }

        .infoGrid {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 8px;
          margin-bottom: 10px;
        }

        .infoGrid div {
          border-radius: 15px;
          padding: 10px;
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid ${COLORS.line};
          min-width: 0;
        }

        .infoGrid span {
          display: block;
          color: ${COLORS.soft};
          font-size: 11px;
          margin-bottom: 4px;
        }

        .infoGrid strong {
          display: block;
          color: ${COLORS.white};
          font-size: 12px;
          line-height: 1.35;
          word-break: keep-all;
        }

        .urlBox {
          border-radius: 15px;
          padding: 11px;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid ${COLORS.line};
          color: ${COLORS.soft};
          font-size: 12px;
          line-height: 1.45;
          word-break: break-all;
          margin-bottom: 10px;
        }

        .actionRow {
          display: grid;
          grid-template-columns: 1fr 1fr 1fr;
          gap: 8px;
        }

        .actionRow .deleteButton {
          background: rgba(255, 255, 255, 0.06);
          color: #ffd6d6;
          border: 1px solid rgba(255, 96, 96, 0.24);
        }

        .actionRow button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .emptyBox,
        .errorBox,
        .copyBox {
          border-radius: 16px;
          padding: 14px;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid ${COLORS.line};
          color: ${COLORS.soft};
          font-size: 13px;
          line-height: 1.6;
          margin-bottom: 12px;
        }

        .errorBox {
          color: #ffd6d6;
          background: rgba(120, 20, 20, 0.22);
        }

        .copyBox {
          color: ${COLORS.cream};
          background: rgba(238, 224, 197, 0.1);
        }

        @media (max-width: 720px) {
          .infoGrid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
        }

        @media (max-width: 640px) {
          .pageInner {
            padding: 12px 10px 36px;
          }

          .heroCard,
          .panel {
            border-radius: 22px;
            padding: 14px;
          }

          h1 {
            font-size: 27px;
          }

          .listHeader {
            align-items: stretch;
            flex-direction: column;
          }

          .refreshButton {
            width: 100%;
          }

          .actionRow {
            grid-template-columns: 1fr;
          }

          .customerName {
            font-size: 16px;
          }
        }
      `}</style>
    </main>
  );
}
