"use client";

import { useEffect, useMemo, useState } from "react";
import type { CSSProperties } from "react";
import Image from "next/image";
import type { SimulatorFilm } from "../types";
import SimulatorIntroOverview from "./SimulatorIntroOverview";
import SimulatorClientStyles from "./SimulatorClientStyles";
import SimulatorSpaceStep from "./client/SimulatorSpaceStep";
import SimulatorApplyStep from "./client/SimulatorApplyStep";
import SimulatorDecisionStep from "./client/SimulatorDecisionStep";
import SimulatorBottomStepNav from "./client/SimulatorBottomStepNav";
import SimulatorCustomerGuideModal from "./client/SimulatorCustomerGuideModal";
import SimulatorFilmSheet from "./client/SimulatorFilmSheet";
import SimulatorDecisionExportCard from "./client/SimulatorDecisionExportCard";
import { COLORS, type SimulatorStep } from "../lib/client-state";
import {
  formatDateTime,
  getFilmName,
  isFabricFilm,
  readMaskZones,
  readPreviewAspectRatio,
  preloadImage,
  getPhoneHref,
  getKakaoHref,
} from "../lib/client-utils";
import { useSimulatorFilmSearch } from "../hooks/useSimulatorFilmSearch";
import { useSimulatorCustomerGuide } from "../hooks/useSimulatorCustomerGuide";
import { useDecisionResultShare } from "../hooks/useDecisionResultShare";
import { useDashboardNavigation } from "../hooks/useDashboardNavigation";
import guideOnImage from "../assets/guide-on.png";
import guideOffImage from "../assets/guide-off.png";

type SimulatorClientProps = {
  token?: string;
  mode: "installer" | "customer";
};

export default function SimulatorClient({ token = "", mode }: SimulatorClientProps) {
  const [step, setStep] = useState<SimulatorStep>("space");
  const [selectedSpaceId, setSelectedSpaceId] = useState("");
  const [selectedFilm, setSelectedFilm] = useState<SimulatorFilm | null>(null);
  const [activeZoneKey, setActiveZoneKey] = useState("");
  const [zoneFilmMap, setZoneFilmMap] = useState<Record<string, SimulatorFilm | null>>({});
  const [isFilmSheetOpen, setIsFilmSheetOpen] = useState(false);
  const [applyingFilmId, setApplyingFilmId] = useState<number | null>(null);
  const [previewSampleFilm, setPreviewSampleFilm] = useState<SimulatorFilm | null>(null);

  const {
    state,
    filmQuery,
    setFilmQuery,
    filmLoading,
    filmError,
    setFilmError,
    selectedPaletteMain,
    selectedPaletteSub,
    selectedPaletteColors,
    paletteSubOptions,
    paletteColorOptions,
    searchFilms,
    prepareFilmSheet,
    resetPaletteFilters,
    handlePaletteMainClick,
    handlePaletteSubClick,
    handlePaletteColorClick,
  } = useSimulatorFilmSearch({
    token,
    mode,
    step,
    setStep,
    setSelectedSpaceId,
    setSelectedFilm,
  });

  const selectedSpace = useMemo(() => {
    return state.spaces.find((space) => space.id === selectedSpaceId) || state.spaces[0] || null;
  }, [selectedSpaceId, state.spaces]);

  const maskZones = useMemo(() => readMaskZones(selectedSpace), [selectedSpace]);

  const activeZone = useMemo(() => {
    return maskZones.find((zone) => zone.key === activeZoneKey) || maskZones[0] || null;
  }, [maskZones, activeZoneKey]);

  const previewAspectRatio = useMemo(() => {
    return readPreviewAspectRatio(selectedSpace);
  }, [selectedSpace]);

  const previewHasRealSpace = Boolean(selectedSpace?.base_image_url || selectedSpace?.overlay_image_url);
  const hasIntroStep = mode === "customer" && Boolean(state.contractor);

  const applyingFilm = useMemo(() => {
    if (applyingFilmId === null) return null;
    return state.films.find((film) => film.id === applyingFilmId) || null;
  }, [applyingFilmId, state.films]);

  const selectedDecisionFilms = useMemo(() => {
    return maskZones
      .map((zone) => zoneFilmMap[zone.key] || null)
      .filter((film): film is SimulatorFilm => Boolean(film));
  }, [maskZones, zoneFilmMap]);

  const hasFabricWarning = useMemo(() => {
    return selectedDecisionFilms.some((film) => isFabricFilm(film));
  }, [selectedDecisionFilms]);

  const {
    decisionExportRef,
    decisionMessage,
    setDecisionMessage,
    isDecisionSharing,
    shareDecisionResult,
  } = useDecisionResultShare({
    selectedSpace,
    link: state.link,
    maskZones,
    zoneFilmMap,
    hasFabricWarning,
    colors: COLORS,
  });

  const { isDashboardMoving, goToDashboard } = useDashboardNavigation(mode);

  const { currentGuide, guideEnabled, toggleGuideEnabled, closeCustomerGuide } = useSimulatorCustomerGuide({
    mode,
    token,
    step,
    hasIntroStep,
    isFilmSheetOpen,
    loading: state.loading,
    expired: state.expired,
    setupNeeded: state.setupNeeded,
  });

  useEffect(() => {
    if (maskZones.length === 0) return;

    if (!activeZoneKey || !maskZones.some((zone) => zone.key === activeZoneKey)) {
      setActiveZoneKey(maskZones[0].key);
    }
  }, [maskZones, activeZoneKey]);

  const getTargetZoneKey = () => {
    return activeZoneKey || activeZone?.key || maskZones[0]?.key || "";
  };

  const applyFilmToZone = (zoneKey: string, film: SimulatorFilm) => {
    setSelectedFilm(film);
    setZoneFilmMap((prev) => ({
      ...prev,
      [zoneKey]: film,
    }));
  };

  const clearZoneFilm = (zoneKey: string) => {
    setZoneFilmMap((prev) => ({
      ...prev,
      [zoneKey]: null,
    }));
  };

  const clearAllZones = () => {
    setZoneFilmMap({});
  };

  const applyFilmToAllZones = (film: SimulatorFilm) => {
    setSelectedFilm(film);

    const next: Record<string, SimulatorFilm> = {};
    maskZones.forEach((zone) => {
      next[zone.key] = film;
    });

    setZoneFilmMap(next);
  };

  const openFilmSheet = (zoneKey: string) => {
    const isRestrictedCustomerLink =
      mode === "customer" &&
      Boolean(token) &&
      state.link?.film_scope !== "all";

    setActiveZoneKey(zoneKey);
    const shouldSearchOnOpen = prepareFilmSheet();
    setPreviewSampleFilm(null);
    setIsFilmSheetOpen(true);

    if (shouldSearchOnOpen) {
      const hasActiveFilmSearch =
        filmQuery.trim().length > 0 ||
        Boolean(selectedPaletteMain) ||
        Boolean(selectedPaletteSub) ||
        selectedPaletteColors.length > 0;

      void searchFilms(filmQuery, {
        includeFacets: true,
        recommended: !isRestrictedCustomerLink && !hasActiveFilmSearch,
      });
    }
  };

  const closeFilmSheet = () => {
    setIsFilmSheetOpen(false);
    setPreviewSampleFilm(null);
  };

  const selectSpaceAndGoApply = (spaceId: string) => {
    setSelectedSpaceId(spaceId);
    setStep("apply");
  };

  const goApplyStep = () => {
    if (!selectedSpace && state.spaces[0]?.id) {
      setSelectedSpaceId(state.spaces[0].id);
    }
    setStep("apply");
  };

  const goDecisionStep = () => {
    const hasAnyFilm = maskZones.some((zone) => Boolean(zoneFilmMap[zone.key]));

    if (!hasAnyFilm) {
      return;
    }

    setDecisionMessage("");
    setStep("decision");
  };

  const handleFilmClick = async (film: SimulatorFilm) => {
    const targetZoneKey = getTargetZoneKey();

    if (!targetZoneKey || applyingFilmId !== null) {
      return;
    }

    setFilmError("");
    setApplyingFilmId(film.id);

    try {
      if (film.image_url) {
        await preloadImage(film.image_url);
      }

      applyFilmToZone(targetZoneKey, film);
      setPreviewSampleFilm(null);
      closeFilmSheet();
    } catch {
      setFilmError("이미지를 불러오지 못했습니다. 다시 선택해주세요.");
    } finally {
      setApplyingFilmId(null);
    }
  };

  const toggleSamplePreview = (film: SimulatorFilm) => {
    if (!film.sample_url) return;

    setPreviewSampleFilm((prev) => (prev?.id === film.id ? null : film));
  };

  const mainTitle = mode === "customer" ? "필름 시뮬레이터" : "시뮬레이터";
  const contractorName = state.contractor?.display_name || state.link?.installer_name || "시공자";
  const contractorPhotos = state.contractor?.portfolio_photos || [];
  const phoneHref = getPhoneHref(state.contractor?.phone);
  const kakaoHref = getKakaoHref(state.contractor?.kakao_url);

  const stepBadgeText = hasIntroStep
    ? step === "intro"
      ? "step1 소개"
      : step === "space"
        ? "step2 공간 선택"
        : step === "apply"
          ? "step3 색상 적용"
          : "step4 결정 확정"
    : step === "space"
      ? "1단계 공간 선택"
      : step === "apply"
        ? "2단계 색상 적용"
        : "3단계 결정 확정";

  const heroDescription = step === "intro"
    ? "시공자 소개와 대표 시공사진을 확인한 뒤 시뮬레이션을 시작하세요."
    : step === "space"
      ? "시뮬레이션할 공간을 먼저 선택해주세요."
      : step === "apply"
        ? "이미지의 체크무늬 구역이나 아래 구역 버튼을 눌러 필름을 적용하세요."
        : "선택한 결과를 확인하고 필요한 방법으로 문의해주세요.";

  const isCustomerIntroStep = step === "intro" && hasIntroStep;

  const showGuideToggle =
    mode === "customer" &&
    !state.loading &&
    !state.expired &&
    !state.setupNeeded &&
    (isCustomerIntroStep || step === "space" || step === "apply");

  const guideToggleImage = guideEnabled ? guideOnImage : guideOffImage;
  const guideToggleAlt = guideEnabled ? "가이드 켜짐" : "가이드 꺼짐";

  return (
    <main
      style={{
        minHeight: "100vh",
        background: `
          radial-gradient(circle at top left, rgba(238,224,197,0.10), transparent 24%),
          radial-gradient(circle at top right, rgba(255,255,255,0.08), transparent 20%),
          linear-gradient(180deg, #060241 0%, ${COLORS.bg} 100%)
        `,
        color: COLORS.white,
      }}
    >
      <div className="pageWrap">
        {isDashboardMoving ? (
          <div className="dashboardMoveOverlay" aria-live="polite">
            <div className="dashboardMoveToast">대시보드로 이동 중...</div>
          </div>
        ) : null}

        {applyingFilmId !== null ? (
          <div className="filmApplyOverlay" aria-live="assertive" aria-label="필름 적용 중">
            <div className="filmApplyToast">
              <span className="filmApplySpinner" aria-hidden="true" />
              <strong>적용중...</strong>
              <p>{applyingFilm ? getFilmName(applyingFilm) : "선택한 필름"}을 적용하고 있어요.</p>
            </div>
          </div>
        ) : null}

        {mode === "installer" ? (
          <button type="button" onClick={goToDashboard} className="backButton" disabled={isDashboardMoving}>
            ← 대시보드
          </button>
        ) : null}

        {showGuideToggle ? (
          <button
            type="button"
            className="guideToggleFloatingButton"
            onClick={toggleGuideEnabled}
            aria-pressed={guideEnabled}
            aria-label={guideEnabled ? "가이드 끄기" : "가이드 켜기"}
          >
            <Image
              src={guideToggleImage}
              alt={guideToggleAlt}
              width={120}
              height={120}
              className="guideToggleFloatingImage"
              priority={false}
            />
          </button>
        ) : null}

        <div className={isCustomerIntroStep && showGuideToggle ? "pageInner pageInnerCustomerIntroWithGuide" : "pageInner"}>
          {(state.loading && mode === "customer") || (step === "intro" && hasIntroStep) ? null : (
            <section className="heroCard">
              <div className="heroTopRow">
                <div style={{ minWidth: 0 }}>
                  <div className="stepBadge">{stepBadgeText}</div>

                  <h1 className="pageTitle">{mainTitle}</h1>

                  <p className="heroText">{heroDescription}</p>
                </div>

                {state.link ? (
                  <div className="linkCard linkCardCompact">
                    <div className="linkCardText">
                      <div>시뮬레이션 만료: {formatDateTime(state.link.expires_at)}</div>
                    </div>
                  </div>
                ) : null}
              </div>
            </section>
          )}

          {state.loading ? (
            mode === "customer" ? (
              <section className="customerIntroSkeleton" aria-live="polite">
                <div className="introSkeletonHero">
                  <div className="introSkeletonPill" />
                  <div className="introSkeletonTitle introSkeletonWide" />
                  <div className="introSkeletonTitle introSkeletonMid" />
                  <div className="introSkeletonText introSkeletonTextLong" />
                  <div className="introSkeletonText introSkeletonTextMid" />
                </div>

                <div className="introSkeletonProfile">
                  <div className="introSkeletonLogo" />
                  <div className="introSkeletonContent">
                    <div className="introSkeletonText introSkeletonName" />
                    <div className="introSkeletonText introSkeletonTextLong" />
                    <div className="introSkeletonText introSkeletonTextMid" />
                    <div className="introSkeletonButtons">
                      <div className="introSkeletonButton" />
                      <div className="introSkeletonButton" />
                    </div>
                  </div>
                </div>

                <div className="introSkeletonPortfolio">
                  <div className="introSkeletonText introSkeletonSectionTitle" />
                  <div className="introSkeletonPhotoGrid">
                    <div className="introSkeletonPhoto introSkeletonPhotoLarge" />
                    <div className="introSkeletonPhoto" />
                    <div className="introSkeletonPhoto" />
                  </div>
                </div>
              </section>
            ) : (
              <section className="spaceLoadingSkeleton" aria-live="polite">
                <div className="spaceSkeletonHeader">
                  <div>
                    <div className="spaceSkeletonPill" />
                    <div className="spaceSkeletonTitle" />
                    <div className="spaceSkeletonText" />
                  </div>
                  <div className="spaceSkeletonCount" />
                </div>

                <div className="spaceSkeletonGrid">
                  {Array.from({ length: 4 }).map((_, index) => (
                    <div key={`space-skeleton-${index}`} className="spaceSkeletonCard" aria-hidden="true">
                      <div className="spaceSkeletonThumb" />
                      <div className="spaceSkeletonName" />
                      <div className="spaceSkeletonDesc" />
                    </div>
                  ))}
                </div>
              </section>
            )
          ) : state.expired ? (
            <section style={noticeStyle("danger")}>
              <strong style={{ display: "block", fontSize: 20, marginBottom: 8 }}>만료된 링크입니다.</strong>
              <span>{state.message || "시공자에게 새 링크를 요청해주세요."}</span>
            </section>
          ) : state.setupNeeded ? (
            <section style={noticeStyle("warning")}>
              <strong style={{ display: "block", fontSize: 20, marginBottom: 8 }}>DB 1단계 작업이 필요합니다.</strong>
              <span>{state.message}</span>
              <div
                style={{
                  marginTop: 14,
                  padding: 14,
                  borderRadius: 16,
                  background: "rgba(0,0,0,0.18)",
                  color: COLORS.white,
                  fontSize: 13,
                  lineHeight: 1.7,
                }}
              >
                Supabase SQL Editor에서 <b>supabase/02_simulator_schema.sql</b> 파일 내용을 먼저 실행하면 됩니다.
              </div>
            </section>
          ) : step === "intro" && hasIntroStep ? (
            <SimulatorIntroOverview
              contractorName={contractorName}
              logoUrl={state.contractor?.logo_url}
              greeting={state.contractor?.greeting}
              phone={state.contractor?.phone}
              phoneHref={phoneHref}
              kakaoHref={kakaoHref}
              photos={contractorPhotos}
              expiresAt={state.link?.expires_at}
              brandColor={state.contractor?.brand_color}
              showHero={false}
              showStartButton
              onStart={() => setStep("space")}
            />
          ) : step === "space" ? (
            <SimulatorSpaceStep
              spaces={state.spaces}
              selectedSpace={selectedSpace}
              onSelectSpace={selectSpaceAndGoApply}
            />
          ) : step === "apply" ? (
            <SimulatorApplyStep
              selectedSpace={selectedSpace}
              maskZones={maskZones}
              activeZoneKey={activeZoneKey}
              activeZone={activeZone}
              zoneFilmMap={zoneFilmMap}
              selectedFilm={selectedFilm}
              previewAspectRatio={previewAspectRatio}
              previewHasRealSpace={previewHasRealSpace}
              colors={COLORS}
              onBackToSpace={() => setStep("space")}
              onOpenFilmSheet={openFilmSheet}
              onApplyFilmToAllZones={applyFilmToAllZones}
              onClearZoneFilm={clearZoneFilm}
              onClearAllZones={clearAllZones}
              onGoDecisionStep={goDecisionStep}
            />
          ) : (
            <SimulatorDecisionStep
              selectedSpace={selectedSpace}
              maskZones={maskZones}
              zoneFilmMap={zoneFilmMap}
              hasFabricWarning={hasFabricWarning}
              kakaoHref={kakaoHref}
              decisionMessage={decisionMessage}
              isDecisionSharing={isDecisionSharing}
              onBackToApply={() => setStep("apply")}
              onShareDecisionResult={() => void shareDecisionResult()}
            />
          )}
        </div>

        {!state.loading ? (
          <SimulatorBottomStepNav
            step={step}
            hasIntroStep={hasIntroStep}
            onIntro={() => setStep("intro")}
            onSpace={() => setStep("space")}
            onApply={goApplyStep}
            onDecision={() => setStep("decision")}
          />
        ) : null}

        {currentGuide ? (
          <SimulatorCustomerGuideModal guide={currentGuide} onClose={closeCustomerGuide} />
        ) : null}

        {isFilmSheetOpen ? (
          <SimulatorFilmSheet
            activeZone={activeZone}
            films={state.films}
            filmQuery={filmQuery}
            filmLoading={filmLoading}
            filmError={filmError}
            selectedFilm={selectedFilm}
            selectedPaletteMain={selectedPaletteMain}
            selectedPaletteSub={selectedPaletteSub}
            selectedPaletteColors={selectedPaletteColors}
            paletteSubOptions={paletteSubOptions}
            paletteColorOptions={paletteColorOptions}
            applyingFilmId={applyingFilmId}
            previewSampleFilm={previewSampleFilm}
            onClose={closeFilmSheet}
            onResetPaletteFilters={resetPaletteFilters}
            onPaletteMainClick={handlePaletteMainClick}
            onPaletteSubClick={handlePaletteSubClick}
            onPaletteColorClick={handlePaletteColorClick}
            onFilmQueryChange={setFilmQuery}
            onSearchFilms={() => void searchFilms(filmQuery, { includeFacets: false })}
            onFilmClick={(film) => void handleFilmClick(film)}
            onToggleSamplePreview={toggleSamplePreview}
            onCloseSamplePreview={() => setPreviewSampleFilm(null)}
          />
        ) : null}
      </div>

      <SimulatorDecisionExportCard
        exportRef={decisionExportRef}
        selectedSpace={selectedSpace}
        maskZones={maskZones}
        zoneFilmMap={zoneFilmMap}
        link={state.link}
        previewAspectRatio={previewAspectRatio}
        previewHasRealSpace={previewHasRealSpace}
        hasFabricWarning={hasFabricWarning}
        colors={COLORS}
      />

      <SimulatorClientStyles colors={COLORS} />
    </main>
  );
}

function noticeStyle(type: "default" | "warning" | "danger" = "default"): CSSProperties {
  const background =
    type === "danger"
      ? "rgba(120,20,20,0.20)"
      : type === "warning"
        ? "rgba(238,224,197,0.10)"
        : "rgba(255,255,255,0.05)";

  const color = type === "danger" ? "#ffd6d6" : COLORS.white;

  return {
    borderRadius: 24,
    padding: "22px 20px",
    background,
    border: `1px solid ${COLORS.line}`,
    color,
    lineHeight: 1.7,
    boxShadow: "0 18px 48px rgba(0,0,0,0.18)",
  };
}
