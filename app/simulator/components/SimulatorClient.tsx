"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties } from "react";
import { useRouter } from "next/navigation";
import { toPng } from "html-to-image";
import type { ContractorProfile, SimulatorFilm, SimulatorLinkInfo, SimulatorSpace } from "../types";
import SimulatorIntroOverview from "./SimulatorIntroOverview";
import SimulatorClientStyles from "./SimulatorClientStyles";
import {
  PALETTE_MAIN_OPTIONS,
  PALETTE_COLOR_OPTIONS,
  PALETTE_COLOR_SWATCH,
  KAKAO_SW_RESET_KEY,
  orderPaletteColors,
  formatDateTime,
  getFilmName,
  getFilmCode,
  mergeFilmsById,
  filterFilmsLocally,
  buildLocalPaletteFacets,
  isFabricFilm,
  readMaskZones,
  readPreviewAspectRatio,
  getSpaceThumbnail,
  isKakaoInAppBrowser,
  clearProblemBrowserCachesOnce,
  makeKakaoFetchInit,
  buildSimulatorApiUrl,
  readJsonResponse,
  normalizeFilmForKakao,
  normalizeSpaceForKakao,
  preloadImage,
  getFilmThumbUrl,
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
            <section className="spaceSelectCard">
              <div className="sectionHeader">
                <div>
                  <div className="sectionLabel">공간 선택</div>
                  <h2 className="sectionTitle">어디에 필름을 적용해볼까요?</h2>
                </div>
                <div className="spaceCount">{state.spaces.length || 0}개 공간</div>
              </div>

              <div className="spaceGrid">
                {state.spaces.length > 0 ? (
                  state.spaces.map((space) => {
                    const thumbnail = getSpaceThumbnail(space);
                    const active = selectedSpace?.id === space.id;
                    const thumbZones = readMaskZones(space);
                    const thumbAspectRatio = readPreviewAspectRatio(space);
                    const hasSceneThumb = Boolean(space.base_image_url || space.overlay_image_url);

                    return (
                      <button
                        key={space.id}
                        type="button"
                        onClick={() => selectSpaceAndGoApply(space.id)}
                        className={`spaceCard ${active ? "spaceCardActive" : ""}`}
                      >
                        <div className="spaceThumb" style={{ aspectRatio: thumbAspectRatio }}>
                          {hasSceneThumb ? (
                            <div className="spaceThumbStage">
                              {thumbZones.map((zone) => (
                                <div
                                  key={zone.key}
                                  aria-hidden="true"
                                  className="spaceThumbCheckerLayer"
                                  style={{
                                    WebkitMaskImage: `url("${zone.mask_url}")`,
                                    maskImage: `url("${zone.mask_url}")`,
                                  }}
                                />
                              ))}

                              {space.base_image_url ? (
                                <img src={space.base_image_url} alt="공간 원본" className="spaceThumbBaseImage" />
                              ) : null}

                              {space.overlay_image_url ? (
                                <img src={space.overlay_image_url} alt={space.name} className="spaceThumbOverlayImage" />
                              ) : null}
                            </div>
                          ) : thumbnail ? (
                            <img src={thumbnail} alt={space.name} />
                          ) : (
                            <div className="spaceThumbEmpty">이미지 준비중</div>
                          )}
                        </div>

                        <div className="spaceInfo">
                          <div>
                            <div className="spaceName">{space.name}</div>
                            <div className="spaceDesc">{space.description || "선택하면 색상 적용 화면으로 이동합니다."}</div>
                          </div>

                          <span className="spaceGoBadge">선택</span>
                        </div>
                      </button>
                    );
                  })
                ) : (
                  <div className="emptyFilmBox">등록된 공간이 없습니다.</div>
                )}
              </div>
            </section>
          ) : step === "apply" ? (
            <section className="applyCard">
              <div className="applyTopRow">
                <div>
                  <div className="sectionLabel">색상 적용</div>
                  <h2 className="spaceTitle">{selectedSpace?.name || "공간 없음"}</h2>
                </div>

                <button type="button" onClick={() => setStep("space")} className="changeSpaceButton">
                  공간 변경
                </button>
              </div>

              <div
                className="previewViewport"
                style={{
                  aspectRatio: previewAspectRatio,
                }}
              >
                {previewHasRealSpace ? (
                  <div className="sceneStage">
                    {maskZones.map((zone) => {
                      const film = zoneFilmMap[zone.key];

                      if (film?.image_url) {
                        return (
                          <div
                            key={zone.key}
                            aria-hidden="true"
                            className="maskedFilmLayer"
                            style={{
                              backgroundImage: `url("${film.image_url}")`,
                              backgroundSize: `${zone.patternSize || 220}px auto`,
                              WebkitMaskImage: `url("${zone.mask_url}")`,
                              maskImage: `url("${zone.mask_url}")`,
                            }}
                          />
                        );
                      }

                      return (
                        <div
                          key={zone.key}
                          aria-hidden="true"
                          className="maskedTransparencyLayer"
                          style={{
                            WebkitMaskImage: `url("${zone.mask_url}")`,
                            maskImage: `url("${zone.mask_url}")`,
                          }}
                        />
                      );
                    })}

                    {selectedSpace?.base_image_url ? (
                      <img src={selectedSpace.base_image_url} alt="공간 원본" className="sceneBaseImage" />
                    ) : null}

                    {selectedSpace?.overlay_image_url ? (
                      <img src={selectedSpace.overlay_image_url} alt="공간 오버레이" className="sceneOverlayImage" />
                    ) : null}
                  </div>
                ) : (
                  <div className="emptyPreviewWrap">
                    <div className="emptyPreviewBox">
                      <div className="emptyPreviewInner">
                        <div style={{ color: COLORS.cream, fontWeight: 900, marginBottom: 6 }}>
                          공간 이미지 등록 전 테스트 화면
                        </div>
                        <div style={{ color: COLORS.soft, fontSize: 14, lineHeight: 1.6 }}>
                          실제 공간 PNG와 구역별 마스크 PNG가 준비되면 이 영역에 적용됩니다.
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="zoneApplyGrid">
                {maskZones.map((zone) => {
                  const active = activeZoneKey === zone.key;
                  const film = zoneFilmMap[zone.key] || null;

                  return (
                    <button
                      key={zone.key}
                      type="button"
                      onClick={() => openFilmSheet(zone.key)}
                      className={`zoneApplyButton ${active ? "zoneApplyButtonActive" : ""}`}
                    >
                      <span>{zone.label}</span>
                      <strong className={!film ? "zoneFilmPrompt" : undefined}>
                        {film ? getFilmName(film) : "이곳을 눌러 필름선택"}
                      </strong>
                    </button>
                  );
                })}
              </div>

              <div className="applyActionRow">
                {selectedFilm ? (
                  <button type="button" onClick={() => applyFilmToAllZones(selectedFilm)} className="smallActionButton">
                    선택 필름 전체 적용
                  </button>
                ) : null}

                {activeZone && zoneFilmMap[activeZone.key] ? (
                  <button type="button" onClick={() => clearZoneFilm(activeZone.key)} className="smallActionButton">
                    현재 구역 지우기
                  </button>
                ) : null}

                {Object.keys(zoneFilmMap).length > 0 ? (
                  <button type="button" onClick={clearAllZones} className="smallActionButton">
                    전체 초기화
                  </button>
                ) : null}
              </div>

              <p className="applyWarningText">
                *실물 필름과는 차이가있습니다. 유의해주세요.*
              </p>

              <div className="applyDecisionRow">
                <button
                  type="button"
                  onClick={goDecisionStep}
                  className="decisionNextButton"
                  disabled={!maskZones.some((zone) => Boolean(zoneFilmMap[zone.key]))}
                >
                  결정확정으로 넘어가기
                </button>
              </div>
            </section>
          ) : (
            <section className="decisionCard">
              <div className="applyTopRow">
                <div>
                  <div className="sectionLabel">결정 확정</div>
                  <h2 className="spaceTitle">선택 결과 확인</h2>
                </div>

                <button type="button" onClick={() => setStep("apply")} className="changeSpaceButton">
                  색상 다시 선택
                </button>
              </div>

              <div className="decisionSummary">
                <div className="decisionSpaceName">{selectedSpace?.name || "공간 없음"}</div>

                <div className="decisionZoneList">
                  {maskZones.map((zone) => {
                    const film = zoneFilmMap[zone.key] || null;

                    return (
                      <div key={zone.key} className="decisionZoneItem">
                        <span>{zone.label}</span>
                        <strong>{film ? getFilmName(film) : "미선택"}</strong>
                      </div>
                    );
                  })}
                </div>

                {hasFabricWarning ? (
                  <div className="decisionFabricWarning">
                    선택된 필름에 패브릭필름이 있습니다. 시뮬레이션상 불가피하게 왜곡이 심한 종류이므로 주의 부탁드립니다.
                  </div>
                ) : null}
              </div>

              <div className="decisionActionGrid">
                <section className="decisionActionCard">
                  <div className="decisionActionIcon">1</div>
                  <h3>결정 결과 전송</h3>
                  <p>
                    선택한 구역별 필름 결과를 보낼 수 있습니다. 휴대폰에서는 공유창이 열리고, 지원하지 않는 경우 결과가 복사됩니다.
                  </p>
                  <button
                    type="button"
                    onClick={() => void shareDecisionResult()}
                    className="primaryDecisionButton"
                    disabled={isDecisionSharing}
                  >
                    {isDecisionSharing ? "전송 준비 중..." : "시뮬레이션 결과 전송"}
                  </button>
                  {decisionMessage ? <div className="decisionMessage">{decisionMessage}</div> : null}
                </section>

                <section className="decisionActionCard">
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

                <section className="decisionActionCard">
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
          )}
        </div>

        {!state.loading ? (
        <nav className={`bottomStepNav ${hasIntroStep ? "bottomStepNavFour" : ""}`} aria-label="시뮬레이터 단계 이동">
          {hasIntroStep ? (
            <button
              type="button"
              onClick={() => setStep("intro")}
              className={step === "intro" ? "bottomStepButtonActive" : ""}
            >
              <span>1</span>
              소개
            </button>
          ) : null}

          <button
            type="button"
            onClick={() => setStep("space")}
            className={step === "space" ? "bottomStepButtonActive" : ""}
          >
            <span>{hasIntroStep ? 2 : 1}</span>
            공간선택
          </button>

          <button
            type="button"
            onClick={goApplyStep}
            className={step === "apply" ? "bottomStepButtonActive" : ""}
          >
            <span>{hasIntroStep ? 3 : 2}</span>
            색상적용
          </button>

          <button
            type="button"
            onClick={() => setStep("decision")}
            className={step === "decision" ? "bottomStepButtonActive" : ""}
          >
            <span>{hasIntroStep ? 4 : 3}</span>
            결정확정
          </button>
        </nav>
        ) : null}

        {currentGuide ? (
          <div className="customerGuideOverlay" role="presentation" onClick={closeCustomerGuide}>
            <section
              className="customerGuideModal"
              role="dialog"
              aria-modal="true"
              aria-labelledby="customer-guide-title"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="customerGuideTopRow">
                <div className="customerGuideBadge">고객 사용 가이드 · {currentGuide.stepLabel}</div>
                <button
                  type="button"
                  onClick={closeCustomerGuide}
                  className="customerGuideClose"
                  aria-label="가이드 닫기"
                >
                  ×
                </button>
              </div>

              <h3 id="customer-guide-title" className="customerGuideTitle">
                {currentGuide.title}
              </h3>

              <div className="customerGuideBody">
                {currentGuide.body.map((line) => (
                  <p key={line}>{line}</p>
                ))}
              </div>

              <button type="button" onClick={closeCustomerGuide} className="customerGuidePrimaryButton">
                {currentGuide.buttonLabel}
              </button>
            </section>
          </div>
        ) : null}

        {isFilmSheetOpen ? (
          <div className="sheetOverlay" role="presentation" onClick={closeFilmSheet}>
            <section
              className="filmSheet"
              role="dialog"
              aria-modal="true"
              aria-label="필름 선택"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="sheetHandle" />

              <div className="sheetHeader">
                <div>
                  <div className="sectionLabel">필름 선택</div>
                  <h3>{activeZone?.label || "구역"}에 적용할 필름</h3>
                  <p>팔레트로 고르거나 제품번호/색상명으로 검색할 수 있습니다.</p>
                </div>

                <button type="button" onClick={closeFilmSheet} className="sheetCloseButton">
                  닫기
                </button>
              </div>

              <div className="palettePanel">
                <div className="paletteGroup">
                  <div className="paletteHeaderRow">
                    <span>1차 분류</span>
                    {(selectedPaletteMain || selectedPaletteSub || selectedPaletteColors.length > 0) ? (
                      <button type="button" onClick={resetPaletteFilters} className="paletteResetButton">
                        초기화
                      </button>
                    ) : null}
                  </div>

                  <div className="paletteChipRow">
                    {PALETTE_MAIN_OPTIONS.map((item) => (
                      <button
                        key={item}
                        type="button"
                        onClick={() => handlePaletteMainClick(item)}
                        className={`paletteChip ${selectedPaletteMain === item ? "paletteChipActive" : ""}`}
                      >
                        {item}
                      </button>
                    ))}
                  </div>
                </div>

                {selectedPaletteMain ? (
                  <div className="paletteGroup">
                    <div className="paletteHeaderRow">
                      <span>2차 분류</span>
                      <em>선택사항</em>
                    </div>

                    <div className="paletteChipRow">
                      <button
                        type="button"
                        onClick={() => handlePaletteSubClick("")}
                        className={`paletteChip ${!selectedPaletteSub ? "paletteChipActive" : ""}`}
                      >
                        전체
                      </button>

                      {paletteSubOptions.map((item) => (
                        <button
                          key={item}
                          type="button"
                          onClick={() => handlePaletteSubClick(item)}
                          className={`paletteChip ${selectedPaletteSub === item ? "paletteChipActive" : ""}`}
                        >
                          {item}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : null}

                <div className="paletteGroup">
                  <div className="paletteHeaderRow">
                    <span>색상 팔레트</span>
                    <em>
                      {selectedPaletteColors.length > 0
                        ? selectedPaletteColors.join(", ")
                        : "전체"}
                    </em>
                  </div>

                  <div className="paletteColorRow">
                    {paletteColorOptions.map((item) => {
                      const isColorSelected = selectedPaletteColors.includes(item);

                      return (
                        <button
                          key={item}
                          type="button"
                          onClick={() => handlePaletteColorClick(item)}
                          className={`paletteColorChip paletteColorChipIconOnly ${isColorSelected ? "paletteColorChipActive" : ""}`}
                          aria-label={`${item}${isColorSelected ? " 선택됨" : ""}`}
                          aria-pressed={isColorSelected}
                          title={item}
                        >
                          <i
                            aria-hidden="true"
                            style={{ background: PALETTE_COLOR_SWATCH[item] || "#DDD" }}
                          />
                          {isColorSelected ? (
                            <span className="paletteColorCheck" aria-hidden="true">
                              ✓
                            </span>
                          ) : null}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              <form
                onSubmit={(event) => {
                  event.preventDefault();
                  void searchFilms(filmQuery, { includeFacets: false });
                }}
                className="sheetSearchForm"
              >
                <input
                  value={filmQuery}
                  onChange={(event) => setFilmQuery(event.target.value)}
                  placeholder="예: 122, SG122, 화이트"
                  className="searchInput"
                />

                <button type="submit" className="searchButton">
                  검색
                </button>
              </form>

              {filmLoading && state.films.length > 0 ? (
                <div className="sheetLoadingText">필름 목록 업데이트 중...</div>
              ) : null}

              {filmError ? (
                <div style={{ color: "#ffd6d6", fontSize: 14, marginBottom: 10 }}>{filmError}</div>
              ) : null}

              <div className="sheetFilmGrid">
                {state.films.length > 0 ? (
                  state.films.map((film) => {
                    const active = selectedFilm?.id === film.id;

                    return (
                      <div
                        key={film.id}
                        className={`sheetFilmItem ${active ? "sheetFilmItemActive" : ""}`}
                      >
                        <button
                          type="button"
                          onClick={() => void handleFilmClick(film)}
                          disabled={applyingFilmId !== null}
                          className="sheetFilmSelectButton"
                        >
                          <div className="sheetFilmThumb">
                            {getFilmThumbUrl(film) ? (
                              <img
                                src={getFilmThumbUrl(film)}
                                alt={getFilmName(film)}
                                loading="lazy"
                                decoding="async"
                              />
                            ) : null}
                          </div>

                          <div className="sheetFilmName">{getFilmName(film)}</div>
                        </button>

                        <div className="sheetFilmActionRow">
                          <button
                            type="button"
                            onClick={() => toggleSamplePreview(film)}
                            className={`sheetFilmSampleButton ${previewSampleFilm?.id === film.id ? "sheetFilmSampleButtonActive" : ""}`}
                            disabled={!film.sample_url}
                          >
                            {film.sample_url ? "샘플사진 보기" : "샘플 준비중"}
                          </button>
                        </div>
                      </div>
                    );
                  })
                ) : filmLoading ? (
                  Array.from({ length: 8 }).map((_, index) => (
                    <div key={`sheet-film-skeleton-${index}`} className="sheetFilmSkeletonItem" aria-hidden="true">
                      <div className="sheetFilmSkeletonThumb" />
                      <div className="sheetFilmSkeletonLine" />
                      <div className="sheetFilmSkeletonLine short" />
                    </div>
                  ))
                ) : (
                  <div className="emptyFilmBox">표시할 필름이 없습니다.</div>
                )}
              </div>

              {previewSampleFilm?.sample_url ? (
                <div className="sheetSampleBubbleBackdrop" onClick={() => setPreviewSampleFilm(null)}>
                  <div className="sheetSampleBubble" onClick={(event) => event.stopPropagation()}>
                    <button
                      type="button"
                      onClick={() => setPreviewSampleFilm(null)}
                      className="sheetSampleBubbleClose"
                    >
                      닫기
                    </button>

                    <div className="sheetSampleBubbleLabel">필름봇 샘플사진</div>
                    <div className="sheetSampleBubbleTitle">{getFilmName(previewSampleFilm)}</div>

                    {getFilmCode(previewSampleFilm) ? (
                      <div className="sheetSampleBubbleCode">{getFilmCode(previewSampleFilm)}</div>
                    ) : null}

                    <div className="sheetSampleBubbleImageWrap">
                      <img
                        src={previewSampleFilm.sample_url}
                        alt={`${getFilmName(previewSampleFilm)} 샘플사진`}
                        loading="lazy"
                        decoding="async"
                      />
                    </div>

                    <p className="sheetSampleBubbleText">
                      실제 확대 질감을 참고할 수 있도록 필름봇용 샘플사진을 보여드리고 있어요.
                    </p>
                  </div>
                </div>
              ) : null}
            </section>
          </div>
        ) : null}
      </div>

      <div className="decisionExportStage" aria-hidden="true">
        <div ref={decisionExportRef} className="decisionExportCard">
          <div className="decisionExportHeader">
            <div className="decisionExportBadge">필름 시뮬레이션 결과</div>
            <h2>{selectedSpace?.name || "선택 공간"}</h2>
            {state.link?.installer_name ? <p>시공자: {state.link.installer_name}</p> : null}
          </div>

          <div className="decisionExportPreview">
            <div
              className="previewViewport decisionExportViewport"
              style={{
                aspectRatio: previewAspectRatio,
              }}
            >
              {previewHasRealSpace ? (
                <div className="sceneStage">
                  {maskZones.map((zone) => {
                    const film = zoneFilmMap[zone.key];

                    if (film?.image_url) {
                      return (
                        <div
                          key={`export-${zone.key}`}
                          aria-hidden="true"
                          className="maskedFilmLayer"
                          style={{
                            backgroundImage: `url("${film.image_url}")`,
                            backgroundSize: `${zone.patternSize || 220}px auto`,
                            WebkitMaskImage: `url("${zone.mask_url}")`,
                            maskImage: `url("${zone.mask_url}")`,
                          }}
                        />
                      );
                    }

                    return (
                      <div
                        key={`export-${zone.key}`}
                        aria-hidden="true"
                        className="maskedTransparencyLayer"
                        style={{
                          WebkitMaskImage: `url("${zone.mask_url}")`,
                          maskImage: `url("${zone.mask_url}")`,
                        }}
                      />
                    );
                  })}

                  {selectedSpace?.base_image_url ? (
                    <img src={selectedSpace.base_image_url} alt="공간 원본" className="sceneBaseImage" />
                  ) : null}

                  {selectedSpace?.overlay_image_url ? (
                    <img src={selectedSpace.overlay_image_url} alt="공간 오버레이" className="sceneOverlayImage" />
                  ) : null}
                </div>
              ) : (
                <div className="emptyPreviewWrap">
                  <div className="emptyPreviewBox">
                    <div className="emptyPreviewInner">
                      <div style={{ color: COLORS.cream, fontWeight: 900, marginBottom: 6 }}>
                        공간 이미지 등록 전 테스트 화면
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="decisionExportList">
            {maskZones.map((zone) => {
              const film = zoneFilmMap[zone.key] || null;

              return (
                <div key={`export-row-${zone.key}`} className="decisionExportRow">
                  <span>{zone.label}</span>
                  <strong>{film ? getFilmName(film) : "미선택"}</strong>
                </div>
              );
            })}
          </div>

          {hasFabricWarning ? (
            <div className="decisionExportWarning">
              선택된 필름에 패브릭필름이 있습니다. 시뮬레이션상 불가피하게 왜곡이 심한 종류이므로 주의 부탁드립니다.
            </div>
          ) : null}
        </div>
      </div>

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
