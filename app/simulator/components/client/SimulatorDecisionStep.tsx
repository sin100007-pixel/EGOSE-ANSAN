"use client";

import { useEffect, useState } from "react";
import type { SimulatorFilm, SimulatorSpace } from "../../types";
import type { MaskZoneDefinition } from "../../lib/client-utils";
import { getFilmName, readPreviewAspectRatio } from "../../lib/client-utils";
import SimulatorScenePreview from "./SimulatorScenePreview";

type SimulatorFavoriteCandidate = {
  id: string;
  created_at: string;
  space: SimulatorSpace | null;
  maskZones: MaskZoneDefinition[];
  zoneFilmMap: Record<string, SimulatorFilm | null>;
};

type SimulatorDecisionStepProps = {
  selectedSpace: SimulatorSpace | null;
  maskZones: MaskZoneDefinition[];
  zoneFilmMap: Record<string, SimulatorFilm | null>;
  hasFabricWarning: boolean;
  kakaoHref: string;
  decisionMessage: string;
  isDecisionSharing: boolean;
  favoriteCandidates: SimulatorFavoriteCandidate[];
  selectedFavoriteCandidateIds: string[];
  colors: {
    cream: string;
    soft: string;
  };
  onBackToApply: () => void;
  onShareDecisionResult: () => void;
  onApplyFavoriteCandidate: (candidate: SimulatorFavoriteCandidate) => void;
  onRemoveFavoriteCandidate: (candidateId: string) => void;
  onToggleFavoriteCandidateForShare: (candidateId: string) => void;
  onShareFavoriteCandidates: () => void;
};

const TUTORIAL_DEMO_FAVORITE_ID = "__tutorial-decision-favorite-demo__";
const FAVORITE_SHARE_HELP_MESSAGE =
  "선택한 후보를 공유 할 수 있습니다. 단일로도 가능하고 여러개도 같이 보낼 수 있습니다.";

function ApplyHelpBubbleContent({ message }: { message: string }) {
  return (
    <>
      <span className="simHelpBubbleHeader">
        <span className="simHelpBubbleIcon" aria-hidden="true">!</span>
        <span className="simHelpBubbleTitle">풍선 도움말</span>
      </span>
      <span className="simHelpBubbleBody">{message}</span>
    </>
  );
}

function formatFavoriteDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "저장일 확인 불가";

  return date.toLocaleString("ko-KR", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function SimulatorDecisionStep({
  selectedSpace,
  maskZones,
  zoneFilmMap,
  kakaoHref,
  decisionMessage,
  isDecisionSharing,
  favoriteCandidates,
  selectedFavoriteCandidateIds,
  colors,
  onBackToApply,
  onApplyFavoriteCandidate,
  onRemoveFavoriteCandidate,
  onToggleFavoriteCandidateForShare,
  onShareFavoriteCandidates,
}: SimulatorDecisionStepProps) {
  const hasDemoFavorite = favoriteCandidates.length === 0;
  const demoFavoriteCandidate: SimulatorFavoriteCandidate = {
    id: TUTORIAL_DEMO_FAVORITE_ID,
    created_at: new Date().toISOString(),
    space: selectedSpace,
    maskZones,
    zoneFilmMap,
  };
  const visibleFavoriteCandidates = hasDemoFavorite ? [demoFavoriteCandidate] : favoriteCandidates;
  const selectedFavoriteCount = hasDemoFavorite ? 1 : selectedFavoriteCandidateIds.length;
  const shareButtonDisabled = !hasDemoFavorite && (selectedFavoriteCount === 0 || isDecisionSharing);
  const [showFavoriteShareHelp, setShowFavoriteShareHelp] = useState(false);

  useEffect(() => {
    if (!showFavoriteShareHelp) return;

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target;
      if (target instanceof Element && target.closest('[data-decision-share-help-ui="true"]')) {
        return;
      }
      setShowFavoriteShareHelp(false);
    };

    window.addEventListener("pointerdown", handlePointerDown);
    return () => window.removeEventListener("pointerdown", handlePointerDown);
  }, [showFavoriteShareHelp]);

  return (
    <section className="decisionCard">
      <div data-sim-admin-guide="customer-decision-candidates-section">
        <div className="applyTopRow">
        <div>
          <div className="sectionLabel">결정 확정</div>
          <h2 className="spaceTitle">선택 결과 확인</h2>
        </div>

        <button type="button" onClick={onBackToApply} className="changeSpaceButton">
          색상 다시 선택
        </button>
      </div>

        <section className="favoriteCandidateSection">
        <div className="favoriteCandidateHeader">
          <div>
            <div className="sectionLabel">즐겨찾기 후보</div>
            <h3>저장한 후보</h3>
          </div>

          <span>{hasDemoFavorite ? "도움말 예시" : `${favoriteCandidates.length}개`}</span>
        </div>

        {hasDemoFavorite ? (
          <div className="favoriteEmptyBox">
            3단계 색상 적용 화면에서 ⭐ 즐겨찾기를 누르면 이곳에 후보가 저장됩니다.
            지금 보이는 후보는 도움말용 예시이며 실제 저장되지는 않습니다.
          </div>
        ) : null}

        <div data-sim-admin-guide="customer-decision-candidate-select">
          <div className="favoriteCandidateList">
            {visibleFavoriteCandidates.map((candidate, index) => {
              const isDemoCandidate = candidate.id === TUTORIAL_DEMO_FAVORITE_ID;
              const candidateZones = candidate.maskZones.length > 0 ? candidate.maskZones : maskZones;
              const candidateHasRealSpace = Boolean(
                candidate.space?.base_image_url || candidate.space?.overlay_image_url
              );
              const isSelectedForShare = isDemoCandidate || selectedFavoriteCandidateIds.includes(candidate.id);

              return (
                <article
                  key={candidate.id}
                  className={
                    isSelectedForShare
                      ? "favoriteCandidateCard favoriteCandidateCardSelected"
                      : "favoriteCandidateCard"
                  }
                  role="button"
                  tabIndex={0}
                  aria-pressed={isSelectedForShare}
                  aria-label={`${candidate.space?.name || `후보 ${index + 1}`} 공유 후보 ${
                    isSelectedForShare ? "선택 해제" : "선택"
                  }`}

                  onClick={() => {
                    if (isDemoCandidate) return;
                    onToggleFavoriteCandidateForShare(candidate.id);
                  }}
                  onKeyDown={(event) => {
                    if (event.target !== event.currentTarget) return;
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      if (isDemoCandidate) return;
                      onToggleFavoriteCandidateForShare(candidate.id);
                    }
                  }}
                >
                  <div className="favoriteCandidateThumb">
                    <SimulatorScenePreview
                      selectedSpace={candidate.space}
                      maskZones={candidateZones}
                      zoneFilmMap={candidate.zoneFilmMap}
                      previewAspectRatio={readPreviewAspectRatio(candidate.space)}
                      previewHasRealSpace={candidateHasRealSpace}
                      colors={colors}
                      viewportClassName="favoriteCandidateThumbViewport"
                      exportKeyPrefix={`favorite-${candidate.id}`}
                      compactEmpty
                    />
                  </div>

                  <div className="favoriteCandidateBody">
                    <div className="favoriteCandidateTitleRow">
                      <strong>{candidate.space?.name || `후보 ${index + 1}`}</strong>
                      <div className="favoriteCandidateMeta">
                        {isSelectedForShare ? (
                          <span className="favoriteCandidateSelectedBadge">✓ 선택됨</span>
                        ) : null}
                        <em>{isDemoCandidate ? "도움말 예시" : formatFavoriteDate(candidate.created_at)}</em>
                      </div>
                    </div>

                    <div className="favoriteCandidateFilmList">
                      {candidateZones.map((zone) => {
                        const film = candidate.zoneFilmMap[zone.key] || null;

                        return (
                          <div key={`${candidate.id}-${zone.key}`} className="favoriteCandidateFilmItem">
                            <span>{zone.label}</span>
                            <b>{film ? getFilmName(film) : "미선택"}</b>
                          </div>
                        );
                      })}
                    </div>

                    <div
                      className="favoriteCandidateActions"
                      data-sim-admin-guide={index === 0 ? "customer-decision-candidate-actions" : undefined}
                    >
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          if (isDemoCandidate) return;
                          onApplyFavoriteCandidate(candidate);
                        }}
                        className="favoriteCandidateApplyButton"
                      >
                        불러오기
                      </button>

                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          if (isDemoCandidate) return;
                          onRemoveFavoriteCandidate(candidate.id);
                        }}
                        className="favoriteCandidateDeleteButton"
                      >
                        삭제
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>

          <div className="favoriteShareFooter">
            <div className="favoriteShareStatus">
              {selectedFavoriteCount > 0
                ? `${selectedFavoriteCount}개 후보가 공유 대상으로 선택되었습니다.`
                : "공유하고 싶은 후보를 선택해주세요."}
            </div>

            <div
              className={`favoriteShareSplitAction applySplitHelpAction applyDecisionSplitAction ${
                shareButtonDisabled ? "isMainDisabled" : ""
              }`}
              data-decision-share-help-ui="true"
            >
              <button
                type="button"
                onClick={() => {
                  if (hasDemoFavorite) return;
                  onShareFavoriteCandidates();
                }}
                className="applySplitMainButton favoriteShareMainButton"
                disabled={shareButtonDisabled}
              >
                {isDecisionSharing ? "공유 준비 중..." : "선택한 후보 공유"}
              </button>

              <button
                type="button"
                className="applySplitHelpButton favoriteShareHelpButton"
                aria-label="선택한 후보 공유 도움말 보기"
                aria-expanded={showFavoriteShareHelp}
                onPointerDown={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  setShowFavoriteShareHelp((prev) => !prev);
                }}
              >
                ?
              </button>

              {showFavoriteShareHelp ? (
                <span className="applySplitHelpBubble favoriteShareHelpBubble" role="tooltip">
                  <ApplyHelpBubbleContent message={FAVORITE_SHARE_HELP_MESSAGE} />
                </span>
              ) : null}
            </div>

            {decisionMessage ? <div className="decisionMessage favoriteShareMessage">{decisionMessage}</div> : null}
          </div>
        </div>
        </section>
      </div>

      <div className="decisionActionGrid">
        <section className="decisionActionCard">
          <div className="decisionActionIcon">1</div>
          <h3>결정 내용 공유</h3>
          <p>
            공유하고 싶은 즐겨찾기 후보를 선택 후 하단에 공유 버튼을 통해 내용을 전달 할 수 있습니다.
          </p>
        </section>

        <section className="decisionActionCard" data-sim-admin-guide="customer-decision-sample">
          <div className="decisionActionIcon">2</div>
          <h3>샘플 안내</h3>
          <p>
            거래처의 매장에 방문하시면 필름 실물을 보실수 있고, 샘플 받을 수있도록 준비해놨습니다.
          </p>
          <div className="storeInfoBox">
            <strong>이고세(주)</strong>
            <span>경기도 안산시 상록구 안산천서로 237 1층 안산이고세</span>
            <span>Tel. 031-486-6882</span>
          </div>
        </section>

        <section className="decisionActionCard" data-sim-admin-guide="customer-decision-kakao">
          <div className="decisionActionIcon">3</div>
          <h3>카카오톡 문의</h3>
          <p>
            궁금하신게 있으시면 카카오톡으로 연락주세요.
          </p>
          {kakaoHref ? (
            <a
              href={kakaoHref}
              target="_blank"
              rel="noopener noreferrer"
              className="primaryDecisionButton"
            >
              카카오톡 문의하기
            </a>
          ) : (
            <button type="button" className="primaryDecisionButton" disabled>
              카카오톡 링크 준비중
            </button>
          )}
        </section>
      </div>
    </section>
  );
}
