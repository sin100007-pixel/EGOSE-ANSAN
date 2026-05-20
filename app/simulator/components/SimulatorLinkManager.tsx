"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import SimulatorLinkTabs from "./SimulatorLinkTabs";
import SimulatorAdminTutorial, {
  type SimulatorAdminTutorialStep,
} from "./SimulatorAdminTutorial";

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
  film_scope: "all" | "custom" | "preset";
  preset_name: string | null;
  space_count: number;
  film_count: number;
  url: string;
  query_url: string;
};

const CUSTOMER_SHARE_MESSAGE = [
  "필름 시뮬레이터, 시뮬봇!",
  "",
  "대표적인 공간 이미지에 500여가지 필름을 적용해, 조합에 따른 뉘앙스를 보여드립니다.",
  "",
  "*Chrome(크롬브라우저)에 최적화되어 있습니다.",
  "",
  "아래 링크를 눌러 실행해주세요.",
].join("\n");

const TUTORIAL_DEMO_LINK_ID = "__link_manager_tutorial_demo__";

function createTutorialDemoLink(): ManagedLink {
  const now = new Date();
  const expires = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  return {
    id: TUTORIAL_DEMO_LINK_ID,
    token: "tutorial-demo",
    installer_name: "도움말",
    customer_name: "도움말 예시 고객",
    memo: "실제 저장된 링크가 아닌 안내용 예시입니다.",
    expires_at: expires.toISOString(),
    created_at: now.toISOString(),
    is_active: true,
    is_expired: false,
    film_scope: "all",
    preset_name: null,
    space_count: 1,
    film_count: 0,
    url: "https://egose.co.kr/simulator/share/example",
    query_url: "https://egose.co.kr/simulator/share/example",
  };
}

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

const LINK_MANAGER_TUTORIAL_STEPS = [
  {
    id: "manage-start",
    target: "manage-hero",
    title: "보낸 링크를 관리하는 화면입니다",
    description:
      "고객에게 보낸 시뮬레이터 링크의 고객명, 메모, 만료일, 허용 공간과 필름 범위를 한 번에 확인할 수 있습니다.",
    tip: "만료되었거나 삭제 및 비활성화한 링크는 고객이 더 이상 사용할 수 없도록 목록에서 제외됩니다.",
  },
  {
    id: "manage-list",
    target: "manage-list",
    title: "현재 배포중인 링크들 목록입니다.",
    description:
      "만료되거나 삭제된 링크는 자동으로 삭제됩니다.",
  },
  {
    id: "manage-card",
    target: "manage-card",
    title: "링크의 상세정보를볼 수 있습니다.",
    description:
      "생성일과, 유효기간, 허용된 공간, 필름 허용범위까지 한눈에 볼 수 있습니다.",
    scrollBlock: "center",
  },
  {
    id: "manage-copy",
    target: "manage-copy",
    title: "링크복사",
    description:
      "링크를 복사해 문자나 카카오톡에 붙여넣기로 고객에게 보낼 수 있어요.",
    scrollBlock: "center",
    cardPlacement: "top",
  },
  {
    id: "manage-open",
    target: "manage-open",
    title: "열어보기",
    description:
      "테스트 용도입니다. 링크를 받은 고객이 보게될 화면을 열어볼 수 있어요.",
    scrollBlock: "center",
    cardPlacement: "top",
  },
  {
    id: "manage-delete",
    target: "manage-delete",
    title: "삭제 및 비활성화",
    description:
      "링크를 폐기합니다. 폐기된 링크는 즉시 사용불가하고, 링크 목록에서도 지워집니다.",
    scrollBlock: "center",
    cardPlacement: "top",
  },
] satisfies readonly SimulatorAdminTutorialStep[];

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

function isVisibleLink(link: ManagedLink) {
  if (!link.is_active || link.is_expired) return false;

  const expiresTime = new Date(link.expires_at).getTime();
  if (Number.isNaN(expiresTime)) return false;

  return Date.now() <= expiresTime;
}

function getStatus(link: ManagedLink) {
  if (!link.is_active) return "비활성";
  if (!isVisibleLink(link)) return "만료";
  return "사용 가능";
}

function getStatusClass(link: ManagedLink) {
  if (!isVisibleLink(link)) return "statusExpired";
  return "statusActive";
}

export default function SimulatorLinkManager() {
  const router = useRouter();
  const [isDashboardMoving, setIsDashboardMoving] = useState(false);

  const [items, setItems] = useState<ManagedLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [deactivatingId, setDeactivatingId] = useState("");
  const [error, setError] = useState("");
  const [copyMessage, setCopyMessage] = useState("");

  useEffect(() => {
    router.prefetch("/dashboard");
    const idle = window.setTimeout(() => {
      router.prefetch("/dashboard");
    }, 250);

    return () => {
      window.clearTimeout(idle);
    };
  }, [router]);

  const paintThenNavigateToDashboard = () => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        router.push("/dashboard");
      });
    });
  };

  const goToDashboard = () => {
    if (isDashboardMoving) return;

    setIsDashboardMoving(true);
    router.prefetch("/dashboard");
    paintThenNavigateToDashboard();
  };

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

      setItems(
        Array.isArray(json.items) ? json.items.filter(isVisibleLink) : [],
      );
    } catch {
      setError("링크 목록을 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadLinks();

    const expireTimer = window.setInterval(() => {
      setItems((prev) => prev.filter(isVisibleLink));
    }, 30000);

    return () => {
      window.clearInterval(expireTimer);
    };
  }, []);

  const shouldShowTutorialDemo = !loading && !error && items.length === 0;
  const displayItems = shouldShowTutorialDemo
    ? [createTutorialDemoLink()]
    : items;

  const showTutorialDemoMessage = () => {
    setCopyMessage("도움말 안내용 예시 카드라 실제 작업은 실행되지 않습니다.");
  };

  const copyLink = async (url: string) => {
    setCopyMessage("");

    const message = `${CUSTOMER_SHARE_MESSAGE}\n\n${url}`;

    try {
      await navigator.clipboard.writeText(message);
      setCopyMessage("안내 문구와 링크를 복사했습니다.");
    } catch {
      setCopyMessage("복사에 실패했습니다. 링크를 직접 선택해서 복사해주세요.");
    }
  };

  const deactivateLink = async (link: ManagedLink) => {
    const ok = window.confirm(
      `${link.customer_name || "고객명 없음"} 링크를 삭제 및 비활성화할까요?\n목록에서 사라지고 고객이 더 이상 이 링크로 접속할 수 없습니다.`,
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
        setError(json.error || "링크를 삭제 및 비활성화하지 못했습니다.");
        return;
      }

      setItems((prev) => prev.filter((item) => item.id !== link.id));
      setCopyMessage("링크를 목록에서 제거했습니다.");
    } catch {
      setError("링크를 삭제 및 비활성화하지 못했습니다.");
    } finally {
      setDeactivatingId("");
    }
  };

  return (
    <main className="page">
      <div className="pageInner">
        {isDashboardMoving ? (
          <div className="dashboardMoveOverlay" aria-live="polite">
            <div className="dashboardMoveToast">대시보드로 이동 중...</div>
          </div>
        ) : null}
        <button
          type="button"
          onClick={goToDashboard}
          className="backButton"
          disabled={isDashboardMoving}
        >
          ← 대시보드
        </button>

        <section className="heroCard" data-sim-admin-guide="manage-hero">
          <div className="stepBadge">고객 링크 관리</div>
          <h1>보낸 링크 내역</h1>
          <p>
            내가 만든 시뮬레이션 링크의 고객명, 메모, 만료일, 허용 공간과 필름
            범위를 확인하고 삭제 및 비활성화할 수 있습니다.
          </p>
        </section>

        <SimulatorAdminTutorial
          storageKey="link-manager-guide-choice-v1"
          steps={LINK_MANAGER_TUTORIAL_STEPS}
          buttonLabel="링크관리"
        />

        <section className="panel" data-sim-admin-guide="manage-list">
          <div className="listHeader">
            <div>
              <h2>링크 목록</h2>
              <p>사용 가능한 링크만 최근 생성순으로 표시됩니다.</p>
            </div>

            <button
              type="button"
              onClick={() => void loadLinks()}
              className="refreshButton"
              data-sim-admin-guide="manage-refresh"
            >
              새로고침
            </button>
          </div>

          {error ? <div className="errorBox">{error}</div> : null}
          {copyMessage ? <div className="copyBox">{copyMessage}</div> : null}

          {loading ? (
            <div className="linkSkeletonList" aria-label="링크 목록 로딩 중">
              {Array.from({ length: 3 }).map((_, index) => (
                <article
                  key={`link-skeleton-${index}`}
                  className="linkSkeletonCard"
                >
                  <div className="linkSkeletonTop">
                    <div>
                      <div className="linkSkeletonTitle" />
                      <div className="linkSkeletonSub" />
                    </div>
                    <div className="linkSkeletonBadge" />
                  </div>
                  <div className="linkSkeletonUrl" />
                  <div className="linkSkeletonMeta">
                    <div />
                    <div />
                    <div />
                  </div>
                  <div className="linkSkeletonActions">
                    <div />
                    <div />
                    <div />
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <>
              {shouldShowTutorialDemo ? (
                <div className="emptyBox">
                  표시할 고객 링크가 없습니다. 하단의 <b>링크 생성</b>에서 새
                  링크를 만들어보세요.
                  <br />
                  아래 카드는 링크관리 도움말 안내용 예시이며 실제 링크로
                  저장되지 않습니다.
                </div>
              ) : null}

              <div className="linkList">
                {displayItems.map((link) => {
                  const isTutorialDemo = link.id === TUTORIAL_DEMO_LINK_ID;

                  return (
                    <article
                      key={link.id}
                      className={`linkCard ${isTutorialDemo ? "tutorialDemoCard" : ""}`}
                      data-sim-admin-guide="manage-card"
                    >
                      <div className="cardTop">
                        <div>
                          <div className="customerName">
                            {link.customer_name || "고객명 없음"}
                          </div>
                          <div className="memoText">
                            {link.memo || "메모 없음"}
                          </div>
                        </div>

                        <span
                          className={`statusBadge ${isTutorialDemo ? "demoStatus" : getStatusClass(link)}`}
                        >
                          {isTutorialDemo ? "도움말 예시" : getStatus(link)}
                        </span>
                      </div>

                      <div
                        className="infoGrid"
                        data-sim-admin-guide="manage-info"
                      >
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
                              : link.film_scope === "preset"
                                ? `${link.preset_name || "프리셋"} · ${link.film_count}개`
                                : `선택 필름 ${link.film_count}개`}
                          </strong>
                        </div>
                      </div>

                      <div className="urlBox">{link.url}</div>

                      <div
                        className="actionRow"
                        data-sim-admin-guide="manage-actions"
                      >
                        {isTutorialDemo ? (
                          <>
                            <button
                              type="button"
                              onClick={showTutorialDemoMessage}
                              data-sim-admin-guide="manage-copy"
                            >
                              링크 복사
                            </button>

                            <button
                              type="button"
                              onClick={showTutorialDemoMessage}
                              data-sim-admin-guide="manage-open"
                            >
                              열어보기
                            </button>

                            <button
                              type="button"
                              onClick={showTutorialDemoMessage}
                              className="deleteButton"
                              data-sim-admin-guide="manage-delete"
                            >
                              삭제 및 비활성화
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              type="button"
                              onClick={() => copyLink(link.url)}
                              data-sim-admin-guide="manage-copy"
                            >
                              링크 복사
                            </button>

                            <a
                              href={link.url}
                              target="_blank"
                              rel="noreferrer"
                              data-sim-admin-guide="manage-open"
                            >
                              열어보기
                            </a>

                            <button
                              type="button"
                              onClick={() => deactivateLink(link)}
                              disabled={
                                deactivatingId === link.id || !link.is_active
                              }
                              className="deleteButton"
                              data-sim-admin-guide="manage-delete"
                            >
                              {!link.is_active
                                ? "비활성됨"
                                : deactivatingId === link.id
                                  ? "처리 중"
                                  : "삭제 및 비활성화"}
                            </button>
                          </>
                        )}
                      </div>
                    </article>
                  );
                })}
              </div>
            </>
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
            radial-gradient(
              circle at top left,
              rgba(238, 224, 197, 0.1),
              transparent 24%
            ),
            radial-gradient(
              circle at top right,
              rgba(255, 255, 255, 0.08),
              transparent 20%
            ),
            linear-gradient(180deg, #060241 0%, ${COLORS.bg} 100%);
          color: ${COLORS.white};
        }

        .dashboardMoveOverlay {
          position: fixed;
          inset: 0;
          z-index: 9999;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(7, 6, 27, 0.3);
          backdrop-filter: blur(2px);
          pointer-events: none;
        }

        .dashboardMoveToast {
          padding: 14px 18px;
          border-radius: 999px;
          background: rgba(10, 8, 72, 0.94);
          color: #fff;
          border: 1px solid rgba(255, 255, 255, 0.18);
          box-shadow: 0 14px 34px rgba(0, 0, 0, 0.28);
          font-size: 14px;
          font-weight: 900;
          letter-spacing: -0.02em;
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
          cursor: pointer;
          appearance: none;
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
          background: linear-gradient(
            180deg,
            rgba(255, 255, 255, 0.08),
            rgba(255, 255, 255, 0.03)
          );
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

        .linkSkeletonList {
          display: grid;
          gap: 12px;
        }

        .linkSkeletonCard,
        .linkSkeletonTitle,
        .linkSkeletonSub,
        .linkSkeletonBadge,
        .linkSkeletonUrl,
        .linkSkeletonMeta div,
        .linkSkeletonActions div {
          position: relative;
          overflow: hidden;
        }

        .linkSkeletonCard::after,
        .linkSkeletonTitle::after,
        .linkSkeletonSub::after,
        .linkSkeletonBadge::after,
        .linkSkeletonUrl::after,
        .linkSkeletonMeta div::after,
        .linkSkeletonActions div::after {
          content: "";
          position: absolute;
          inset: 0;
          transform: translateX(-100%);
          background: linear-gradient(
            90deg,
            transparent 0%,
            rgba(255, 255, 255, 0.08) 35%,
            rgba(255, 255, 255, 0.16) 50%,
            transparent 100%
          );
          animation: linkSkeletonShimmer 1.35s infinite;
        }

        .linkSkeletonCard {
          border: 1px solid ${COLORS.line};
          border-radius: 22px;
          padding: 16px;
          background: rgba(255, 255, 255, 0.045);
        }

        .linkSkeletonTop {
          display: flex;
          justify-content: space-between;
          gap: 12px;
          align-items: flex-start;
        }

        .linkSkeletonTitle {
          width: 150px;
          height: 19px;
          border-radius: 999px;
          background: rgba(238, 224, 197, 0.13);
        }

        .linkSkeletonSub {
          width: 110px;
          height: 12px;
          margin-top: 10px;
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.09);
        }

        .linkSkeletonBadge {
          width: 76px;
          height: 32px;
          border-radius: 999px;
          background: rgba(238, 224, 197, 0.13);
          border: 1px solid rgba(238, 224, 197, 0.1);
        }

        .linkSkeletonUrl {
          height: 48px;
          border-radius: 16px;
          background: rgba(255, 255, 255, 0.06);
          border: 1px dashed rgba(238, 224, 197, 0.16);
          margin-top: 16px;
        }

        .linkSkeletonMeta {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 8px;
          margin-top: 12px;
        }

        .linkSkeletonMeta div,
        .linkSkeletonActions div {
          height: 38px;
          border-radius: 14px;
          background: rgba(255, 255, 255, 0.06);
          border: 1px solid rgba(238, 224, 197, 0.1);
        }

        .linkSkeletonActions {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 8px;
          margin-top: 12px;
        }

        @keyframes linkSkeletonShimmer {
          100% {
            transform: translateX(100%);
          }
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

        .demoStatus {
          background: rgba(238, 224, 197, 0.14);
          color: ${COLORS.cream};
          border: 1px solid rgba(238, 224, 197, 0.35);
        }

        .tutorialDemoCard {
          border-style: dashed;
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

          .actionRow,
          .linkSkeletonMeta,
          .linkSkeletonActions {
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
