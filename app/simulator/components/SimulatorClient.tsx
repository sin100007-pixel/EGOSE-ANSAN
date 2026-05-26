"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties } from "react";
import Image from "next/image";
import dynamic from "next/dynamic";
import type { SimulatorFilm, SimulatorSpace } from "../types";
import SimulatorIntroOverview from "./SimulatorIntroOverview";
import SimulatorClientStyles from "./SimulatorClientStyles";
import SimulatorAdminTutorial, { type SimulatorAdminTutorialStep } from "./SimulatorAdminTutorial";
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

const SimulatorApplyStep = dynamic(() => import("./client/SimulatorApplyStep"), { ssr: false });
const SimulatorDecisionStep = dynamic(() => import("./client/SimulatorDecisionStep"), { ssr: false });
const SimulatorCustomerGuideModal = dynamic(
  () => import("./client/SimulatorCustomerGuideModal"),
  { ssr: false }
);
const SimulatorCustomerGuidePromptModal = dynamic(
  () => import("./client/SimulatorCustomerGuidePromptModal"),
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


const SIMULATOR_BACK_GUARD_HASH_PREFIX = "__egose_simulator_back_guard_";
const SIMULATOR_BACK_GUARD_TOP_LEVEL = 8;

function getUrlWithoutSimulatorBackGuard(value: string) {
  try {
    const url = new URL(value);

    if (url.hash.startsWith(`#${SIMULATOR_BACK_GUARD_HASH_PREFIX}`)) {
      url.hash = "";
    }

    return url.toString();
  } catch {
    return value.replace(/#__egose_simulator_back_guard_\d+$/, "");
  }
}

function getUrlWithSimulatorBackGuard(value: string, level: number) {
  try {
    const url = new URL(getUrlWithoutSimulatorBackGuard(value));
    url.hash = `${SIMULATOR_BACK_GUARD_HASH_PREFIX}${level}`;
    return url.toString();
  } catch {
    return `${getUrlWithoutSimulatorBackGuard(value)}#${SIMULATOR_BACK_GUARD_HASH_PREFIX}${level}`;
  }
}

function readSimulatorBackGuardLevelFromUrl(value: string) {
  const match = value.match(/#__egose_simulator_back_guard_(\d+)$/);
  if (!match) return 0;

  const level = Number(match[1]);
  return Number.isFinite(level) ? level : 0;
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

type SimulatorFavoriteCandidate = {
  id: string;
  created_at: string;
  space: SimulatorSpace | null;
  maskZones: ReturnType<typeof readMaskZones>;
  zoneFilmMap: Record<string, SimulatorFilm | null>;
};

const MAX_FAVORITE_CANDIDATES = 30;
const MAX_FAVORITE_SHARE_COUNT = 3;

const CUSTOMER_INTRO_TUTORIAL_STEPS = [
  {
    id: "customer-intro-welcome",
    title: "시뮬레이터에 오신 걸 환영합니다.",
    description: (
      <>
        필름 색 조합에 따른 뉘앙스 차이를 보여드립니다.
        <br />
        실제 필름과는 차이가 있으니 유의해주세요.
      </>
    ),
  },
  {
    id: "customer-intro-profile",
    title: "소개",
    description: "소개와 연락처입니다.",
    target: "customer-intro-profile",
    scrollBlock: "center",
    cardPlacement: "bottom",
    cardBottom: 86,
    cardBottomMobile: 78,
  },
  {
    id: "customer-intro-portfolio",
    title: "대표시공사진",
    description: "실제 시공사례입니다.",
    target: "customer-intro-portfolio",
    scrollBlock: "center",
    cardPlacement: "top",
  },
  {
    id: "customer-intro-guide-toggle",
    title: "가이드 다시 보기 버튼",
    description: "오른쪽 상단의 가이드 버튼을 누르면 현재 화면의 사용설명을 다시 볼 수 있습니다.",
    target: "customer-intro-guide-toggle",
    cardPlacement: "bottom",
  },
  {
    id: "customer-intro-start",
    title: "시뮬레이션시작",
    description: "준비되셨다면 시뮬레이션 시작버튼을 눌러 시작해주세요.",
    target: "customer-intro-start",
    scrollBlock: "center",
    cardPlacement: "top",
  },
] satisfies readonly SimulatorAdminTutorialStep[];

const CUSTOMER_SPACE_TUTORIAL_STEPS = [
  {
    id: "customer-space-hero",
    title: "공간 선택 단계",
    description: "필름을 적용해볼 공간을 고르는 단계입니다.",
    target: "customer-space-hero",
    scrollBlock: "center",
    cardPlacement: "bottom",
  },
  {
    id: "customer-space-list",
    title: "공간 목록",
    description:
      "목록중에 필름을 적용해보고 싶은 공간을 클릭해주세요. 썸네일을 클릭하시면 바로 3단계 필름적용으로 넘어갑니다.",
    target: "customer-space-list",
    scrollBlock: "center",
    cardPlacement: "top",
  },
] satisfies readonly SimulatorAdminTutorialStep[];


const CUSTOMER_APPLY_TUTORIAL_STEPS = [
  {
    id: "customer-apply-hero",
    title: "색상 적용",
    description: "선택된 공간에 필름을 적용해보는 단계입니다.",
    target: "customer-apply-hero",
    scrollBlock: "center",
    cardPlacement: "bottom",
  },
  {
    id: "customer-apply-preview",
    title: "필름을 적용할 구역 선택 1",
    description: (
      <>
        <span className="simAdminTutorialCheckerIcon" aria-hidden="true" />이 있는 구역을 누르면 그 구역에 필름을 적용할 수 있습니다.
      </>
    ),
    target: "customer-apply-preview",
    scrollBlock: "center",
    cardPlacement: "bottom",
  },
  {
    id: "customer-apply-zone-buttons",
    title: "필름을 적용할 구역 선택 2",
    description: "강조된 곳의 버튼을 누르면 그 그곳에 필름을 적용 할 수 있습니다.",
    target: "customer-apply-zone-buttons",
    scrollBlock: "center",
    cardPlacement: "top",
  },
  {
    id: "customer-apply-sheet",
    title: "필름 색상 검색",
    description: "구역을 선택하면 그 구역에 적용할 필름을 선택하는 창입니다.",
    target: "customer-apply-sheet",
    scrollBlock: "start",
    cardPlacement: "top",
  },
  {
    id: "customer-apply-pattern-filter",
    title: "패턴으로 필터링",
    description: "필름의 패턴으로 필터링할 수 있습니다.",
    target: "customer-apply-pattern-filter",
    scrollBlock: "start",
    cardPlacement: "bottom",
    cardBottom: 28,
    cardBottomMobile: 20,
  },
  {
    id: "customer-apply-color-filter",
    title: "색상으로 필터링",
    description: "색상팔레트에서 색상을 고르시면 비슷한 색으로 모아서 보여드립니다.",
    tip: "1차분류2차분류랑 조합해서 쓸 수 있어요. 예)솔리드>베이직 솔리드> 흰색 이면 베이직 솔리드의 흰색계열을 모아서 보여드려요.",
    target: "customer-apply-color-filter",
    scrollBlock: "start",
    cardPlacement: "bottom",
    cardBottom: 24,
    cardBottomMobile: 18,
  },
  {
    id: "customer-apply-favorite",
    title: "즐겨찾기",
    description:
      "완성한 조합을 저장할 수 있어요. 저장된 조합은 4단계 결정확정에 보관돼요. 시뮬레이터를 껏다켜도 최대한 저장될 수 있게 끔 만들어졌지만 사라질 수 있으니 조심해주세요.",
    target: "customer-apply-favorite",
    scrollBlock: "center",
    cardPlacement: "top",
  },
  {
    id: "customer-apply-decision",
    title: "결정확정으로 넘어가기",
    description: "다음 단계인 결정확정으로 넘어갈 수 있어요.",
    target: "customer-apply-decision",
    scrollBlock: "center",
    cardPlacement: "top",
  },
] satisfies readonly SimulatorAdminTutorialStep[];

const CUSTOMER_DECISION_TUTORIAL_STEPS = [
  {
    id: "customer-decision-hero",
    title: "결정 확정 단계",
    description: "조합된 공간과 필름을 저장 및 공유하고, 결정에 도움을 드리는 곳입니다.",
    target: "customer-decision-hero",
    scrollBlock: "center",
    cardPlacement: "bottom",
  },
  {
    id: "customer-decision-candidates-section",
    title: "즐겨찾기 후보",
    description: "3단계 색상 적용에서 저장된 즐겨찾기를 보관하는 곳입니다.",
    target: "customer-decision-candidates-section",
    scrollBlock: "center",
    cardPlacement: "top",
  },
  {
    id: "customer-decision-candidate-select",
    title: "즐겨찾기 후보 공유",
    description: (
      <>
        후보를 눌러 선택 후, 하단에 선택한 후보를{" "}
        <span className="simAdminTutorialInlineButton simAdminTutorialInlineButtonShare">선택한 후보 공유</span>
        버튼을 눌러 공유하세요.
      </>
    ),
    target: "customer-decision-candidate-select",
    scrollBlock: "start",
    scrollOffset: -88,
    cardPlacement: "bottom",
  },
  {
    id: "customer-decision-candidate-actions",
    title: "저장된 즐겨찾기 후보 삭제 및 불러오기",
    description: (
      <>
        <span className="simAdminTutorialInlineButton simAdminTutorialInlineButtonLoad">불러오기</span>
        버튼을 눌러 3단계에서 저장된 색을 불러옵니다.
        <br />
        <span className="simAdminTutorialInlineButton simAdminTutorialInlineButtonDelete">삭제</span>
        버튼을 눌러 없앨 수 있습니다.
      </>
    ),
    target: "customer-decision-candidate-actions",
    scrollBlock: "center",
    cardPlacement: "bottom",
    cardBottom: 26,
    cardBottomMobile: 18,
  },
  {
    id: "customer-decision-sample",
    title: "실물 필름 확인해보기",
    description: "삼성필름 총판에 방문하시면 선택한 필름 실물을 보여드리고, 샘플을 드립니다.",
    target: "customer-decision-sample",
    scrollBlock: "center",
    cardPlacement: "top",
  },
  {
    id: "customer-decision-kakao",
    title: "카카오톡 문의",
    description: (
      <>
        <span className="simAdminTutorialInlineButton simAdminTutorialInlineButtonKakao">카카오톡 문의하기</span>
        을 누르시면 오픈톡방으로 연결됩니다.
      </>
    ),
    target: "customer-decision-kakao",
    scrollBlock: "center",
    cardPlacement: "top",
  },
  {
    id: "customer-decision-bottom-nav",
    title: "하단 네비게이션 버튼",
    description: "하단의 버튼을 이용해 원하는 단계로 언제든 이동하실 수 있습니다.",
    target: "customer-bottom-step-nav",
    scrollBlock: "nearest",
    cardPlacement: "top",
    spotlightFullViewport: true,
  },
  {
    id: "customer-decision-guide-toggle",
    title: "가이드 다시 보기 버튼",
    description: "오른쪽 상단의 가이드 버튼을 누르면 현재 화면의 사용설명을 다시 볼 수 있습니다.",
    target: "customer-intro-guide-toggle",
    cardPlacement: "bottom",
  },
] satisfies readonly SimulatorAdminTutorialStep[];



function buildFavoriteStorageKey(mode: SimulatorClientProps["mode"], token: string) {
  return `egose-simulator-favorites:${mode}:${token || "default"}`;
}

function buildFavoriteSignature(
  spaceId: string,
  maskZones: ReturnType<typeof readMaskZones>,
  zoneFilmMap: Record<string, SimulatorFilm | null>
) {
  const zoneSignature = maskZones
    .map((zone) => `${zone.key}:${zoneFilmMap[zone.key]?.id ?? "none"}`)
    .sort()
    .join("|");

  return `${spaceId || "space-none"}::${zoneSignature}`;
}

function isFavoriteCandidate(value: unknown): value is SimulatorFavoriteCandidate {
  if (!value || typeof value !== "object") return false;

  const candidate = value as Partial<SimulatorFavoriteCandidate>;

  return (
    typeof candidate.id === "string" &&
    typeof candidate.created_at === "string" &&
    (!candidate.space || typeof candidate.space === "object") &&
    Array.isArray(candidate.maskZones) &&
    Boolean(candidate.zoneFilmMap) &&
    typeof candidate.zoneFilmMap === "object"
  );
}

const FAVORITE_INDEXED_DB_NAME = "egose-simulator-favorites-db";
const FAVORITE_INDEXED_DB_VERSION = 1;
const FAVORITE_INDEXED_DB_STORE_NAME = "favoriteLists";

type FavoriteIndexedDbRecord = {
  key: string;
  candidates: SimulatorFavoriteCandidate[];
  updated_at: string;
};

function normalizeFavoriteCandidates(value: unknown) {
  if (!Array.isArray(value)) return [];

  return value.filter(isFavoriteCandidate).slice(0, MAX_FAVORITE_CANDIDATES);
}

function mergeFavoriteCandidates(...candidateGroups: SimulatorFavoriteCandidate[][]) {
  const candidateMap = new Map<string, SimulatorFavoriteCandidate>();

  candidateGroups.flat().forEach((candidate) => {
    if (!candidateMap.has(candidate.id)) {
      candidateMap.set(candidate.id, candidate);
      return;
    }

    const currentCandidate = candidateMap.get(candidate.id);
    const currentCreatedAt = currentCandidate?.created_at ? Date.parse(currentCandidate.created_at) : 0;
    const nextCreatedAt = candidate.created_at ? Date.parse(candidate.created_at) : 0;

    if (nextCreatedAt >= currentCreatedAt) {
      candidateMap.set(candidate.id, candidate);
    }
  });

  return Array.from(candidateMap.values())
    .sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at))
    .slice(0, MAX_FAVORITE_CANDIDATES);
}

function readFavoriteCandidatesFromLocalStorage(storageKey: string) {
  if (typeof window === "undefined") return [];

  try {
    const raw = window.localStorage.getItem(storageKey);
    const parsed = raw ? JSON.parse(raw) : [];
    return normalizeFavoriteCandidates(parsed);
  } catch {
    return [];
  }
}

function writeFavoriteCandidatesToLocalStorage(
  storageKey: string,
  candidates: SimulatorFavoriteCandidate[]
) {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(
      storageKey,
      JSON.stringify(candidates.slice(0, MAX_FAVORITE_CANDIDATES))
    );
  } catch {
    // localStorage가 막힌 환경에서는 IndexedDB 저장만 시도합니다.
  }
}

function openFavoriteIndexedDb() {
  return new Promise<IDBDatabase | null>((resolve) => {
    if (typeof window === "undefined" || !("indexedDB" in window)) {
      resolve(null);
      return;
    }

    const request = window.indexedDB.open(FAVORITE_INDEXED_DB_NAME, FAVORITE_INDEXED_DB_VERSION);

    request.onupgradeneeded = () => {
      const database = request.result;

      if (!database.objectStoreNames.contains(FAVORITE_INDEXED_DB_STORE_NAME)) {
        database.createObjectStore(FAVORITE_INDEXED_DB_STORE_NAME, { keyPath: "key" });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => resolve(null);
    request.onblocked = () => resolve(null);
  });
}

async function readFavoriteCandidatesFromIndexedDb(storageKey: string) {
  const database = await openFavoriteIndexedDb();
  if (!database) return [];

  return new Promise<SimulatorFavoriteCandidate[]>((resolve) => {
    try {
      const transaction = database.transaction(FAVORITE_INDEXED_DB_STORE_NAME, "readonly");
      const store = transaction.objectStore(FAVORITE_INDEXED_DB_STORE_NAME);
      const request = store.get(storageKey);

      request.onsuccess = () => {
        const record = request.result as FavoriteIndexedDbRecord | undefined;
        resolve(normalizeFavoriteCandidates(record?.candidates));
      };
      request.onerror = () => resolve([]);
      transaction.oncomplete = () => database.close();
      transaction.onerror = () => database.close();
      transaction.onabort = () => database.close();
    } catch {
      database.close();
      resolve([]);
    }
  });
}

async function writeFavoriteCandidatesToIndexedDb(
  storageKey: string,
  candidates: SimulatorFavoriteCandidate[]
) {
  const database = await openFavoriteIndexedDb();
  if (!database) return;

  return new Promise<void>((resolve) => {
    try {
      const transaction = database.transaction(FAVORITE_INDEXED_DB_STORE_NAME, "readwrite");
      const store = transaction.objectStore(FAVORITE_INDEXED_DB_STORE_NAME);
      const record: FavoriteIndexedDbRecord = {
        key: storageKey,
        candidates: candidates.slice(0, MAX_FAVORITE_CANDIDATES),
        updated_at: new Date().toISOString(),
      };

      store.put(record);
      transaction.oncomplete = () => {
        database.close();
        resolve();
      };
      transaction.onerror = () => {
        database.close();
        resolve();
      };
      transaction.onabort = () => {
        database.close();
        resolve();
      };
    } catch {
      database.close();
      resolve();
    }
  });
}

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
const RAPID_BACK_EXIT_PRESS_LIMIT = 4;
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
  const [favoriteCandidates, setFavoriteCandidates] = useState<SimulatorFavoriteCandidate[]>([]);
  const [selectedFavoriteCandidateIds, setSelectedFavoriteCandidateIds] = useState<string[]>([]);
  const [favoriteShareExportCandidates, setFavoriteShareExportCandidates] = useState<SimulatorFavoriteCandidate[]>([]);
  const [favoriteStorageReadyKey, setFavoriteStorageReadyKey] = useState("");
  const [favoriteToastMessage, setFavoriteToastMessage] = useState("");

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
  const customerGuideEnabled = mode === "customer" || mode === "installer";
  const hasIntroStep = mode === "customer" && Boolean(state.contractor);
  const favoriteStorageKey = useMemo(() => buildFavoriteStorageKey(mode, token), [mode, token]);

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

  const selectedFavoriteCandidates = useMemo(() => {
    if (selectedFavoriteCandidateIds.length === 0) return [];

    const selectedIdSet = new Set(selectedFavoriteCandidateIds);
    return favoriteCandidates.filter((candidate) => selectedIdSet.has(candidate.id));
  }, [favoriteCandidates, selectedFavoriteCandidateIds]);

  const {
    decisionExportRef,
    decisionMessage,
    setDecisionMessage,
    decisionPopupMessage,
    closeDecisionPopupMessage,
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

  const { isDashboardMoving, goToDashboard, replaceToDashboard } = useDashboardNavigation(mode);

  const {
    activeGuideStep,
    currentGuide,
    openCustomerGuide,
    closeCustomerGuide,
    showGuideStartPrompt,
    startCustomerGuideFromPrompt,
    skipCustomerGuideFromPrompt,
    closeGuideStartPrompt,
    showGuideSkippedNotice,
    closeGuideSkippedNotice,
  } = useSimulatorCustomerGuide({
    mode,
    guideEnabled: customerGuideEnabled,
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
  const activeGuideStepRef = useRef(activeGuideStep);
  const showGuideStartPromptRef = useRef(showGuideStartPrompt);
  const showGuideSkippedNoticeRef = useRef(showGuideSkippedNotice);
  const allowNativeBackRef = useRef(false);
  const backGuardRepairPopCountRef = useRef(0);
  const backGuardActionLockRef = useRef(false);
  const rapidBackPressCountRef = useRef(0);
  const rapidBackFirstPressAtRef = useRef(0);
  const rapidBackLastPressAtRef = useRef(0);
  const favoriteToastTimerRef = useRef<number | null>(null);
  const favoriteCandidatesRef = useRef<SimulatorFavoriteCandidate[]>([]);

  const persistFavoriteCandidates = useCallback((candidates: SimulatorFavoriteCandidate[]) => {
    const nextCandidates = candidates.slice(0, MAX_FAVORITE_CANDIDATES);

    writeFavoriteCandidatesToLocalStorage(favoriteStorageKey, nextCandidates);
    void writeFavoriteCandidatesToIndexedDb(favoriteStorageKey, nextCandidates);
  }, [favoriteStorageKey]);

  const commitFavoriteCandidates = useCallback((candidates: SimulatorFavoriteCandidate[]) => {
    const nextCandidates = candidates.slice(0, MAX_FAVORITE_CANDIDATES);

    favoriteCandidatesRef.current = nextCandidates;
    setFavoriteCandidates(nextCandidates);
    persistFavoriteCandidates(nextCandidates);
  }, [persistFavoriteCandidates]);

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

  useEffect(() => {
    showExitConfirmRef.current = showExitConfirm;
  }, [showExitConfirm]);

  useEffect(() => {
    activeGuideStepRef.current = activeGuideStep;
  }, [activeGuideStep]);

  useEffect(() => {
    showGuideStartPromptRef.current = showGuideStartPrompt;
  }, [showGuideStartPrompt]);

  useEffect(() => {
    showGuideSkippedNoticeRef.current = showGuideSkippedNotice;
  }, [showGuideSkippedNotice]);

  useEffect(() => {
    favoriteCandidatesRef.current = favoriteCandidates;
  }, [favoriteCandidates]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    let cancelled = false;
    setFavoriteStorageReadyKey("");

    const loadFavorites = async () => {
      const localCandidates = readFavoriteCandidatesFromLocalStorage(favoriteStorageKey);
      const indexedDbCandidates = await readFavoriteCandidatesFromIndexedDb(favoriteStorageKey);

      if (cancelled) return;

      setFavoriteCandidates((prev) => {
        const nextCandidates = mergeFavoriteCandidates(prev, localCandidates, indexedDbCandidates);
        favoriteCandidatesRef.current = nextCandidates;
        writeFavoriteCandidatesToLocalStorage(favoriteStorageKey, nextCandidates);
        void writeFavoriteCandidatesToIndexedDb(favoriteStorageKey, nextCandidates);
        return nextCandidates;
      });
      setFavoriteStorageReadyKey(favoriteStorageKey);
    };

    void loadFavorites();

    return () => {
      cancelled = true;
    };
  }, [favoriteStorageKey]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (favoriteStorageReadyKey !== favoriteStorageKey) return;

    persistFavoriteCandidates(favoriteCandidates);
  }, [favoriteCandidates, favoriteStorageKey, favoriteStorageReadyKey, persistFavoriteCandidates]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const persistLatestFavorites = () => {
      persistFavoriteCandidates(favoriteCandidatesRef.current);
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        persistLatestFavorites();
      }
    };

    window.addEventListener("pagehide", persistLatestFavorites);
    window.addEventListener("beforeunload", persistLatestFavorites);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.removeEventListener("pagehide", persistLatestFavorites);
      window.removeEventListener("beforeunload", persistLatestFavorites);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [persistFavoriteCandidates]);

  useEffect(() => {
    const favoriteIdSet = new Set(favoriteCandidates.map((candidate) => candidate.id));

    setSelectedFavoriteCandidateIds((prev) => prev.filter((candidateId) => favoriteIdSet.has(candidateId)));
  }, [favoriteCandidates]);

  useEffect(() => {
    return () => {
      if (favoriteToastTimerRef.current !== null) {
        window.clearTimeout(favoriteToastTimerRef.current);
      }
    };
  }, []);

  const showFavoriteToast = useCallback((message: string) => {
    setFavoriteToastMessage(message);

    if (favoriteToastTimerRef.current !== null) {
      window.clearTimeout(favoriteToastTimerRef.current);
    }

    favoriteToastTimerRef.current = window.setTimeout(() => {
      setFavoriteToastMessage("");
      favoriteToastTimerRef.current = null;
    }, 2300);
  }, []);

  const waitForFavoriteExportPaint = useCallback(() => {
    return new Promise<void>((resolve) => {
      if (typeof window === "undefined") {
        resolve();
        return;
      }

      window.requestAnimationFrame(() => {
        window.requestAnimationFrame(() => resolve());
      });
    });
  }, []);

  const buildFavoriteCandidatesShareText = useCallback((candidates: SimulatorFavoriteCandidate[]) => {
    const lines: string[] = [
      "필름 시뮬레이션 즐겨찾기 후보",
      state.link?.installer_name ? `시공자: ${state.link.installer_name}` : "",
      "",
    ].filter(Boolean);

    candidates.forEach((candidate, index) => {
      const candidateZones = candidate.maskZones.length > 0 ? candidate.maskZones : maskZones;

      lines.push(`${index + 1}. ${candidate.space?.name || `저장한 후보 ${index + 1}`}`);

      candidateZones.forEach((zone) => {
        const film = candidate.zoneFilmMap[zone.key] || null;
        lines.push(`${zone.label}: ${film ? getFilmName(film) : "미선택"}`);
      });

      const hasCandidateFabricWarning = candidateZones.some((zone) => {
        const film = candidate.zoneFilmMap[zone.key] || null;
        return film ? isFabricFilm(film) : false;
      });

      if (hasCandidateFabricWarning) {
        lines.push("주의: 선택된 필름에 패브릭필름이 있습니다.");
      }

      if (index < candidates.length - 1) {
        lines.push("");
      }
    });

    return lines.join("\n");
  }, [maskZones, state.link?.installer_name]);

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
      closeCustomerGuide();
      activeGuideStepRef.current = null;
      return true;
    }

    if (showGuideStartPromptRef.current) {
      closeGuideStartPrompt();
      showGuideStartPromptRef.current = false;
      return true;
    }

    if (showGuideSkippedNoticeRef.current) {
      closeGuideSkippedNotice();
      showGuideSkippedNoticeRef.current = false;
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
    closeGuideSkippedNotice,
    closeGuideStartPrompt,
    restoreUndoSnapshot,
  ]);

  const goBackOneSimulatorActionRef = useRef(goBackOneSimulatorAction);

  useEffect(() => {
    goBackOneSimulatorActionRef.current = goBackOneSimulatorAction;
  }, [goBackOneSimulatorAction]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const guardKey = "__egoseSimulatorBackGuardLevel";
    const baseKey = "__egoseSimulatorBackBase";
    const sceneFullscreenStateKey = "__egoseSceneFullscreen";
    const baseHref = getUrlWithoutSimulatorBackGuard(window.location.href);

    const getSceneFullscreenFlags = () => {
      const egoseWindow = window as Window &
        typeof globalThis & {
          __egoseSceneFullscreenOpen?: boolean;
          __egoseSceneFullscreenBackConsumed?: boolean;
        };

      return {
        open: Boolean(egoseWindow.__egoseSceneFullscreenOpen),
        consumed: Boolean(egoseWindow.__egoseSceneFullscreenBackConsumed),
      };
    };

    const getSafeHistoryState = () => {
      const currentState = window.history.state;
      return currentState && typeof currentState === "object" ? currentState : {};
    };

    const readGuardLevel = (historyState: unknown) => {
      if (historyState && typeof historyState === "object") {
        const rawLevel = (historyState as Record<string, unknown>)[guardKey];
        const level = typeof rawLevel === "number" ? rawLevel : Number(rawLevel || 0);

        if (Number.isFinite(level) && level >= 0) {
          return level;
        }
      }

      return readSimulatorBackGuardLevelFromUrl(window.location.href);
    };

    const replaceBaseState = () => {
      const currentState = getSafeHistoryState();

      window.history.replaceState(
        {
          ...currentState,
          [baseKey]: true,
          [guardKey]: 0,
        },
        "",
        baseHref
      );
    };

    const pushPermanentGuardStates = () => {
      for (let level = 1; level <= SIMULATOR_BACK_GUARD_TOP_LEVEL; level += 1) {
        const currentState = getSafeHistoryState();

        window.history.pushState(
          {
            ...currentState,
            [baseKey]: true,
            [guardKey]: level,
          },
          "",
          getUrlWithSimulatorBackGuard(baseHref, level)
        );
      }
    };

    const ensureTopGuardFallback = () => {
      window.setTimeout(() => {
        if (allowNativeBackRef.current) return;

        const currentLevel = readGuardLevel(window.history.state);

        if (currentLevel >= SIMULATOR_BACK_GUARD_TOP_LEVEL) {
          return;
        }

        // 일부 인앱브라우저가 history.go(앞으로)를 무시하는 경우를 대비한 예비 복구입니다.
        // 이 경우에도 현재 페이지 안에 다시 안전 가드 3칸을 만들고 다음 뒤로가기를 잡습니다.
        pushPermanentGuardStates();
      }, 120);
    };

    const moveBackToTopGuard = (currentLevel: number) => {
      const safeLevel = Math.max(0, Math.min(currentLevel, SIMULATOR_BACK_GUARD_TOP_LEVEL));
      const forwardSteps = SIMULATOR_BACK_GUARD_TOP_LEVEL - safeLevel;

      if (forwardSteps <= 0) {
        return;
      }

      backGuardRepairPopCountRef.current += 1;
      window.history.go(forwardSteps);
      ensureTopGuardFallback();
    };

    replaceBaseState();
    pushPermanentGuardStates();

    const handlePopState = (event: PopStateEvent) => {
      const sceneFullscreenFlags = getSceneFullscreenFlags();
      const eventState = event.state;
      const isSceneFullscreenHistoryState = Boolean(
        eventState &&
          typeof eventState === "object" &&
          (eventState as Record<string, unknown>)[sceneFullscreenStateKey]
      );

      if (sceneFullscreenFlags.open || sceneFullscreenFlags.consumed || isSceneFullscreenHistoryState) {
        resetRapidBackExitPresses();
        return;
      }

      if (allowNativeBackRef.current) {
        return;
      }

      const currentLevel = readGuardLevel(event.state);

      if (backGuardRepairPopCountRef.current > 0 && currentLevel === SIMULATOR_BACK_GUARD_TOP_LEVEL) {
        backGuardRepairPopCountRef.current -= 1;
        return;
      }

      moveBackToTopGuard(currentLevel);

      // 카카오톡 인앱브라우저는 뒤로가기를 빠르게 누를 때 popstate가 잠금 시간 안에
      // 여러 번 들어옵니다. 빠른 연타 감지는 액션 잠금보다 먼저 처리해야
      // 4번 연타가 카카오톡에서도 누락되지 않습니다.
      if (registerRapidBackExitPress()) {
        backGuardActionLockRef.current = true;
        setShowExitConfirm(true);
        resetRapidBackExitPresses();
        window.setTimeout(() => {
          backGuardActionLockRef.current = false;
        }, 520);
        return;
      }

      // 카카오/크롬에서 물리 뒤로가기를 빠르게 두 번 누르면 popstate가 연속으로 들어올 수 있습니다.
      // 이때 내부 동작을 두 번 소비하지 말고, 우선 히스토리 위치만 안전한 맨 위 가드로 복구합니다.
      if (backGuardActionLockRef.current) {
        return;
      }

      backGuardActionLockRef.current = true;
      window.setTimeout(() => {
        backGuardActionLockRef.current = false;
      }, 320);

      const handledInsideSimulator = goBackOneSimulatorActionRef.current();

      if (handledInsideSimulator) {
        return;
      }

      setShowExitConfirm(true);
      resetRapidBackExitPresses();
    };

    window.addEventListener("popstate", handlePopState);

    return () => {
      window.removeEventListener("popstate", handlePopState);
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
    rememberUndoSnapshot();
    setDecisionMessage("");
    setStep("decision");
  };

  const saveFavoriteCandidate = useCallback(() => {
    const hasAnyFilm = maskZones.some((zone) => Boolean(zoneFilmMap[zone.key]));

    if (!hasAnyFilm) {
      showFavoriteToast("필름을 먼저 적용한 뒤 즐겨찾기해주세요.");
      return;
    }

    const signature = buildFavoriteSignature(selectedSpace?.id || selectedSpaceId, maskZones, zoneFilmMap);
    const alreadySaved = favoriteCandidatesRef.current.some((candidate) =>
      buildFavoriteSignature(candidate.space?.id || "", candidate.maskZones, candidate.zoneFilmMap) === signature
    );

    if (alreadySaved) {
      showFavoriteToast("이미 결정확인에 저장된 세팅입니다.");
      return;
    }

    const nextZoneFilmMap = maskZones.reduce<Record<string, SimulatorFilm | null>>((acc, zone) => {
      acc[zone.key] = zoneFilmMap[zone.key] || null;
      return acc;
    }, {});

    const nextCandidate: SimulatorFavoriteCandidate = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      created_at: new Date().toISOString(),
      space: selectedSpace,
      maskZones,
      zoneFilmMap: nextZoneFilmMap,
    };

    commitFavoriteCandidates([nextCandidate, ...favoriteCandidatesRef.current].slice(0, MAX_FAVORITE_CANDIDATES));
    showFavoriteToast("즐겨찾기한 세팅이 결정확인에 저장되었습니다.");
  }, [
    commitFavoriteCandidates,
    maskZones,
    selectedSpace,
    selectedSpaceId,
    showFavoriteToast,
    zoneFilmMap,
  ]);

  const applyFavoriteCandidate = useCallback((candidate: SimulatorFavoriteCandidate) => {
    rememberUndoSnapshot();

    const nextZoneFilmMap = { ...candidate.zoneFilmMap };
    const firstZoneKey = candidate.maskZones[0]?.key || Object.keys(nextZoneFilmMap)[0] || "";
    const firstFilm = Object.values(nextZoneFilmMap).find(Boolean) || null;

    if (candidate.space?.id) {
      setSelectedSpaceId(candidate.space.id);
    }

    setActiveZoneKey(firstZoneKey);
    setSelectedFilm(firstFilm);
    setZoneFilmMap(nextZoneFilmMap);
    setDecisionMessage("");
    setStep("apply");
    showFavoriteToast("즐겨찾기 후보를 불러왔습니다.");
  }, [rememberUndoSnapshot, setDecisionMessage, showFavoriteToast]);

  const toggleFavoriteCandidateForShare = useCallback(
    (candidateId: string) => {
      setSelectedFavoriteCandidateIds((prev) => {
        if (prev.includes(candidateId)) {
          return prev.filter((id) => id !== candidateId);
        }

        if (prev.length >= MAX_FAVORITE_SHARE_COUNT) {
          showFavoriteToast(`후보 공유는 한 번에 최대 ${MAX_FAVORITE_SHARE_COUNT}개까지 선택할 수 있습니다.`);
          return prev;
        }

        return [...prev, candidateId];
      });
    },
    [showFavoriteToast]
  );

  const shareFavoriteCandidates = useCallback(async () => {
    if (selectedFavoriteCandidates.length === 0) {
      showFavoriteToast("공유할 즐겨찾기 후보를 먼저 선택해주세요.");
      return;
    }

    if (selectedFavoriteCandidates.length > MAX_FAVORITE_SHARE_COUNT) {
      showFavoriteToast(`후보 공유는 한 번에 최대 ${MAX_FAVORITE_SHARE_COUNT}개까지만 가능합니다.`);
      return;
    }

    setFavoriteShareExportCandidates(selectedFavoriteCandidates);

    try {
      await waitForFavoriteExportPaint();
      await shareDecisionResult({
        title: "필름 시뮬레이션 즐겨찾기 후보",
        text: buildFavoriteCandidatesShareText(selectedFavoriteCandidates),
        fileNamePrefix: "simulation-favorites",
        successMessage: "선택한 즐겨찾기 후보 이미지와 내용을 전송했습니다.",
        textShareMessage: "선택한 즐겨찾기 후보 내용을 전송했고, 이미지는 파일 저장을 시도했습니다.",
        copyMessage: "선택한 즐겨찾기 후보 내용을 복사했고, 이미지는 파일 저장을 시도했습니다. 문자, 메신저로 붙여넣어 전송해주세요.",
        copyWithoutImageMessage: "선택한 즐겨찾기 후보 내용을 복사했습니다. 이미지는 저장하지 못했습니다.",
        kakaoInAppMessage:
          "카카오톡 인앱브라우저에서는 공유 창이 작동하지 않습니다.\n즐겨찾기 이미지를 갤러리로 다운로드합니다.\n공유하고자 하는 분에게 이미지를 직접 첨부해주세요.",
        kakaoInAppCopyOnlyMessage:
          "카카오톡 인앱브라우저에서는 공유 창이 작동하지 않습니다.\n즐겨찾기 이미지를 갤러리로 다운로드합니다.\n공유하고자 하는 분에게 이미지를 직접 첨부해주세요.",
      });
    } finally {
      setFavoriteShareExportCandidates([]);
    }
  }, [
    buildFavoriteCandidatesShareText,
    selectedFavoriteCandidates,
    shareDecisionResult,
    showFavoriteToast,
    waitForFavoriteExportPaint,
  ]);

  const removeFavoriteCandidate = useCallback((candidateId: string) => {
    commitFavoriteCandidates(favoriteCandidatesRef.current.filter((candidate) => candidate.id !== candidateId));
    setSelectedFavoriteCandidateIds((prev) => prev.filter((id) => id !== candidateId));
    showFavoriteToast("즐겨찾기 후보를 삭제했습니다.");
  }, [commitFavoriteCandidates, showFavoriteToast]);

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
    customerGuideEnabled &&
    !state.loading &&
    !state.expired &&
    !state.setupNeeded &&
    (isCustomerIntroStep || step === "space" || step === "apply" || step === "decision");


  const handleApplyTutorialStepChange = useCallback((tutorialStep: SimulatorAdminTutorialStep, _index: number, isOpen: boolean) => {
    if (!isOpen) return;

    const needsFilmSheet =
      tutorialStep.id === "customer-apply-sheet" ||
      tutorialStep.id === "customer-apply-pattern-filter" ||
      tutorialStep.id === "customer-apply-color-filter";

    if (needsFilmSheet) {
      const fallbackZoneKey = activeZoneKey || maskZones[0]?.key || "";
      if (!fallbackZoneKey) return;

      if (!isFilmSheetOpen || activeZoneKey !== fallbackZoneKey) {
        openFilmSheet(fallbackZoneKey);
      }
      return;
    }

    if (isFilmSheetOpen) {
      closeFilmSheet();
    }
  }, [activeZoneKey, closeFilmSheet, isFilmSheetOpen, maskZones, openFilmSheet]);

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

        {favoriteToastMessage ? (
          <div className="simulatorFavoriteToast" role="status" aria-live="polite">
            {favoriteToastMessage}
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
            onClick={openCustomerGuide}
            aria-label="사용설명 열기"
            data-sim-admin-guide="customer-intro-guide-toggle"
          >
            <Image
              src={guideOnImage}
              alt="가이드"
              width={120}
              height={120}
              className="guideToggleFloatingImage"
              priority={false}
            />
          </button>
        ) : null}

        <div className={isCustomerIntroStep && showGuideToggle ? "pageInner pageInnerCustomerIntroWithGuide" : "pageInner"}>
          {(state.loading && mode === "customer") || (step === "intro" && hasIntroStep) ? null : (
            <section
              className="heroCard"
              data-sim-admin-guide={step === "space" ? "customer-space-hero" : step === "apply" ? "customer-apply-hero" : step === "decision" ? "customer-decision-hero" : undefined}
            >
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
              onAddFavorite={saveFavoriteCandidate}
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
              favoriteCandidates={favoriteCandidates}
              selectedFavoriteCandidateIds={selectedFavoriteCandidateIds}
              colors={COLORS}
              onBackToApply={() => goStepWithUndo("apply")}
              onShareDecisionResult={() => void shareDecisionResult()}
              onApplyFavoriteCandidate={applyFavoriteCandidate}
              onRemoveFavoriteCandidate={removeFavoriteCandidate}
              onToggleFavoriteCandidateForShare={toggleFavoriteCandidateForShare}
              onShareFavoriteCandidates={() => void shareFavoriteCandidates()}
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
                  disabled={isDashboardMoving}
                  onClick={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    resetRapidBackExitPresses();

                    if (mode === "installer") {
                      setShowExitConfirm(false);
                      replaceToDashboard();
                      return;
                    }

                    allowNativeBackRef.current = true;

                    if (requestKakaoInAppBrowserClose()) {
                      window.setTimeout(() => {
                        allowNativeBackRef.current = false;
                      }, 1200);
                      return;
                    }

                    window.history.go(-(SIMULATOR_BACK_GUARD_TOP_LEVEL + 1));
                  }}
                >
                  종료하기
                </button>
              </div>
            </section>
          </div>
        ) : null}

        {decisionPopupMessage ? (
          <SimulatorKakaoShareNoticeModal
            message={decisionPopupMessage}
            onClose={closeDecisionPopupMessage}
          />
        ) : null}

        {showGuideStartPrompt ? (
          <SimulatorCustomerGuidePromptModal
            onStart={startCustomerGuideFromPrompt}
            onSkip={skipCustomerGuideFromPrompt}
          />
        ) : null}

        {currentGuide ? (
          currentGuide.stepLabel === "1단계 소개" ? (
            <SimulatorAdminTutorial
              storageKey={`customer-intro-${token || "default"}`}
              steps={CUSTOMER_INTRO_TUTORIAL_STEPS}
              autoOpen={false}
              controlledOpen
              onControlledClose={closeCustomerGuide}
              hideButton
              ariaLabel="고객용 시뮬레이터 안내"
              skipStorageMarkDone
            />
          ) : currentGuide.stepLabel === "2단계 공간 선택" ? (
            <SimulatorAdminTutorial
              storageKey={`customer-space-${token || "default"}`}
              steps={CUSTOMER_SPACE_TUTORIAL_STEPS}
              autoOpen={false}
              controlledOpen
              onControlledClose={closeCustomerGuide}
              hideButton
              ariaLabel="고객용 공간 선택 안내"
              skipStorageMarkDone
            />
          ) : currentGuide.stepLabel === "3단계 색상 적용" ? (
            <SimulatorAdminTutorial
              storageKey={`customer-apply-${token || "default"}`}
              steps={CUSTOMER_APPLY_TUTORIAL_STEPS}
              autoOpen={false}
              controlledOpen
              onControlledClose={closeCustomerGuide}
              hideButton
              ariaLabel="고객용 색상 적용 안내"
              skipStorageMarkDone
              onStepChange={handleApplyTutorialStepChange}
            />
          ) : currentGuide.stepLabel === "4단계 결정 확정" ? (
            <SimulatorAdminTutorial
              storageKey={`customer-decision-${token || "default"}`}
              steps={CUSTOMER_DECISION_TUTORIAL_STEPS}
              autoOpen={false}
              controlledOpen
              onControlledClose={closeCustomerGuide}
              hideButton
              ariaLabel="고객용 결정 확정 안내"
              skipStorageMarkDone
            />
          ) : (
            <SimulatorCustomerGuideModal
              guide={currentGuide}
              onClose={closeCustomerGuide}
            />
          )
        ) : null}

        {showGuideSkippedNotice ? (
          <SimulatorCustomerGuideNoticeModal onClose={closeGuideSkippedNotice} />
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
          favoriteCandidates={favoriteShareExportCandidates}
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

type SimulatorKakaoShareNoticeModalProps = {
  message: string;
  onClose: () => void;
};

function SimulatorKakaoShareNoticeModal({
  message,
  onClose,
}: SimulatorKakaoShareNoticeModalProps) {
  return (
    <div
      role="presentation"
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 400000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
        background: "rgba(8, 10, 18, 0.72)",
        backdropFilter: "blur(8px)",
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="simulator-kakao-share-notice-title"
        onClick={(event) => event.stopPropagation()}
        style={{
          width: "min(360px, 100%)",
          borderRadius: 28,
          padding: "28px 22px 22px",
          border: "1px solid rgba(238, 224, 197, 0.7)",
          background: "linear-gradient(180deg, rgba(255,255,255,0.98), rgba(248,242,230,0.98))",
          color: "#16120c",
          boxShadow: "0 28px 80px rgba(0,0,0,0.38)",
          textAlign: "center",
        }}
      >
        <div
          aria-hidden="true"
          style={{
            width: 58,
            height: 58,
            margin: "0 auto 14px",
            borderRadius: 999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "rgba(35, 30, 20, 0.08)",
            fontSize: 30,
          }}
        >
          📥
        </div>

        <h3
          id="simulator-kakao-share-notice-title"
          style={{
            margin: 0,
            fontSize: 21,
            fontWeight: 900,
            letterSpacing: "-0.04em",
          }}
        >
          공유 안내
        </h3>

        <p
          style={{
            margin: "14px 0 22px",
            whiteSpace: "pre-line",
            fontSize: 15,
            fontWeight: 700,
            lineHeight: 1.65,
            letterSpacing: "-0.04em",
          }}
        >
          {message}
        </p>

        <button
          type="button"
          onClick={onClose}
          style={{
            width: "100%",
            minHeight: 52,
            border: 0,
            borderRadius: 18,
            background: "#1f1a12",
            color: "#fff7e8",
            fontSize: 16,
            fontWeight: 900,
            letterSpacing: "-0.04em",
            boxShadow: "0 14px 30px rgba(31,26,18,0.22)",
          }}
        >
          알겠어요
        </button>
      </section>
    </div>
  );
}
