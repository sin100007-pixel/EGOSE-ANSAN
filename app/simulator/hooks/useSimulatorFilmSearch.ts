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
  KAKAO_SW_RESET_KEY,
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
  }, [mode, setSelectedFilm, setSelectedSpaceId, setStep, token]);

  const prepareFilmSheet = () => {
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

    // 카카오톡/삼성/웨일 계열은 필름 선택창을 열자마자 API를 다시 부르면
    // 추천 필름 목록과 팔레트가 브라우저 캐시/응답 순서에 따라 바뀌는 경우가 있습니다.
    // 처음 목록은 bootstrap에서 받은 지정 필름을 그대로 쓰고,
    // 검색/팔레트는 bootstrap의 search_films 말뭉치로 로컬 처리합니다.
    if (isKakaoInAppBrowser()) {
      setFilmLoading(false);
      return false;
    }

    return !filmLoading;
  };

  const searchFilms = async (keyword = filmQuery, overrides: SearchOverrides = {}) => {
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
