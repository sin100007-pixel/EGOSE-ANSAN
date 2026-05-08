"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties } from "react";
import Image from "next/image";
import dynamic from "next/dynamic";
import type { SimulatorFilm } from "../types";
import SimulatorIntroOverview from "./SimulatorIntroOverview";
import SimulatorClientStyles from "./SimulatorClientStyles";
import SimulatorSpaceStep from "./client/SimulatorSpaceStep";
import SimulatorBottomStepNav from "./client/SimulatorBottomStepNav";
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

const SimulatorApplyStep = dynamic(() => import("./client/SimulatorApplyStep"), { ssr: false });
const SimulatorDecisionStep = dynamic(() => import("./client/SimulatorDecisionStep"), { ssr: false });
const SimulatorCustomerGuideModal = dynamic(
  () => import("./client/SimulatorCustomerGuideModal"),
  { ssr: false }
);
const SimulatorCustomerGuideNoticeModal = dynamic(
  () => import("./client/SimulatorCustomerGuideNoticeModal"),
  { ssr: false }
);
const SimulatorFilmSheet = dynamic(() => import("./client/SimulatorFilmSheet"), { ssr: false });
const SimulatorDecisionExportCard = dynamic(
  () => import("./client/SimulatorDecisionExportCard"),
  { ssr: false }
);

type SimulatorClientProps = {
  token?: string;
  mode: "installer" | "customer";
};


const EGOSE_BACK_GUARD_SEARCH_PARAM = "__egose_back_guard";

function getUrlWithoutEgoseBackGuard(value: string) {
  try {
    const url = new URL(value);
    url.searchParams.delete(EGOSE_BACK_GUARD_SEARCH_PARAM);

    if (url.hash.startsWith("#__egose_simulator_back_guard")) {
      url.hash = "";
    }

    return url.toString();
  } catch {
    return value
      .replace(/([?&])__egose_back_guard=[^&#]*&?/, "$1")
      .replace(/[?&]$/, "")
      .replace(/#__egose_simulator_back_guard[^?&#]*/, "");
  }
}

function getUrlWithEgoseBackGuard(value: string, guardId: number) {
  try {
    const url = new URL(getUrlWithoutEgoseBackGuard(value));
    url.searchParams.set(EGOSE_BACK_GUARD_SEARCH_PARAM, String(guardId));
    return url.toString();
  } catch {
    const cleanValue = getUrlWithoutEgoseBackGuard(value);
    const divider = cleanValue.includes("?") ? "&" : "?";
    return `${cleanValue}${divider}${EGOSE_BACK_GUARD_SEARCH_PARAM}=${guardId}`;
  }
}

function requestKakaoInAppBrowserClose() {
  if (typeof window === "undefined" || typeof navigator === "undefined") return false;

  const ua = navigator.userAgent || "";

  if (!/KAKAOTALK/i.test(ua)) {
    return false;
  }

  const closeUrl = /iPhone|iPad|iPod/i.test(ua)
    ? "kakaoweb://closeBrowser"
    : "kakaotalk://inappbrowser/close";

  window.location.href = closeUrl;

  return true;
}

type SimulatorUndoSnapshot = {
  step: SimulatorStep;
  selectedSpaceId: string;
  selectedFilm: SimulatorFilm | null;
  activeZoneKey: string;
  zoneFilmMap: Record<string, SimulatorFilm | null>;
  isFilmSheetOpen: boolean;
  previewSampleFilm: SimulatorFilm | null;
  decisionMessage: string;
};

type ExitConfirmTypingPhase = "typing" | "holding" | "deleting";

const EXIT_CONFIRM_TYPE_LINES = [
  "붙였던 필름 떼어내는 중...",
  "가구를 창고에 넣어 놓는 중...",
  "재단했던 필름 다시 마는중...",
  "열린 창문 닫는 중...",
  "신발 가지런히 정리하는 중...",
  "필름을 창고에 넣어 놓는중...",
];

const EXIT_CONFIRM_TYPE_SPEED_MS = 58;
const EXIT_CONFIRM_DELETE_SPEED_MS = 30;
const EXIT_CONFIRM_HOLD_MS = 2000;
const EXIT_CONFIRM_NEXT_LINE_DELAY_MS = 140;
const RAPID_BACK_EXIT_PRESS_LIMIT = 5;
const RAPID_BACK_EXIT_WINDOW_MS = 1800;

export default function SimulatorClient({ token = "", mode }: SimulatorClientProps) {
  const [step, setStep] = useState<SimulatorStep>("space");
  const [selectedSpaceId, setSelectedSpaceId] = useState("");
  const [selectedFilm, setSelectedFilm] = useState<SimulatorFilm | null>(null);
  const [activeZoneKey, setActiveZoneKey] = useState("");
  const [zoneFilmMap, setZoneFilmMap] = useState<Record<string, SimulatorFilm | null>>({});
  const [isFilmSheetOpen, setIsFilmSheetOpen] = useState(false);
  const [applyingFilmId, setApplyingFilmId] = useState<number | null>(null);
  const [previewSampleFilm, setPreviewSampleFilm] = useState<SimulatorFilm | null>(null);
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [exitTypingLineIndex, setExitTypingLineIndex] = useState(0);
  const [exitTypingCharCount, setExitTypingCharCount] = useState(0);
  const [exitTypingPhase, setExitTypingPhase] = useState<ExitConfirmTypingPhase>("typing");

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

  const {
    activeGuideStep,
    currentGuide,
    guideEnabled,
    toggleGuideEnabled,
    closeCustomerGuide,
    disableCustomerGuide,
    showGuideDisabledNotice,
    closeGuideDisabledNotice,
  } = useSimulatorCustomerGuide({
    mode,
    token,
    step,
    hasIntroStep,
    isFilmSheetOpen,
    loading: state.loading,
    expired: state.expired,
    setupNeeded: state.setupNeeded,
  });

  const undoStackRef = useRef<SimulatorUndoSnapshot[]>([]);
  const latestSnapshotRef = useRef<SimulatorUndoSnapshot | null>(null);
  const showExitConfirmRef = useRef(false);
  const activeGuideStepRef = useRef<typeof activeGuideStep>(null);
  const showGuideDisabledNoticeRef = useRef(false);
  const allowNativeBackRef = useRef(false);
  const pushHistoryTrapRef = useRef<(() => void) | null>(null);
  const rapidBackPressCountRef = useRef(0);
  const rapidBackFirstPressAtRef = useRef(0);
  const rapidBackLastPressAtRef = useRef(0);

  const resetRapidBackExitPresses = useCallback(() => {
    rapidBackPressCountRef.current = 0;
    rapidBackFirstPressAtRef.current = 0;
    rapidBackLastPressAtRef.current = 0;
  }, []);

  const registerRapidBackExitPress = useCallback(() => {
    const now = Date.now();
    const firstPressedAt = rapidBackFirstPressAtRef.current;
    const lastPressedAt = rapidBackLastPressAtRef.current;
    const isNewBackSequence =
      !firstPressedAt ||
      !lastPressedAt ||
      now - firstPressedAt > RAPID_BACK_EXIT_WINDOW_MS ||
      now - lastPressedAt > RAPID_BACK_EXIT_WINDOW_MS;

    if (isNewBackSequence) {
      rapidBackPressCountRef.current = 1;
      rapidBackFirstPressAtRef.current = now;
    } else {
      rapidBackPressCountRef.current += 1;
    }

    rapidBackLastPressAtRef.current = now;

    return rapidBackPressCountRef.current >= RAPID_BACK_EXIT_PRESS_LIMIT;
  }, []);

  const rememberVisibleApplySnapshot = useCallback((snapshot = latestSnapshotRef.current) => {
    if (!snapshot) return null;

    return {
      ...snapshot,
      isFilmSheetOpen: false,
      previewSampleFilm: null,
    };
  }, []);

  const snapshotKey = (snapshot: SimulatorUndoSnapshot) => {
    const zoneEntries = Object.entries(snapshot.zoneFilmMap)
      .map(([zoneKey, film]) => `${zoneKey}:${film?.id ?? "none"}`)
      .sort()
      .join("|");

    return [
      snapshot.step,
      snapshot.selectedSpaceId,
      snapshot.selectedFilm?.id ?? "none",
      snapshot.activeZoneKey,
      snapshot.isFilmSheetOpen ? "sheet-open" : "sheet-closed",
      snapshot.previewSampleFilm?.id ?? "sample-none",
      zoneEntries,
      snapshot.decisionMessage,
    ].join("::");
  };

  const captureSnapshot = useCallback((): SimulatorUndoSnapshot => {
    return {
      step,
      selectedSpaceId,
      selectedFilm,
      activeZoneKey,
      zoneFilmMap: { ...zoneFilmMap },
      isFilmSheetOpen,
      previewSampleFilm,
      decisionMessage,
    };
  }, [
    activeZoneKey,
    decisionMessage,
    isFilmSheetOpen,
    previewSampleFilm,
    selectedFilm,
    selectedSpaceId,
    step,
    zoneFilmMap,
  ]);

  useEffect(() => {
    latestSnapshotRef.current = captureSnapshot();
  }, [captureSnapshot]);

  useLayoutEffect(() => {
    showExitConfirmRef.current = showExitConfirm;
    activeGuideStepRef.current = activeGuideStep;
    showGuideDisabledNoticeRef.current = showGuideDisabledNotice;
  }, [activeGuideStep, showExitConfirm, showGuideDisabledNotice]);

  useEffect(() => {
    if (!activeGuideStep || mode !== "customer" || state.loading || state.expired || state.setupNeeded) {
      return;
    }

    // 가이드 카드가 떠 있는 상태에서는 모바일/인앱브라우저 뒤로가기가
    // 앱 밖으로 빠지지 않고 먼저 가이드 카드만 닫히도록 히스토리 안전장치를 1칸 추가합니다.
    pushHistoryTrapRef.current?.();
  }, [activeGuideStep, mode, state.expired, state.loading, state.setupNeeded]);

  useEffect(() => {
    if (!showExitConfirm) {
      setExitTypingLineIndex(0);
      setExitTypingCharCount(0);
      setExitTypingPhase("typing");
      return;
    }

    const currentLine = EXIT_CONFIRM_TYPE_LINES[exitTypingLineIndex] || EXIT_CONFIRM_TYPE_LINES[0];
    const currentLength = currentLine.length;

    let timeoutMs = EXIT_CONFIRM_TYPE_SPEED_MS;
    let timeoutCallback = () => {};

    if (exitTypingPhase === "typing") {
      if (exitTypingCharCount < currentLength) {
        timeoutCallback = () => setExitTypingCharCount((prev) => Math.min(prev + 1, currentLength));
      } else {
        timeoutMs = EXIT_CONFIRM_HOLD_MS;
        timeoutCallback = () => setExitTypingPhase("deleting");
      }
    } else if (exitTypingPhase === "deleting") {
      if (exitTypingCharCount > 0) {
        timeoutMs = EXIT_CONFIRM_DELETE_SPEED_MS;
        timeoutCallback = () => setExitTypingCharCount((prev) => Math.max(prev - 1, 0));
      } else {
        timeoutMs = EXIT_CONFIRM_NEXT_LINE_DELAY_MS;
        timeoutCallback = () => {
          setExitTypingLineIndex((prev) => (prev + 1) % EXIT_CONFIRM_TYPE_LINES.length);
          setExitTypingPhase("typing");
        };
      }
    } else {
      timeoutMs = EXIT_CONFIRM_HOLD_MS;
      timeoutCallback = () => setExitTypingPhase("deleting");
    }

    const timer = window.setTimeout(timeoutCallback, timeoutMs);

    return () => {
      window.clearTimeout(timer);
    };
  }, [exitTypingCharCount, exitTypingLineIndex, exitTypingPhase, showExitConfirm]);

  const rememberUndoSnapshot = useCallback((snapshot = latestSnapshotRef.current) => {
    if (!snapshot || state.loading || state.expired || state.setupNeeded) return;

    setShowExitConfirm(false);

    const nextKey = snapshotKey(snapshot);
    const stack = undoStackRef.current;
    const last = stack[stack.length - 1];

    if (last && snapshotKey(last) === nextKey) {
      return;
    }

    undoStackRef.current = [...stack.slice(-79), snapshot];

    // 실행취소 1개가 생길 때 브라우저 히스토리도 1칸 추가합니다.
    // 이렇게 해야 모바일/카카오톡/크롬 뒤로가기 버튼을 빠르게 눌러도
    // 앱 밖으로 빠지지 않고 내부 실행취소가 먼저 처리됩니다.
    pushHistoryTrapRef.current?.();
  }, [state.expired, state.loading, state.setupNeeded]);

  const restoreUndoSnapshot = useCallback((snapshot: SimulatorUndoSnapshot) => {
    setStep(snapshot.step);
    setSelectedSpaceId(snapshot.selectedSpaceId);
    setSelectedFilm(snapshot.selectedFilm);
    setActiveZoneKey(snapshot.activeZoneKey);
    setZoneFilmMap({ ...snapshot.zoneFilmMap });
    setIsFilmSheetOpen(snapshot.isFilmSheetOpen);
    setPreviewSampleFilm(snapshot.previewSampleFilm);
    setDecisionMessage(snapshot.decisionMessage);
    setApplyingFilmId(null);
    setFilmError("");
    setShowExitConfirm(false);
  }, [setDecisionMessage, setFilmError]);

  const goBackOneSimulatorAction = useCallback(() => {
    if (showExitConfirmRef.current) {
      setShowExitConfirm(false);
      return true;
    }

    if (activeGuideStepRef.current) {
      activeGuideStepRef.current = null;
      closeCustomerGuide();
      return true;
    }

    if (showGuideDisabledNoticeRef.current) {
      showGuideDisabledNoticeRef.current = false;
      closeGuideDisabledNotice();
      return true;
    }

    const previousSnapshot = undoStackRef.current.pop();

    if (previousSnapshot) {
      restoreUndoSnapshot(previousSnapshot);
      return true;
    }

    return false;
  }, [
    closeCustomerGuide,
    closeGuideDisabledNotice,
    restoreUndoSnapshot,
  ]);

  const goBackOneSimulatorActionRef = useRef(goBackOneSimulatorAction);

  useEffect(() => {
    goBackOneSimulatorActionRef.current = goBackOneSimulatorAction;
  }, [goBackOneSimulatorAction]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const guardKey = "__egoseSimulatorBackGuard";
    const baseKey = "__egoseSimulatorBackBase";
    let guardId = Date.now();
    let isCurrentEntryGuard = false;
    let isDisposed = false;

    const getSafeHistoryState = () => {
      const currentState = window.history.state;
      return currentState && typeof currentState === "object" ? currentState : {};
    };

    const getCleanHref = () => getUrlWithoutEgoseBackGuard(window.location.href);

    const replaceCurrentEntryAsBase = () => {
      const currentState = getSafeHistoryState();

      window.history.replaceState(
        {
          ...currentState,
          [baseKey]: true,
          [guardKey]: false,
        },
        "",
        getCleanHref()
      );

      isCurrentEntryGuard = false;
    };

    const pushSingleBackGuard = () => {
      if (allowNativeBackRef.current || isDisposed || isCurrentEntryGuard) {
        return;
      }

      const currentState = getSafeHistoryState();
      const nextGuardId = guardId + 1;
      guardId = nextGuardId;

      // Next.js App Router가 history.state 안에 보관하는 내부 값을 보존하면서
      // 시뮬레이터용 뒤로가기 잠금문만 1칸 추가합니다.
      // 여러 칸을 쌓아 depth를 세는 방식은 카카오/크롬에서 실제 history와
      // ref 값이 어긋날 수 있어, 항상 “현재 페이지 바로 앞 1칸”만 유지합니다.
      window.history.pushState(
        {
          ...currentState,
          [baseKey]: false,
          [guardKey]: true,
          guardId: nextGuardId,
        },
        "",
        getUrlWithEgoseBackGuard(getCleanHref(), nextGuardId)
      );

      isCurrentEntryGuard = true;
    };

    const rearmBackGuard = () => {
      if (!allowNativeBackRef.current && !isDisposed) {
        pushSingleBackGuard();
      }

      // 일부 인앱브라우저는 popstate 직후 pushState 반영이 한 박자 늦을 수 있어
      // 짧은 보충 호출을 한 번 더 둡니다. 이미 guard 위에 있으면 no-op입니다.
      window.setTimeout(() => {
        if (!allowNativeBackRef.current && !isDisposed) {
          pushSingleBackGuard();
        }
      }, 30);
    };

    pushHistoryTrapRef.current = pushSingleBackGuard;

    replaceCurrentEntryAsBase();
    pushSingleBackGuard();

    const handlePopState = () => {
      if (allowNativeBackRef.current) {
        return;
      }

      // 사용자가 뒤로가기를 누르면 guard entry에서 base entry로 이동한 상태입니다.
      // 이 순간 앱 밖으로 나가기 전에 시뮬레이터 내부 상태를 먼저 소비하고,
      // 처리 직후 다시 guard entry를 세웁니다.
      isCurrentEntryGuard = false;

      if (registerRapidBackExitPress()) {
        setShowExitConfirm(true);
        resetRapidBackExitPresses();
        rearmBackGuard();
        return;
      }

      const handledInsideSimulator = goBackOneSimulatorActionRef.current();

      if (!handledInsideSimulator) {
        setShowExitConfirm(true);
        resetRapidBackExitPresses();
      }

      rearmBackGuard();
    };

    window.addEventListener("popstate", handlePopState);

    return () => {
      isDisposed = true;
      window.removeEventListener("popstate", handlePopState);
      if (pushHistoryTrapRef.current === pushSingleBackGuard) {
        pushHistoryTrapRef.current = null;
      }
    };
  }, [registerRapidBackExitPress, resetRapidBackExitPresses]);

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
    const currentFilm = zoneFilmMap[zoneKey] || null;

    if (currentFilm?.id !== film.id) {
      // 필름 선택창 안에서 필름을 고르는 순간의 상태를 그대로 저장하면
      // 뒤로가기 시 선택창이 다시 열립니다.
      // 사용자가 기대하는 것은 “방금 적용한 필름만 취소”이므로
      // 선택창은 닫힌 상태의 적용 화면을 실행취소 지점으로 저장합니다.
      rememberUndoSnapshot(rememberVisibleApplySnapshot());
    }

    setSelectedFilm(film);
    setZoneFilmMap((prev) => ({
      ...prev,
      [zoneKey]: film,
    }));
  };

  const clearZoneFilm = (zoneKey: string) => {
    if (zoneFilmMap[zoneKey]) {
      rememberUndoSnapshot();
    }

    setZoneFilmMap((prev) => ({
      ...prev,
      [zoneKey]: null,
    }));
  };

  const clearAllZones = () => {
    const hasAnyFilm = Object.values(zoneFilmMap).some(Boolean);

    if (hasAnyFilm) {
      rememberUndoSnapshot();
    }

    setZoneFilmMap({});
  };

  const applyFilmToAllZones = (film: SimulatorFilm) => {
    const hasChangedZone = maskZones.some((zone) => zoneFilmMap[zone.key]?.id !== film.id);

    if (hasChangedZone) {
      rememberUndoSnapshot();
    }

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

    rememberUndoSnapshot();

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

  const goStepWithUndo = (nextStep: SimulatorStep) => {
    if (step !== nextStep) {
      rememberUndoSnapshot();
    }

    setStep(nextStep);
  };

  const selectSpaceAndGoApply = (spaceId: string) => {
    rememberUndoSnapshot();
    setSelectedSpaceId(spaceId);
    setStep("apply");
  };

  const goApplyStep = () => {
    if (step !== "apply") {
      rememberUndoSnapshot();
    }

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

    rememberUndoSnapshot();
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
      setIsFilmSheetOpen(false);
    } catch {
      setFilmError("이미지를 불러오지 못했습니다. 다시 선택해주세요.");
    } finally {
      setApplyingFilmId(null);
    }
  };

  const toggleSamplePreview = (film: SimulatorFilm) => {
    if (!film.sample_url) return;

    if (previewSampleFilm?.id !== film.id) {
      rememberUndoSnapshot();
    }

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


  const exitTypingCurrentLine =
    EXIT_CONFIRM_TYPE_LINES[exitTypingLineIndex] || EXIT_CONFIRM_TYPE_LINES[0];
  const exitTypingText = exitTypingCurrentLine.slice(0, exitTypingCharCount);

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
              onStart={() => goStepWithUndo("space")}
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
              onBackToSpace={() => goStepWithUndo("space")}
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
              onBackToApply={() => goStepWithUndo("apply")}
              onShareDecisionResult={() => void shareDecisionResult()}
            />
          )}
        </div>

        {!state.loading ? (
          <SimulatorBottomStepNav
            step={step}
            hasIntroStep={hasIntroStep}
            onIntro={() => goStepWithUndo("intro")}
            onSpace={() => goStepWithUndo("space")}
            onApply={goApplyStep}
            onDecision={() => goStepWithUndo("decision")}
          />
        ) : null}

        {showExitConfirm ? (
          <div
            className="simulatorExitConfirmOverlay"
            role="presentation"
            onClick={() => {
              setShowExitConfirm(false);
              resetRapidBackExitPresses();
            }}
          >
            <section
              className="simulatorExitConfirmModal"
              role="dialog"
              aria-modal="true"
              aria-labelledby="simulator-exit-confirm-title"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="simulatorExitConfirmEmoji" aria-hidden="true">
                😢
              </div>

              <h3 id="simulator-exit-confirm-title" className="simulatorExitConfirmTitle">
                시뮬레이션을 종료하시겠습니까?
              </h3>
              <div className="simulatorExitConfirmTypewriter" aria-live="polite">
                <span>{exitTypingText || " "}</span>
                <span className="simulatorExitConfirmCursor" aria-hidden="true" />
              </div>

              <div className="simulatorExitConfirmActions">
                <button
                  type="button"
                  className="simulatorExitConfirmCancel"
                  onClick={() => {
                    setShowExitConfirm(false);
                    resetRapidBackExitPresses();
                  }}
                >
                  계속하기
                </button>

                <button
                  type="button"
                  className="simulatorExitConfirmLeave"
                  onClick={() => {
                    resetRapidBackExitPresses();
                    allowNativeBackRef.current = true;

                    if (requestKakaoInAppBrowserClose()) {
                      window.setTimeout(() => {
                        allowNativeBackRef.current = false;
                      }, 1200);
                      return;
                    }

                    // 현재 guard entry와 그 아래 base entry를 함께 지나가야
                    // 실제 이전 화면으로 나갈 수 있습니다.
                    window.history.go(-2);
                  }}
                >
                  종료하기
                </button>
              </div>
            </section>
          </div>
        ) : null}

        {currentGuide ? (
          <SimulatorCustomerGuideModal
            guide={currentGuide}
            onClose={closeCustomerGuide}
            onDisable={disableCustomerGuide}
          />
        ) : null}

        {showGuideDisabledNotice ? (
          <SimulatorCustomerGuideNoticeModal onClose={closeGuideDisabledNotice} />
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

      {step === "decision" ? (
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
      ) : null}

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
