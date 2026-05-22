"use client";

import { useEffect, useRef, useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import type { SimulatorFilm, SimulatorSpace } from "../types";
import {
  INITIAL_BOOTSTRAP_STATE,
  type BootstrapState,
  type SimulatorMode,
  type SimulatorStep,
} from "../lib/client-state";
import {
  PALETTE_COLOR_OPTIONS,
  orderPaletteColors,
  mergeFilmsById,
  filterFilmsLocally,
  buildLocalPaletteFacets,
  isKakaoInAppBrowser,
  clearProblemBrowserCachesOnce,
  makeKakaoFetchInit,
  buildSimulatorApiUrl,
  readJsonResponse,
  normalizeFilmForKakao,
  normalizeSpaceForKakao,
} from "../lib/client-utils";

type SearchOverrides = {
  paletteMain?: string;
  paletteSub?: string;
  paletteColors?: string[];
  includeFacets?: boolean;
  recommended?: boolean;
};

type LocalFallbackOptions = {
  paletteMain: string;
  paletteSub: string;
  paletteColors: string[];
  includeFacets: boolean;
  preferInitialSource?: boolean;
};

type UseSimulatorFilmSearchArgs = {
  token: string;
  mode: SimulatorMode;
  step: SimulatorStep;
  setStep: Dispatch<SetStateAction<SimulatorStep>>;
  setSelectedSpaceId: Dispatch<SetStateAction<string>>;
  setSelectedFilm: Dispatch<SetStateAction<SimulatorFilm | null>>;
};

export function useSimulatorFilmSearch({
  token,
  mode,
  step,
  setStep,
  setSelectedSpaceId,
  setSelectedFilm,
}: UseSimulatorFilmSearchArgs) {
  const filmSearchSeqRef = useRef(0);
  const filmSearchAbortRef = useRef<AbortController | null>(null);
  const initialSheetFilmsRef = useRef<SimulatorFilm[]>([]);
  const allKnownFilmsRef = useRef<SimulatorFilm[]>([]);
  const initialSheetRequestKeyRef = useRef("");
  const hasLocalFallbackCorpusRef = useRef(false);
  const selectedPaletteMainRef = useRef("");
  const selectedPaletteSubRef = useRef("");
  const selectedPaletteColorsRef = useRef<string[]>([]);

  const [state, setState] = useState<BootstrapState>(INITIAL_BOOTSTRAP_STATE);
  const [filmQuery, setFilmQuery] = useState("");
  const [filmLoading, setFilmLoading] = useState(false);
  const [filmError, setFilmError] = useState("");
  const [selectedPaletteMain, setSelectedPaletteMain] = useState("");
  const [selectedPaletteSub, setSelectedPaletteSub] = useState("");
  const [selectedPaletteColors, setSelectedPaletteColors] = useState<string[]>([]);
  const [paletteSubOptions, setPaletteSubOptions] = useState<string[]>([]);
  const [paletteColorOptions, setPaletteColorOptions] = useState<string[]>(PALETTE_COLOR_OPTIONS);

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

  const getPaletteColorOptions = (colors: string[], paletteMain = "", paletteSub = "") => {
    const cleanColors = Array.from(
      new Set(colors.map((color) => String(color || "").trim()).filter(Boolean))
    );

    if (!paletteMain && !paletteSub) {
      return orderPaletteColors([...new Set([...PALETTE_COLOR_OPTIONS, ...cleanColors])]);
    }

    return cleanColors.length > 0 ? orderPaletteColors(cleanColors) : PALETTE_COLOR_OPTIONS;
  };

  const updatePaletteFacets = (json: any, paletteMain = selectedPaletteMainRef.current, paletteSub = selectedPaletteSubRef.current) => {
    const nextSubs = Array.isArray(json?.facets?.palette_subs)
      ? json.facets.palette_subs.filter(Boolean)
      : [];
    const nextColors = Array.isArray(json?.facets?.palette_colors)
      ? json.facets.palette_colors.filter(Boolean)
      : [];

    setPaletteSubOptions(nextSubs);
    setPaletteColorOptions(getPaletteColorOptions(nextColors, paletteMain, paletteSub));
  };

  const applyLocalFilmFallback = (keyword: string, options: LocalFallbackOptions) => {
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
      updatePaletteFacets(
        {
          facets: buildLocalPaletteFacets(
            facetSourceFilms.length > 0 ? facetSourceFilms : sourceFilms,
            options.paletteMain,
            options.paletteSub
          ),
        },
        options.paletteMain,
        options.paletteSub
      );
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

    updatePaletteFacets(
      {
        facets: buildLocalPaletteFacets(sourceFilms, paletteMain, paletteSub),
      },
      paletteMain,
      paletteSub
    );
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

  useEffect(() => {
    if (!isKakaoInAppBrowser()) return;

    // 카카오톡/일부 인앱브라우저 캐시 정리는 client-utils에서 버전별 1회만 처리합니다.
    // 첫 화면 bootstrap과 중복으로 service worker/cache 삭제를 돌리지 않아 초기 진입 부담을 줄입니다.
    void clearProblemBrowserCachesOnce();
  }, []);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setState((prev) => ({ ...prev, loading: true, message: "" }));

      try {
        // 첫 화면 표시가 늦어지지 않도록 문제 브라우저 캐시 정리는 백그라운드로만 실행합니다.
        // API URL 자체에도 캐시버스터가 붙기 때문에 bootstrap 응답을 기다리기 전 캐시 삭제를 완료할 필요는 없습니다.
        void clearProblemBrowserCachesOnce();

        const params = new URLSearchParams();
        // 고객 공유 링크의 /simulator 이미지와 /api/simulator/films가 middleware에서 공개되었으므로
        // 카카오톡 인앱브라우저도 앱 내부 실행처럼 가벼운 bootstrap을 사용합니다.
        params.set("fast", "1");
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
          hasLocalFallbackCorpusRef.current = true;
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
  }, [mode, setSelectedFilm, setSelectedSpaceId, setStep, token]);

  const prepareFilmSheet = () => {
    setFilmError("");

    const hasActiveSearchState =
      filmQuery.trim().length > 0 ||
      Boolean(selectedPaletteMainRef.current) ||
      Boolean(selectedPaletteSubRef.current) ||
      selectedPaletteColorsRef.current.length > 0;

    // 구역을 바꿔 필름 선택창을 다시 열어도 기존 검색어/1차/2차/색상 팔레트와
    // 현재 필름 목록을 유지합니다.
    // 단, 아직 목록이 비어있는 첫 진입 상황에서는 bootstrap 추천 목록만 복구합니다.
    if (state.films.length === 0) {
      const cachedInitialFilms = initialSheetFilmsRef.current;

      if (cachedInitialFilms.length > 0 && !hasActiveSearchState) {
        setState((prev) => ({
          ...prev,
          films: cachedInitialFilms,
        }));
      }
    }

    updatePaletteFacetsFromLocalCorpus(
      selectedPaletteMainRef.current,
      selectedPaletteSubRef.current
    );

    // 카카오톡/삼성/웨일 계열은 필름 선택창을 열자마자 API를 다시 부르면
    // 추천 필름 목록과 팔레트가 브라우저 캐시/응답 순서에 따라 바뀌는 경우가 있습니다.
    // 검색/팔레트 상태는 그대로 유지하고, 필요 시 로컬 말뭉치로만 처리합니다.
    if (isKakaoInAppBrowser() && hasLocalFallbackCorpusRef.current && getLocalFilmSource(false).length > 0) {
      setFilmLoading(false);
      return false;
    }

    return state.films.length === 0 && !filmLoading;
  };

  const searchFilms = async (keyword = filmQuery, overrides: SearchOverrides = {}) => {
    const q = keyword.trim();
    const nextPaletteMain =
      overrides.paletteMain !== undefined ? overrides.paletteMain : selectedPaletteMainRef.current;
    const nextPaletteSub =
      overrides.paletteSub !== undefined ? overrides.paletteSub : selectedPaletteSubRef.current;
    const nextPaletteColors = (
      overrides.paletteColors !== undefined ? overrides.paletteColors : selectedPaletteColorsRef.current
    ).slice(0, 1);
    const includeFacets = overrides.includeFacets !== false;
    const isKeywordSearch = q.length > 0;
    const requestPaletteMain = isKeywordSearch ? "" : nextPaletteMain;
    const requestPaletteSub = isKeywordSearch ? "" : nextPaletteSub;
    const requestPaletteColors = isKeywordSearch ? [] : nextPaletteColors;
    const isInitialSheetRequest =
      q.length === 0 &&
      !requestPaletteMain &&
      !requestPaletteSub &&
      requestPaletteColors.length === 0;
    // 검색어/1차/2차/색상 조건이 모두 풀린 상태는 항상 기본 추천 컬러 목록으로 복구합니다.
    // 이 값을 빼먹으면 API가 전체 시뮬레이션 필름을 최대 200개까지 내려줘서,
    // 사용자가 필터를 해제했을 때 추천 컬러가 아닌 필름이 섞여 보입니다.
    const useRecommended = overrides.recommended === true || isInitialSheetRequest;
    const requestSeq = filmSearchSeqRef.current + 1;

    filmSearchSeqRef.current = requestSeq;
    filmSearchAbortRef.current?.abort();

    const controller = new AbortController();
    filmSearchAbortRef.current = controller;

    setFilmLoading(true);
    setFilmError("");

    if (isKakaoInAppBrowser() && hasLocalFallbackCorpusRef.current && getLocalFilmSource(false).length > 0) {
      if (isInitialSheetRequest) {
        restoreInitialSheetFilms();
      } else {
        applyLocalFilmFallback(q, {
          paletteMain: requestPaletteMain,
          paletteSub: requestPaletteSub,
          paletteColors: requestPaletteColors,
          includeFacets,
          preferInitialSource: false,
        });
      }

      setFilmLoading(false);
      return;
    }

    try {
      void clearProblemBrowserCachesOnce();

      const params = new URLSearchParams();
      if (q) params.set("q", q);
      if (token) params.set("token", token);
      if (useRecommended) params.set("recommended", "1");
      if (requestPaletteMain) params.set("palette_main", requestPaletteMain);
      if (requestPaletteSub) params.set("palette_sub", requestPaletteSub);
      if (!includeFacets) params.set("skip_facets", "1");
      requestPaletteColors.forEach((color) => params.append("palette_color", color));

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
          paletteMain: requestPaletteMain,
          paletteSub: requestPaletteSub,
          paletteColors: requestPaletteColors,
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

      if (nextFilms.length === 0 && (q || requestPaletteMain || requestPaletteSub || requestPaletteColors.length > 0)) {
        const recovered = applyLocalFilmFallback(q, {
          paletteMain: requestPaletteMain,
          paletteSub: requestPaletteSub,
          paletteColors: requestPaletteColors,
          includeFacets,
          preferInitialSource: isInitialSheetRequest && useRecommended,
        });

        if (recovered) return;
      }

      if (json.facets) {
        updatePaletteFacets(json, requestPaletteMain, requestPaletteSub);
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
        paletteMain: requestPaletteMain,
        paletteSub: requestPaletteSub,
        paletteColors: requestPaletteColors,
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
    if (state.loading || state.setupNeeded || state.expired) return;

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

    const prefetchInitialFilms = () => {
      if (isKakaoInAppBrowser() && hasLocalFallbackCorpusRef.current && getLocalFilmSource(false).length > 0) {
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
    };

    const timer = window.setTimeout(prefetchInitialFilms, 80);

    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.loading, state.setupNeeded, state.expired, mode, token, state.link?.film_scope, state.link?.token]);

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
    const nextColors = currentColors.includes(value) ? [] : [value];

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

  return {
    state,
    setState,
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
  };
}
