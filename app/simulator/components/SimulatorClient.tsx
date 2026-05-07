"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties } from "react";
import { useRouter } from "next/navigation";
import { toPng } from "html-to-image";
import type { ContractorProfile, SimulatorFilm, SimulatorLinkInfo, SimulatorSpace } from "../types";
import SimulatorIntroOverview from "./SimulatorIntroOverview";
import SimulatorClientStyles from "./SimulatorClientStyles";
import SimulatorSpaceStep from "./client/SimulatorSpaceStep";
import SimulatorApplyStep from "./client/SimulatorApplyStep";
import SimulatorDecisionStep from "./client/SimulatorDecisionStep";
import SimulatorBottomStepNav from "./client/SimulatorBottomStepNav";
import SimulatorCustomerGuideModal from "./client/SimulatorCustomerGuideModal";
import SimulatorFilmSheet from "./client/SimulatorFilmSheet";
import SimulatorDecisionExportCard from "./client/SimulatorDecisionExportCard";
import {
  PALETTE_COLOR_OPTIONS,
  KAKAO_SW_RESET_KEY,
  orderPaletteColors,
  formatDateTime,
  getFilmName,
  mergeFilmsById,
  filterFilmsLocally,
  buildLocalPaletteFacets,
  isFabricFilm,
  readMaskZones,
  readPreviewAspectRatio,
  isKakaoInAppBrowser,
  clearProblemBrowserCachesOnce,
  makeKakaoFetchInit,
  buildSimulatorApiUrl,
  readJsonResponse,
  normalizeFilmForKakao,
  normalizeSpaceForKakao,
  preloadImage,
  getPhoneHref,
  getKakaoHref,
} from "../lib/client-utils";

type SimulatorClientProps = {
  token?: string;
  mode: "installer" | "customer";
};

type BootstrapState = {
  loading: boolean;
  setupNeeded: boolean;
  expired: boolean;
  message: string;
  spaces: SimulatorSpace[];
  films: SimulatorFilm[];
  link: SimulatorLinkInfo | null;
  contractor: ContractorProfile | null;
};

type SimulatorStep = "intro" | "space" | "apply" | "decision";
type CustomerGuideStep = Extract<SimulatorStep, "intro" | "space" | "apply">;

const COLORS = {
  bg: "#05023B",
  panel: "rgba(12,10,72,0.72)",
  panelStrong: "rgba(10,8,72,0.94)",
  cream: "#EEE0C5",
  creamText: "#7A5A34",
  line: "rgba(238,224,197,0.16)",
  soft: "rgba(255,255,255,0.70)",
  white: "#FFFFFF",
};

const CUSTOMER_GUIDES: Record<
  CustomerGuideStep,
  { stepLabel: string; title: string; body: string[]; buttonLabel: string }
> = {
  intro: {
    stepLabel: "1단계 소개",
    title: "인테리어필름 시뮬레이터에 오신 걸 환영합니다.",
    body: [
      "원하는 공간에 필름을 미리 적용해볼 수 있어요.",
      "준비되셨다면 화면 가운데의 [시뮬레이션 시작] 버튼을 눌러주세요.",
    ],
    buttonLabel: "알겠어요",
  },
  space: {
    stepLabel: "2단계 공간 선택",
    title: "시뮬레이션할 공간을 선택해주세요.",
    body: [
      "원하는 공간 카드를 터치하면 그 공간에 인테리어 필름을 적용해볼 수 있습니다.",
    ],
    buttonLabel: "공간 선택하러 가기",
  },
  apply: {
    stepLabel: "3단계 색상 적용",
    title: "먼저 필름을 적용할 구역을 선택해주세요.",
    body: [
      "이미지 아래의 구역 버튼을 누르면 색상 목록이 열립니다.",
      "색상 팔레트에서 원하는 색을 고르면 비슷한 필름을 모아서 보여드려요.",
      "마음에 드는 색을 적용했다면 화면 하단의 [결정확정] 버튼을 눌러주세요.",
    ],
    buttonLabel: "색상 적용해보기",
  },
};

const CUSTOMER_GUIDE_STEPS: CustomerGuideStep[] = ["intro", "space", "apply"];
const CUSTOMER_GUIDE_STORAGE_PREFIX = "egose-simulator-customer-guide-v1";


export default function SimulatorClient({ token = "", mode }: SimulatorClientProps) {
  const router = useRouter();
  const filmSearchSeqRef = useRef(0);
  const filmSearchAbortRef = useRef<AbortController | null>(null);
  const initialSheetFilmsRef = useRef<SimulatorFilm[]>([]);
  const allKnownFilmsRef = useRef<SimulatorFilm[]>([]);
  const initialSheetRequestKeyRef = useRef("");
  const selectedPaletteMainRef = useRef("");
  const selectedPaletteSubRef = useRef("");
  const selectedPaletteColorsRef = useRef<string[]>([]);
  const decisionExportRef = useRef<HTMLDivElement | null>(null);

  const [state, setState] = useState<BootstrapState>({
    loading: true,
    setupNeeded: false,
    expired: false,
    message: "",
    spaces: [],
    films: [],
    link: null,
    contractor: null,
  });

  const [step, setStep] = useState<SimulatorStep>("space");
  const [selectedSpaceId, setSelectedSpaceId] = useState("");
  const [selectedFilm, setSelectedFilm] = useState<SimulatorFilm | null>(null);
  const [filmQuery, setFilmQuery] = useState("");
  const [filmLoading, setFilmLoading] = useState(false);
  const [filmError, setFilmError] = useState("");
  const [selectedPaletteMain, setSelectedPaletteMain] = useState("");
  const [selectedPaletteSub, setSelectedPaletteSub] = useState("");
  const [selectedPaletteColors, setSelectedPaletteColors] = useState<string[]>([]);
  const [paletteSubOptions, setPaletteSubOptions] = useState<string[]>([]);
  const [paletteColorOptions, setPaletteColorOptions] = useState<string[]>(PALETTE_COLOR_OPTIONS);

  const [activeZoneKey, setActiveZoneKey] = useState("");
  const [zoneFilmMap, setZoneFilmMap] = useState<Record<string, SimulatorFilm | null>>({});
  const [isFilmSheetOpen, setIsFilmSheetOpen] = useState(false);
  const [applyingFilmId, setApplyingFilmId] = useState<number | null>(null);
  const [previewSampleFilm, setPreviewSampleFilm] = useState<SimulatorFilm | null>(null);
  const [decisionMessage, setDecisionMessage] = useState("");
  const [isDecisionSharing, setIsDecisionSharing] = useState(false);
  const [isDashboardMoving, setIsDashboardMoving] = useState(false);
  const [activeGuideStep, setActiveGuideStep] = useState<CustomerGuideStep | null>(null);
  const [seenGuideSteps, setSeenGuideSteps] = useState<Partial<Record<CustomerGuideStep, boolean>>>({});
  const [guideReady, setGuideReady] = useState(false);

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
  const activeZoneFilm = activeZone ? zoneFilmMap[activeZone.key] || null : null;
  const hasIntroStep = mode === "customer" && Boolean(state.contractor);
  const customerGuideStorageKey = useMemo(() => {
    return `${CUSTOMER_GUIDE_STORAGE_PREFIX}:${token || "default"}`;
  }, [token]);

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


  const rememberFilms = (films: SimulatorFilm[]) => {
    if (films.length === 0) return;
    allKnownFilmsRef.current = mergeFilmsById(allKnownFilmsRef.current, films);
  };

  const getLocalFilmSource = (preferInitialSource = false) => {
    if (preferInitialSource && initialSheetFilmsRef.current.length > 0) {
      return initialSheetFilmsRef.current;
    }
    if (allKnownFilmsRef.current.length > 0) return allKnownFilmsRef.current;
    if (initialSheetFilmsRef.current.length > 0) return initialSheetFilmsRef.current;
    return state.films;
  };

  const applyLocalFilmFallback = (
    keyword: string,
    options: {
      paletteMain: string;
      paletteSub: string;
      paletteColors: string[];
      includeFacets: boolean;
      preferInitialSource?: boolean;
    }
  ) => {
    const sourceFilms = getLocalFilmSource(Boolean(options.preferInitialSource));

    if (sourceFilms.length === 0) return false;

    const nextFilms = filterFilmsLocally(sourceFilms, {
      keyword,
      paletteMain: options.paletteMain,
      paletteSub: options.paletteSub,
      paletteColors: options.paletteColors,
    });

    if (options.includeFacets) {
      const facetSourceFilms = getLocalFilmSource(false);
      updatePaletteFacets({
        facets: buildLocalPaletteFacets(
          facetSourceFilms.length > 0 ? facetSourceFilms : sourceFilms,
          options.paletteMain,
          options.paletteSub
        ),
      });
    }

    setState((prev) => ({ ...prev, films: nextFilms }));
    setFilmError(nextFilms.length === 0 ? "조건에 맞는 필름이 없습니다." : "");
    return true;
  };

  const updatePaletteFacetsFromLocalCorpus = (paletteMain = "", paletteSub = "") => {
    const sourceFilms = getLocalFilmSource(false);

    if (sourceFilms.length === 0) {
      setPaletteSubOptions([]);
      setPaletteColorOptions(PALETTE_COLOR_OPTIONS);
      return false;
    }

    updatePaletteFacets({
      facets: buildLocalPaletteFacets(sourceFilms, paletteMain, paletteSub),
    });
    return true;
  };

  const restoreInitialSheetFilms = () => {
    const initialFilms = initialSheetFilmsRef.current.length > 0
      ? initialSheetFilmsRef.current
      : state.films;

    setState((prev) => ({
      ...prev,
      films: initialFilms,
    }));

    setFilmError(initialFilms.length === 0 ? "조건에 맞는 필름이 없습니다." : "");
    updatePaletteFacetsFromLocalCorpus("", "");
    return initialFilms.length > 0;
  };

  const getTargetZoneKey = () => {
    return activeZoneKey || activeZone?.key || maskZones[0]?.key || "";
  };

  useEffect(() => {
    if (!isKakaoInAppBrowser()) return;

    try {
      const resetDone = window.sessionStorage.getItem(KAKAO_SW_RESET_KEY);
      if (resetDone === "1") return;

      window.sessionStorage.setItem(KAKAO_SW_RESET_KEY, "1");

      void clearProblemBrowserCachesOnce();

      void Promise.all([
        "serviceWorker" in navigator
          ? navigator.serviceWorker
              .getRegistrations()
              .then((registrations) =>
                Promise.all(registrations.map((registration) => registration.unregister()))
              )
          : Promise.resolve(),
        "caches" in window
          ? caches.keys().then((keys) => Promise.all(keys.map((key) => caches.delete(key))))
          : Promise.resolve(),
      ]);
    } catch {
      // 카카오톡 인앱브라우저에서 CacheStorage 접근이 막히는 경우는 무시합니다.
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setState((prev) => ({ ...prev, loading: true, message: "" }));

      try {
        await clearProblemBrowserCachesOnce();

        const params = new URLSearchParams();
        if (token) params.set("token", token);
        const res = await fetch(
          buildSimulatorApiUrl("/api/simulator/bootstrap", params),
          makeKakaoFetchInit()
        );
        const json = await readJsonResponse(res);

        if (cancelled) return;

        const nextSpaces = Array.isArray(json.spaces)
          ? json.spaces.map((space: SimulatorSpace) => normalizeSpaceForKakao(space))
          : [];
        const nextFilms = Array.isArray(json.films)
          ? json.films.map((film: SimulatorFilm) => normalizeFilmForKakao(film))
          : [];
        const nextSearchFilms = Array.isArray(json.search_films)
          ? json.search_films.map((film: SimulatorFilm) => normalizeFilmForKakao(film))
          : [];

        setState({
          loading: false,
          setupNeeded: Boolean(json.setupNeeded),
          expired: Boolean(json.expired),
          message: json.message || "",
          spaces: nextSpaces,
          films: nextFilms,
          link: json.link || null,
          contractor: json.contractor || null,
        });

        if (nextSpaces[0]?.id) {
          setSelectedSpaceId(nextSpaces[0].id);
        }

        if (mode === "customer" && json.contractor) {
          setStep("intro");
        } else {
          setStep("space");
        }

        if (nextFilms.length > 0) {
          initialSheetFilmsRef.current = nextFilms;
          rememberFilms(nextFilms);
        }

        if (nextSearchFilms.length > 0) {
          rememberFilms(nextSearchFilms);
        }

        if (nextFilms[0]) {
          setSelectedFilm(nextFilms[0]);
        }
      } catch {
        if (cancelled) return;

        setState({
          loading: false,
          setupNeeded: false,
          expired: false,
          message: "시뮬레이터 정보를 불러오지 못했습니다.",
          spaces: [],
          films: [],
          link: null,
          contractor: null,
        });
      }
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, [mode, token]);

  useEffect(() => {
    if (mode !== "customer") {
      setSeenGuideSteps({});
      setActiveGuideStep(null);
      setGuideReady(true);
      return;
    }

    setGuideReady(false);

    try {
      const raw = window.localStorage.getItem(customerGuideStorageKey);
      const parsed = raw ? (JSON.parse(raw) as Partial<Record<CustomerGuideStep, boolean>>) : {};
      const nextSeen: Partial<Record<CustomerGuideStep, boolean>> = {};

      CUSTOMER_GUIDE_STEPS.forEach((guideStep) => {
        if (parsed?.[guideStep]) {
          nextSeen[guideStep] = true;
        }
      });

      setSeenGuideSteps(nextSeen);
    } catch {
      setSeenGuideSteps({});
    } finally {
      setActiveGuideStep(null);
      setGuideReady(true);
    }
  }, [customerGuideStorageKey, mode]);

  useEffect(() => {
    if (
      mode !== "customer" ||
      !guideReady ||
      state.loading ||
      state.expired ||
      state.setupNeeded
    ) {
      return;
    }

    if (isFilmSheetOpen) {
      return;
    }

    if (step !== "intro" && step !== "space" && step !== "apply") {
      setActiveGuideStep(null);
      return;
    }

    if (step === "intro" && !hasIntroStep) {
      setActiveGuideStep(null);
      return;
    }

    const nextGuideStep = step as CustomerGuideStep;

    if (seenGuideSteps[nextGuideStep]) {
      if (activeGuideStep === nextGuideStep) {
        setActiveGuideStep(null);
      }
      return;
    }

    if (activeGuideStep !== nextGuideStep) {
      setActiveGuideStep(nextGuideStep);
    }
  }, [
    activeGuideStep,
    guideReady,
    hasIntroStep,
    isFilmSheetOpen,
    mode,
    seenGuideSteps,
    state.expired,
    state.loading,
    state.setupNeeded,
    step,
  ]);

  useEffect(() => {
    if (mode !== "installer") return;

    router.prefetch("/dashboard");
    const idle = window.setTimeout(() => {
      router.prefetch("/dashboard");
    }, 250);

    return () => {
      window.clearTimeout(idle);
    };
  }, [mode, router]);

  useEffect(() => {
    if (maskZones.length === 0) return;

    if (!activeZoneKey || !maskZones.some((zone) => zone.key === activeZoneKey)) {
      setActiveZoneKey(maskZones[0].key);
    }
  }, [maskZones, activeZoneKey]);


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
    setFilmQuery("");
    setFilmError("");
    setSelectedPaletteMain("");
    setSelectedPaletteSub("");
    setSelectedPaletteColors([]);
    selectedPaletteMainRef.current = "";
    selectedPaletteSubRef.current = "";
    selectedPaletteColorsRef.current = [];

    const cachedInitialFilms = initialSheetFilmsRef.current;
    const fallbackFilms = cachedInitialFilms.length > 0 ? cachedInitialFilms : state.films;
    setState((prev) => ({
      ...prev,
      films: fallbackFilms,
    }));
    updatePaletteFacetsFromLocalCorpus("", "");

    setPreviewSampleFilm(null);
    setIsFilmSheetOpen(true);

    // 카카오톡/삼성/웨일 계열은 필름 선택창을 열자마자 API를 다시 부르면
    // 추천 필름 목록과 팔레트가 브라우저 캐시/응답 순서에 따라 바뀌는 경우가 있습니다.
    // 처음 목록은 bootstrap에서 받은 지정 필름을 그대로 쓰고,
    // 검색/팔레트는 bootstrap의 search_films 말뭉치로 로컬 처리합니다.
    if (isKakaoInAppBrowser()) {
      setFilmLoading(false);
      return;
    }

    if (!filmLoading) {
      void searchFilms("", {
        paletteMain: "",
        paletteSub: "",
        paletteColors: [],
        includeFacets: true,
        recommended: !isRestrictedCustomerLink,
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

  const updatePaletteFacets = (json: any) => {
    const nextSubs = Array.isArray(json?.facets?.palette_subs)
      ? json.facets.palette_subs.filter(Boolean)
      : [];
    const nextColors = Array.isArray(json?.facets?.palette_colors)
      ? json.facets.palette_colors.filter(Boolean)
      : [];

    setPaletteSubOptions(nextSubs);
    setPaletteColorOptions(
      nextColors.length > 0 ? orderPaletteColors(nextColors) : PALETTE_COLOR_OPTIONS
    );
  };

  const searchFilms = async (
    keyword = filmQuery,
    overrides: {
      paletteMain?: string;
      paletteSub?: string;
      paletteColors?: string[];
      includeFacets?: boolean;
      recommended?: boolean;
    } = {}
  ) => {
    const q = keyword.trim();
    const nextPaletteMain =
      overrides.paletteMain !== undefined ? overrides.paletteMain : selectedPaletteMainRef.current;
    const nextPaletteSub =
      overrides.paletteSub !== undefined ? overrides.paletteSub : selectedPaletteSubRef.current;
    const nextPaletteColors =
      overrides.paletteColors !== undefined ? overrides.paletteColors : selectedPaletteColorsRef.current;
    const includeFacets = overrides.includeFacets !== false;
    const useRecommended = overrides.recommended === true;
    const isInitialSheetRequest =
      q.length === 0 &&
      !nextPaletteMain &&
      !nextPaletteSub &&
      nextPaletteColors.length === 0;
    const requestSeq = filmSearchSeqRef.current + 1;

    filmSearchSeqRef.current = requestSeq;
    filmSearchAbortRef.current?.abort();

    const controller = new AbortController();
    filmSearchAbortRef.current = controller;

    setFilmLoading(true);
    setFilmError("");

    if (isKakaoInAppBrowser() && getLocalFilmSource(false).length > 0) {
      if (isInitialSheetRequest) {
        restoreInitialSheetFilms();
      } else {
        applyLocalFilmFallback(q, {
          paletteMain: nextPaletteMain,
          paletteSub: nextPaletteSub,
          paletteColors: nextPaletteColors,
          includeFacets,
          preferInitialSource: false,
        });
      }

      setFilmLoading(false);
      return;
    }

    try {
      await clearProblemBrowserCachesOnce();

      const params = new URLSearchParams();
      if (q) params.set("q", q);
      if (token) params.set("token", token);
      if (useRecommended) params.set("recommended", "1");
      if (nextPaletteMain) params.set("palette_main", nextPaletteMain);
      if (nextPaletteSub) params.set("palette_sub", nextPaletteSub);
      if (!includeFacets) params.set("skip_facets", "1");
      nextPaletteColors.forEach((color) => params.append("palette_color", color));

      const res = await fetch(
        buildSimulatorApiUrl("/api/simulator/films", params),
        makeKakaoFetchInit({ signal: controller.signal })
      );

      const json = await readJsonResponse(res);

      if (requestSeq !== filmSearchSeqRef.current) {
        return;
      }

      if (!res.ok) {
        const recovered = applyLocalFilmFallback(q, {
          paletteMain: nextPaletteMain,
          paletteSub: nextPaletteSub,
          paletteColors: nextPaletteColors,
          includeFacets,
          preferInitialSource: isInitialSheetRequest && useRecommended,
        });

        if (!recovered) {
          setFilmError(json.error || "필름 검색 중 오류가 발생했습니다.");
        }

        return;
      }

      const nextFilms = Array.isArray(json.items)
        ? json.items.map((film: SimulatorFilm) => normalizeFilmForKakao(film))
        : [];

      if (nextFilms.length === 0 && (q || nextPaletteMain || nextPaletteSub || nextPaletteColors.length > 0)) {
        const recovered = applyLocalFilmFallback(q, {
          paletteMain: nextPaletteMain,
          paletteSub: nextPaletteSub,
          paletteColors: nextPaletteColors,
          includeFacets,
          preferInitialSource: isInitialSheetRequest && useRecommended,
        });

        if (recovered) return;
      }

      if (json.facets) {
        updatePaletteFacets(json);
      }
      if (nextFilms.length > 0) {
        rememberFilms(nextFilms);
      }
      if (isInitialSheetRequest && useRecommended && nextFilms.length > 0) {
        initialSheetFilmsRef.current = nextFilms;
      }

      setState((prev) => ({ ...prev, films: nextFilms }));
    } catch (error: any) {
      if (error?.name === "AbortError") {
        return;
      }

      if (requestSeq !== filmSearchSeqRef.current) {
        return;
      }

      const recovered = applyLocalFilmFallback(q, {
        paletteMain: nextPaletteMain,
        paletteSub: nextPaletteSub,
        paletteColors: nextPaletteColors,
        includeFacets,
        preferInitialSource: isInitialSheetRequest && useRecommended,
      });

      if (!recovered) {
        setFilmError("필름 검색 중 오류가 발생했습니다.");
      }
    } finally {
      if (requestSeq === filmSearchSeqRef.current) {
        setFilmLoading(false);
      }
    }
  };

  useEffect(() => {
    if (state.loading || step !== "apply") return;

    const isRestrictedCustomerLink =
      mode === "customer" &&
      Boolean(token) &&
      state.link?.film_scope !== "all";

    const requestKey = [
      mode,
      token || "installer",
      state.link?.film_scope || "all",
      state.link?.token || "",
    ].join(":");

    if (initialSheetRequestKeyRef.current === requestKey) return;

    initialSheetRequestKeyRef.current = requestKey;

    if (isKakaoInAppBrowser()) {
      restoreInitialSheetFilms();
      return;
    }

    void searchFilms("", {
      paletteMain: "",
      paletteSub: "",
      paletteColors: [],
      includeFacets: true,
      recommended: !isRestrictedCustomerLink,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, state.loading, mode, token, state.link?.film_scope, state.link?.token]);

  const handlePaletteMainClick = (value: string) => {
    const nextMain = selectedPaletteMainRef.current === value ? "" : value;

    selectedPaletteMainRef.current = nextMain;
    selectedPaletteSubRef.current = "";
    selectedPaletteColorsRef.current = [];

    setSelectedPaletteMain(nextMain);
    setSelectedPaletteSub("");
    setSelectedPaletteColors([]);
    setFilmQuery("");

    void searchFilms("", {
      paletteMain: nextMain,
      paletteSub: "",
      paletteColors: [],
      includeFacets: true,
    });
  };

  const handlePaletteSubClick = (value: string) => {
    const nextSub = selectedPaletteSubRef.current === value ? "" : value;

    selectedPaletteSubRef.current = nextSub;
    selectedPaletteColorsRef.current = [];

    setSelectedPaletteSub(nextSub);
    setSelectedPaletteColors([]);
    setFilmQuery("");

    void searchFilms("", {
      paletteMain: selectedPaletteMainRef.current,
      paletteSub: nextSub,
      paletteColors: [],
      includeFacets: true,
    });
  };

  const handlePaletteColorClick = (value: string) => {
    const currentColors = selectedPaletteColorsRef.current;
    const nextColors = currentColors.includes(value)
      ? currentColors.filter((color) => color !== value)
      : [...currentColors, value];

    selectedPaletteColorsRef.current = nextColors;

    setSelectedPaletteColors(nextColors);
    setFilmQuery("");

    void searchFilms("", {
      paletteMain: selectedPaletteMainRef.current,
      paletteSub: selectedPaletteSubRef.current,
      paletteColors: nextColors,
      includeFacets: false,
    });
  };

  const resetPaletteFilters = () => {
    selectedPaletteMainRef.current = "";
    selectedPaletteSubRef.current = "";
    selectedPaletteColorsRef.current = [];

    setSelectedPaletteMain("");
    setSelectedPaletteSub("");
    setSelectedPaletteColors([]);
    setFilmQuery("");
    setPaletteSubOptions([]);
    setPaletteColorOptions(PALETTE_COLOR_OPTIONS);

    void searchFilms("", {
      paletteMain: "",
      paletteSub: "",
      paletteColors: [],
      includeFacets: true,
    });
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

  const buildDecisionText = () => {
    const lines = [
      "필름 시뮬레이션 결정 결과",
      selectedSpace ? `공간: ${selectedSpace.name}` : "",
      state.link?.installer_name ? `시공자: ${state.link.installer_name}` : "",
      "",
      ...maskZones.map((zone) => {
        const film = zoneFilmMap[zone.key];
        return `${zone.label}: ${film ? getFilmName(film) : "미선택"}`;
      }),
    ].filter(Boolean);

    if (hasFabricWarning) {
      lines.push(
        "",
        '선택된 필름에 패브릭필름이 있습니다. 시뮬레이션상 불가피하게 왜곡이 심한 종류이므로 주의 부탁드립니다.',
      );
    }

    return lines.join("\n");
  };

  const downloadDataUrl = (dataUrl: string, fileName: string) => {
    const link = document.createElement("a");
    link.href = dataUrl;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const createDecisionResultImage = async () => {
    if (!decisionExportRef.current) {
      throw new Error("이미지로 저장할 영역을 찾을 수 없습니다.");
    }

    return toPng(decisionExportRef.current, {
      cacheBust: true,
      pixelRatio: 2,
      backgroundColor: COLORS.bg,
    });
  };

  const shareDecisionResult = async () => {
    const text = buildDecisionText();
    const fileName = `simulation-result-${new Date().toISOString().slice(0, 10)}.png`;

    setDecisionMessage("");
    setIsDecisionSharing(true);

    try {
      const dataUrl = await createDecisionResultImage();

      try {
        const response = await fetch(dataUrl);
        const blob = await response.blob();
        const file = new File([blob], fileName, { type: "image/png" });

        if (
          typeof navigator !== "undefined" &&
          "share" in navigator &&
          typeof navigator.canShare === "function" &&
          navigator.canShare({ files: [file] })
        ) {
          await navigator.share({
            files: [file],
            title: "필름 시뮬레이션 결정 결과",
            text,
          });
          setDecisionMessage("결정 결과 이미지와 내용을 전송했습니다.");
          return;
        }
      } catch {
        // 파일 공유가 되지 않으면 아래 텍스트 공유/복사 흐름으로 진행합니다.
      }

      if (navigator.share) {
        await navigator.share({
          title: "필름 시뮬레이션 결정 결과",
          text,
        });
        downloadDataUrl(dataUrl, fileName);
        setDecisionMessage("결정 결과 문구를 전송했고, 이미지는 파일로 저장했습니다.");
        return;
      }

      await navigator.clipboard.writeText(text);
      downloadDataUrl(dataUrl, fileName);
      setDecisionMessage("결정 결과를 복사했고, 이미지는 파일로 저장했습니다. 문자, 메신저로 붙여넣어 전송해주세요.");
    } catch {
      try {
        await navigator.clipboard.writeText(text);
        setDecisionMessage("결정 결과를 복사했습니다. 이미지는 저장하지 못했습니다. 문자, 메신저로 붙여넣어 전송해주세요.");
      } catch {
        setDecisionMessage("전송에 실패했습니다. 화면의 결과를 캡쳐해서 보내주세요.");
      }
    } finally {
      setIsDecisionSharing(false);
    }
  };

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

  const closeCustomerGuide = () => {
    if (!activeGuideStep) return;

    const guideStep = activeGuideStep;

    setSeenGuideSteps((prev) => {
      const nextSeen = { ...prev, [guideStep]: true };

      try {
        window.localStorage.setItem(customerGuideStorageKey, JSON.stringify(nextSeen));
      } catch {
        // localStorage를 사용할 수 없는 브라우저여도 화면 동작은 유지합니다.
      }

      return nextSeen;
    });

    setActiveGuideStep(null);
  };

  const mainTitle = mode === "customer" ? "필름 시뮬레이터" : "시뮬레이터";
  const contractorName = state.contractor?.display_name || state.link?.installer_name || "시공자";
  const contractorPhotos = state.contractor?.portfolio_photos || [];
  const phoneHref = getPhoneHref(state.contractor?.phone);
  const kakaoHref = getKakaoHref(state.contractor?.kakao_url);
  const currentGuide = activeGuideStep ? CUSTOMER_GUIDES[activeGuideStep] : null;

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
        ? "이미지 아래에 구역 버튼을 눌러 필름을 적용하세요."
        : "선택한 결과를 확인하고 필요한 방법으로 문의해주세요.";

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

        <div className="pageInner">
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
