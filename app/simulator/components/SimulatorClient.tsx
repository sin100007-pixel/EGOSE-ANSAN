"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties } from "react";
import { useRouter } from "next/navigation";
import type { ContractorProfile, SimulatorFilm, SimulatorLinkInfo, SimulatorSpace } from "../types";
import SimulatorIntroOverview from "./SimulatorIntroOverview";

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

type MaskZoneDefinition = {
  key: string;
  label: string;
  mask_url: string;
  patternSize?: number;
};

type SimulatorStep = "intro" | "space" | "apply" | "decision";

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

const DEFAULT_MASK_ZONES: MaskZoneDefinition[] = [
  {
    key: "upper",
    label: "상부장",
    mask_url: "/simulator/fridge/fridge-upper-mask.png",
    patternSize: 220,
  },
  {
    key: "lower",
    label: "하부장",
    mask_url: "/simulator/fridge/fridge-lower-mask.png",
    patternSize: 220,
  },
  {
    key: "fridge",
    label: "냉장고장",
    mask_url: "/simulator/fridge/fridge-fridge-mask.png",
    patternSize: 220,
  },
];

const PALETTE_MAIN_OPTIONS = ["솔리드", "우드", "스톤", "메탈", "페브릭레더"];

const PALETTE_COLOR_OPTIONS = [
  "흰색",
  "아이보리",
  "베이지",
  "옐로/골드",
  "연브라운",
  "브라운",
  "진브라운",
  "다크브라운",
  "검정/차콜",
  "회색/실버",
  "블루",
  "그린",
  "레드/핑크",
  "퍼플",
];

const PALETTE_COLOR_SWATCH: Record<string, string> = {
  흰색: "#F8F6EF",
  아이보리: "#EFE2C8",
  베이지: "#CDBA99",
  "옐로/골드": "#C9A04D",
  연브라운: "#B98252",
  브라운: "#8A5A35",
  진브라운: "#5A3926",
  다크브라운: "#3E2A20",
  "회색/실버": "#9A9A94",
  "검정/차콜": "#222222",
  그린: "#6F8A5B",
  블루: "#3D65B8",
  "레드/핑크": "#C95E6D",
  퍼플: "#7A5A9A",
};

function orderPaletteColors(values: string[]) {
  const orderMap = new Map(PALETTE_COLOR_OPTIONS.map((value, index) => [value, index]));

  return [...values].sort((a, b) => {
    const ai = orderMap.has(a) ? orderMap.get(a)! : 999;
    const bi = orderMap.has(b) ? orderMap.get(b)! : 999;

    if (ai !== bi) return ai - bi;
    return a.localeCompare(b, "ko");
  });
}

function formatDateTime(value: string) {
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

function getFilmName(film: SimulatorFilm | null) {
  if (!film) return "필름을 선택해주세요";
  return film.full_name || film.product_code_1 || film.color_name || "선택한 필름";
}

function getFilmCode(film: SimulatorFilm) {
  return [film.product_code_1, film.product_code_2].filter(Boolean).join(" / ");
}

function readMaskZones(space: SimulatorSpace | null): MaskZoneDefinition[] {
  const rawZones = space?.mask_config?.["zones"];

  if (!Array.isArray(rawZones) || rawZones.length === 0) {
    return DEFAULT_MASK_ZONES;
  }

  const parsed = rawZones
    .map((zone) => {
      if (!zone || typeof zone !== "object") return null;

      const z = zone as Record<string, unknown>;

      if (
        typeof z.key !== "string" ||
        typeof z.label !== "string" ||
        typeof z.mask_url !== "string"
      ) {
        return null;
      }

      return {
        key: z.key,
        label: z.label,
        mask_url: z.mask_url,
        patternSize: typeof z.patternSize === "number" ? z.patternSize : 220,
      } as MaskZoneDefinition;
    })
    .filter(Boolean) as MaskZoneDefinition[];

  return parsed.length > 0 ? parsed : DEFAULT_MASK_ZONES;
}

function readPreviewAspectRatio(space: SimulatorSpace | null) {
  const raw =
    space?.mask_config &&
    typeof space.mask_config["previewAspectRatio"] === "string"
      ? String(space.mask_config["previewAspectRatio"])
      : "1536 / 1024";

  return raw || "1536 / 1024";
}

function getSpaceThumbnail(space: SimulatorSpace) {
  return space.thumbnail_url || space.overlay_image_url || space.base_image_url || "";
}

const loadedImageCache = new Set<string>();

function preloadImage(src: string) {
  if (!src || loadedImageCache.has(src)) {
    return Promise.resolve();
  }

  return new Promise<void>((resolve, reject) => {
    const img = new Image();

    img.onload = () => {
      loadedImageCache.add(src);
      resolve();
    };

    img.onerror = () => reject(new Error("이미지를 불러오지 못했습니다."));
    img.src = src;
  });
}

function getFilmThumbUrl(film: SimulatorFilm) {
  return film.thumb_url || film.image_url || "";
}

function getPhoneHref(phone: string | null | undefined) {
  const cleaned = String(phone || "").replace(/[^\d+]/g, "");
  return cleaned ? `tel:${cleaned}` : "";
}

function getKakaoHref(kakaoUrl: string | null | undefined) {
  const value = String(kakaoUrl || "").trim();
  return value || "";
}

export default function SimulatorClient({ token = "", mode }: SimulatorClientProps) {
  const router = useRouter();
  const filmSearchSeqRef = useRef(0);
  const filmSearchAbortRef = useRef<AbortController | null>(null);
  const initialSheetFilmsRef = useRef<SimulatorFilm[]>([]);
  const initialSheetRequestKeyRef = useRef("");
  const selectedPaletteMainRef = useRef("");
  const selectedPaletteSubRef = useRef("");
  const selectedPaletteColorsRef = useRef<string[]>([]);

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
  const [decisionMessage, setDecisionMessage] = useState("");
  const [isDashboardMoving, setIsDashboardMoving] = useState(false);

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

  const applyingFilm = useMemo(() => {
    if (applyingFilmId === null) return null;
    return state.films.find((film) => film.id === applyingFilmId) || null;
  }, [applyingFilmId, state.films]);

  const getTargetZoneKey = () => {
    return activeZoneKey || activeZone?.key || maskZones[0]?.key || "";
  };

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setState((prev) => ({ ...prev, loading: true, message: "" }));

      try {
        const params = token ? `?token=${encodeURIComponent(token)}` : "";
        const res = await fetch(`/api/simulator/bootstrap${params}`, {
          cache: "no-store",
        });
        const json = await res.json();

        if (cancelled) return;

        const nextSpaces = Array.isArray(json.spaces) ? json.spaces : [];
        const nextFilms = Array.isArray(json.films) ? json.films : [];

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
    setState((prev) => ({
      ...prev,
      films: cachedInitialFilms.length > 0 ? cachedInitialFilms : [],
    }));

    setIsFilmSheetOpen(true);

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

    try {
      const params = new URLSearchParams();
      if (q) params.set("q", q);
      if (token) params.set("token", token);
      if (useRecommended) params.set("recommended", "1");
      if (nextPaletteMain) params.set("palette_main", nextPaletteMain);
      if (nextPaletteSub) params.set("palette_sub", nextPaletteSub);
      if (!includeFacets) params.set("skip_facets", "1");
      nextPaletteColors.forEach((color) => params.append("palette_color", color));

      const res = await fetch(`/api/simulator/films?${params.toString()}`, {
        cache: "no-store",
        signal: controller.signal,
      });

      const json = await res.json();

      if (requestSeq !== filmSearchSeqRef.current) {
        return;
      }

      if (!res.ok) {
        setFilmError(json.error || "필름 검색 중 오류가 발생했습니다.");
        return;
      }

      const nextFilms = Array.isArray(json.items) ? json.items : [];
      if (json.facets) {
        updatePaletteFacets(json);
      }
      if (isInitialSheetRequest) {
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

      setFilmError("필름 검색 중 오류가 발생했습니다.");
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
      closeFilmSheet();
    } catch {
      setFilmError("이미지를 불러오지 못했습니다. 다시 선택해주세요.");
    } finally {
      setApplyingFilmId(null);
    }
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

    return lines.join("\n");
  };

  const shareDecisionResult = async () => {
    const text = buildDecisionText();

    setDecisionMessage("");

    try {
      if (navigator.share) {
        await navigator.share({
          title: "필름 시뮬레이션 결정 결과",
          text,
        });
        setDecisionMessage("결정 결과를 전송했습니다.");
        return;
      }

      await navigator.clipboard.writeText(text);
      setDecisionMessage("결정 결과를 복사했습니다. 문자, 메신저로 붙여넣어 전송해주세요.");
    } catch {
      try {
        await navigator.clipboard.writeText(text);
        setDecisionMessage("결정 결과를 복사했습니다. 문자, 메신저로 붙여넣어 전송해주세요.");
      } catch {
        setDecisionMessage("전송에 실패했습니다. 화면의 결과를 캡쳐해서 보내주세요.");
      }
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

  const mainTitle = mode === "customer" ? "필름 시뮬레이터" : "시뮬레이터";
  const hasIntroStep = mode === "customer" && Boolean(state.contractor);
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
              <section style={noticeStyle()}>시뮬레이터 정보를 불러오는 중...</section>
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
                      <strong>{film ? getFilmName(film) : "필름 선택"}</strong>
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
                *고화질 이미지를 이용한 시뮬레이션이지만 실물 필름과는 차이가있습니다. 유의해주세요.*
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
              </div>

              <div className="decisionActionGrid">
                <section className="decisionActionCard">
                  <div className="decisionActionIcon">1</div>
                  <h3>결정 결과 전송</h3>
                  <p>
                    선택한 구역별 필름 결과를 보낼 수 있습니다. 휴대폰에서는 공유창이 열리고, 지원하지 않는 경우 결과가 복사됩니다.
                  </p>
                  <button type="button" onClick={() => void shareDecisionResult()} className="primaryDecisionButton">
                    시뮬레이션 결과 전송
                  </button>
                  {decisionMessage ? <div className="decisionMessage">{decisionMessage}</div> : null}
                </section>

                <section className="decisionActionCard">
                  <div className="decisionActionIcon">2</div>
                  <h3>샘플 안내</h3>
                  <p>
                    거래처의 매장으로 오시면 샘플을 받아 보실 수 있습니다.
                  </p>
                  <div className="storeInfoBox">
                    <strong>이고세(주)</strong>
                    <span>경기도 안산시 상록구 안산천서로 237</span>
                    <span>Tel. 031-486-6882</span>
                  </div>
                </section>

                <section className="decisionActionCard">
                  <div className="decisionActionIcon">3</div>
                  <h3>카카오톡 문의</h3>
                  <p>
                    필름 선택이나 샘플 확인이 필요하면 카카오톡으로 문의해주세요.
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
                      <button
                        key={film.id}
                        type="button"
                        onClick={() => void handleFilmClick(film)}
                        disabled={applyingFilmId !== null}
                        className={`sheetFilmItem ${active ? "sheetFilmItemActive" : ""}`}
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
                        <div className="sheetFilmMeta">
                          {applyingFilmId === film.id
                            ? "적용 중..."
                            : getFilmCode(film) || film.manufacturer || "삼성필름"}
                        </div>
                      </button>
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
            </section>
          </div>
        ) : null}
      </div>

      <style jsx>{`
        .pageWrap {
          width: 100%;
          min-height: 100vh;
          padding-bottom: 92px;
          box-sizing: border-box;
        }


        .dashboardMoveOverlay {
          position: fixed;
          inset: 0;
          z-index: 9999;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(7, 6, 27, 0.30);
          backdrop-filter: blur(2px);
          pointer-events: none;
        }

        .dashboardMoveToast {
          padding: 14px 18px;
          border-radius: 999px;
          background: rgba(10, 8, 72, 0.94);
          color: #fff;
          border: 1px solid rgba(255,255,255,0.18);
          box-shadow: 0 14px 34px rgba(0,0,0,0.28);
          font-size: 14px;
          font-weight: 900;
          letter-spacing: -0.02em;
        }

        .filmApplyOverlay {
          position: fixed;
          inset: 0;
          z-index: 10000;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 18px;
          background: rgba(5, 2, 35, 0.38);
          backdrop-filter: blur(3px);
        }

        .filmApplyToast {
          width: min(280px, 100%);
          border-radius: 24px;
          padding: 22px 18px 18px;
          background: rgba(10, 8, 72, 0.96);
          border: 1px solid rgba(238,224,197,0.28);
          box-shadow: 0 22px 58px rgba(0,0,0,0.42);
          color: ${COLORS.white};
          text-align: center;
        }

        .filmApplySpinner {
          width: 34px;
          height: 34px;
          border-radius: 999px;
          border: 3px solid rgba(238,224,197,0.28);
          border-top-color: ${COLORS.cream};
          display: inline-block;
          margin-bottom: 12px;
          animation: filmApplySpin 0.8s linear infinite;
        }

        .filmApplyToast strong {
          display: block;
          color: ${COLORS.cream};
          font-size: 18px;
          font-weight: 1000;
          letter-spacing: -0.03em;
        }

        .filmApplyToast p {
          margin: 7px 0 0;
          color: ${COLORS.soft};
          font-size: 13px;
          line-height: 1.45;
          word-break: keep-all;
        }

        @keyframes filmApplySpin {
          to {
            transform: rotate(360deg);
          }
        }

        .customerIntroSkeleton {
          width: min(720px, 100%);
          margin: 0 auto;
          display: grid;
          gap: 16px;
          padding: 4px 0 24px;
        }

        .introSkeletonHero,
        .introSkeletonProfile,
        .introSkeletonPortfolio {
          position: relative;
          overflow: hidden;
          border: 1px solid ${COLORS.line};
          border-radius: 30px;
          background: linear-gradient(180deg, rgba(255, 255, 255, 0.08), rgba(255, 255, 255, 0.035));
          box-shadow: 0 18px 48px rgba(0, 0, 0, 0.22);
          padding: 24px;
        }

        .introSkeletonProfile {
          display: grid;
          grid-template-columns: 112px minmax(0, 1fr);
          gap: 16px;
          align-items: center;
        }

        .introSkeletonPortfolio {
          display: grid;
          gap: 14px;
        }

        .introSkeletonPill,
        .introSkeletonTitle,
        .introSkeletonText,
        .introSkeletonLogo,
        .introSkeletonButton,
        .introSkeletonPhoto {
          position: relative;
          overflow: hidden;
          background: rgba(255, 255, 255, 0.09);
        }

        .introSkeletonPill::after,
        .introSkeletonTitle::after,
        .introSkeletonText::after,
        .introSkeletonLogo::after,
        .introSkeletonButton::after,
        .introSkeletonPhoto::after,
        .introSkeletonHero::after,
        .introSkeletonProfile::after,
        .introSkeletonPortfolio::after {
          content: "";
          position: absolute;
          inset: 0;
          transform: translateX(-100%);
          background: linear-gradient(
            90deg,
            transparent 0%,
            rgba(255, 255, 255, 0.08) 35%,
            rgba(255, 255, 255, 0.17) 50%,
            transparent 100%
          );
          animation: introSkeletonShimmer 1.35s infinite;
        }

        .introSkeletonPill {
          width: 132px;
          height: 36px;
          border-radius: 999px;
          background: rgba(238, 224, 197, 0.15);
          margin-bottom: 18px;
        }

        .introSkeletonTitle {
          height: 38px;
          border-radius: 999px;
          margin-top: 10px;
        }

        .introSkeletonWide {
          width: 76%;
        }

        .introSkeletonMid {
          width: 52%;
        }

        .introSkeletonText {
          height: 18px;
          border-radius: 999px;
          margin-top: 14px;
          background: rgba(255, 255, 255, 0.075);
        }

        .introSkeletonTextLong {
          width: 86%;
        }

        .introSkeletonTextMid {
          width: 64%;
        }

        .introSkeletonName {
          width: 160px;
          height: 24px;
          margin-top: 0;
          background: rgba(238, 224, 197, 0.12);
        }

        .introSkeletonSectionTitle {
          width: 180px;
          height: 24px;
          margin-top: 0;
          background: rgba(238, 224, 197, 0.12);
        }

        .introSkeletonLogo {
          width: 112px;
          height: 112px;
          border-radius: 28px;
          background: rgba(238, 224, 197, 0.13);
        }

        .introSkeletonButtons {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px;
          margin-top: 18px;
        }

        .introSkeletonButton {
          height: 48px;
          border-radius: 16px;
          background: rgba(238, 224, 197, 0.16);
        }

        .introSkeletonPhotoGrid {
          display: grid;
          grid-template-columns: 1.4fr 1fr;
          gap: 10px;
        }

        .introSkeletonPhoto {
          min-height: 140px;
          border-radius: 22px;
          background: rgba(255, 255, 255, 0.08);
        }

        .introSkeletonPhotoLarge {
          grid-row: span 2;
          min-height: 292px;
        }

        @keyframes introSkeletonShimmer {
          100% {
            transform: translateX(100%);
          }
        }

        .pageInner {
          width: min(1120px, 100%);
          margin: 0 auto;
          padding: 24px 16px 48px;
          box-sizing: border-box;
        }

        .backButton {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          border: 1px solid ${COLORS.line};
          border-radius: 999px;
          padding: 11px 15px;
          background: ${COLORS.panelStrong};
          color: ${COLORS.cream};
          box-shadow: 0 14px 34px rgba(0, 0, 0, 0.28);
          cursor: pointer;
          font-size: 14px;
          font-weight: 900;
          margin: 16px 0 0 16px;
          position: sticky;
          top: 14px;
          z-index: 50;
        }

        .heroCard,
        .contractorIntroCard,
        .spaceSelectCard,
        .applyCard,
        .decisionCard {
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

        .heroTopRow {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 16px;
          flex-wrap: wrap;
        }

        .stepBadge {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          border-radius: 999px;
          padding: 7px 11px;
          background: rgba(238, 224, 197, 0.1);
          color: ${COLORS.cream};
          font-size: 13px;
          font-weight: 900;
          margin-bottom: 9px;
        }

        .pageTitle {
          margin: 0;
          font-size: clamp(28px, 5vw, 46px);
          line-height: 1.08;
          letter-spacing: -0.04em;
          word-break: keep-all;
        }

        .heroText {
          margin: 12px 0 0;
          color: ${COLORS.soft};
          font-size: 15px;
          line-height: 1.7;
          word-break: keep-all;
        }

        .linkCard {
         display: inline-flex;
          align-items: center;
         align-self: flex-start;
          min-width: 0;
          max-width: min(100%, 320px);
         border-radius: 20px;
         padding: 10px 14px;
          background: rgba(238, 224, 197, 0.1);
         border: 1px solid ${COLORS.line};
          }

          .linkCardCompact {
          min-height: auto;
          }

          .linkCardText {
         color: ${COLORS.white};
         font-size: 14px;
          line-height: 1.45;
         font-weight: 800;
          word-break: keep-all;
        }

        .contractorIntroCard,
        .spaceSelectCard,
        .applyCard,
        .decisionCard {
          border-radius: 30px;
          padding: 18px;
        }

        .contractorIntroCard {
          border: 1px solid ${COLORS.line};
          box-shadow: 0 18px 48px rgba(0, 0, 0, 0.22);
          background: linear-gradient(180deg, rgba(255, 255, 255, 0.075), rgba(255, 255, 255, 0.035));
        }

        .contractorIntroTop {
          display: flex;
          flex-direction: column;
          gap: 16px;
          align-items: stretch;
        }

        .contractorLogoBox {
          width: min(340px, 100%);
          min-height: 0;
          overflow: hidden;
          display: flex;
          align-items: center;
          justify-content: center;
          align-self: center;
          background: transparent;
          border: 0;
          border-radius: 0;
          color: ${COLORS.cream};
          font-size: 72px;
          font-weight: 1000;
        }

        .contractorLogoBox img {
          width: 100%;
          max-width: 340px;
          height: auto;
          max-height: 136px;
          object-fit: contain;
          object-position: center center;
          display: block;
          transform: none;
        }

        .contractorIntroTextBox h2 {
          margin: 0;
          color: ${COLORS.white};
          font-size: clamp(25px, 4vw, 38px);
          line-height: 1.16;
          letter-spacing: -0.04em;
          word-break: keep-all;
        }

        .contractorIntroTextBox p {
          margin: 12px 0 0;
          color: ${COLORS.soft};
          font-size: 15px;
          line-height: 1.72;
          white-space: pre-line;
          word-break: keep-all;
        }

        .contractorContactRow {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 10px;
          margin-top: 16px;
        }

        .contractorContactButton {
          min-height: 46px;
          border-radius: 999px;
          padding: 0 15px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          background: rgba(238, 224, 197, 0.1);
          border: 1px solid rgba(238, 224, 197, 0.2);
          box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.12), 0 12px 24px rgba(0, 0, 0, 0.18);
          color: ${COLORS.cream};
          text-decoration: none;
          font-size: 14px;
          font-weight: 1000;
          white-space: nowrap;
          word-break: keep-all;
        }

        .contractorContactIcon {
          width: 22px;
          height: 22px;
          border-radius: 999px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          flex: 0 0 auto;
          background: rgba(238, 224, 197, 0.16);
          color: ${COLORS.cream};
        }

        .contractorContactIcon svg {
          width: 14px;
          height: 14px;
          display: block;
          fill: currentColor;
        }

        .contractorContactIcon.kakao svg {
          width: 15px;
          height: 15px;
        }

        .portfolioPreviewBlock {
          margin-top: 18px;
          border-radius: 24px;
          padding: 14px;
          background: rgba(255, 255, 255, 0.045);
          border: 1px solid ${COLORS.line};
        }

        .portfolioHeaderRow {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 10px;
          margin-bottom: 12px;
        }

        .portfolioHeaderRow h3 {
          margin: 0;
          color: ${COLORS.white};
          font-size: 20px;
          letter-spacing: -0.03em;
        }

        .portfolioHeaderRow span {
          flex-shrink: 0;
          border-radius: 999px;
          padding: 7px 10px;
          background: rgba(238, 224, 197, 0.1);
          color: ${COLORS.cream};
          font-size: 12px;
          font-weight: 900;
        }

        .portfolioPhotoGrid {
          display: grid;
          grid-template-columns: 1.2fr 1fr 1fr;
          gap: 10px;
        }

        .portfolioPhotoCard {
          position: relative;
          min-height: 180px;
          margin: 0;
          border-radius: 20px;
          overflow: hidden;
          background: rgba(238, 224, 197, 0.08);
          border: 1px solid ${COLORS.line};
        }

        .portfolioPhotoCard:first-child {
          min-height: 260px;
        }

        .portfolioPhotoCard img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
          position: absolute;
          inset: 0;
        }

        .portfolioPhotoCard figcaption {
          position: absolute;
          left: 10px;
          right: 10px;
          bottom: 10px;
          border-radius: 14px;
          padding: 9px 10px;
          background: rgba(5, 2, 59, 0.76);
          backdrop-filter: blur(8px);
          display: grid;
          gap: 3px;
        }

        .portfolioPhotoCard figcaption strong {
          color: ${COLORS.cream};
          font-size: 13px;
          font-weight: 1000;
        }

        .portfolioPhotoCard figcaption span {
          color: ${COLORS.white};
          font-size: 12px;
          line-height: 1.35;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }

        .introStartButton {
          width: 100%;
          min-height: 54px;
          border: none;
          border-radius: 999px;
          margin-top: 12px;
          background: ${COLORS.cream};
          color: ${COLORS.creamText};
          box-shadow: 0 14px 30px rgba(0, 0, 0, 0.22);
          font-size: 17px;
          font-weight: 1000;
          cursor: pointer;
        }

        .sectionHeader,
        .applyTopRow {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 12px;
          margin-bottom: 14px;
        }

        .sectionLabel {
          color: ${COLORS.cream};
          font-size: 13px;
          font-weight: 900;
          margin-bottom: 6px;
        }

        .sectionTitle,
        .spaceTitle {
          margin: 0;
          font-size: clamp(24px, 4vw, 34px);
          letter-spacing: -0.03em;
          word-break: keep-all;
        }

        .spaceCount,
        .changeSpaceButton {
          flex-shrink: 0;
          border-radius: 999px;
          padding: 10px 13px;
          background: rgba(238, 224, 197, 0.1);
          color: ${COLORS.cream};
          border: 1px solid ${COLORS.line};
          font-size: 13px;
          font-weight: 900;
        }

        .changeSpaceButton {
          cursor: pointer;
        }

        .spaceGrid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
          gap: 14px;
        }

        .spaceCard {
          border: 1px solid ${COLORS.line};
          border-radius: 24px;
          background: rgba(255, 255, 255, 0.045);
          padding: 10px;
          color: ${COLORS.white};
          text-align: left;
          cursor: pointer;
          overflow: hidden;
        }

        .spaceCardActive {
          border-color: rgba(238, 224, 197, 0.52);
          background: rgba(238, 224, 197, 0.09);
        }

        .spaceThumb {
          position: relative;
          width: 100%;
          aspect-ratio: 1536 / 1024;
          border-radius: 18px;
          overflow: hidden;
          background: rgba(255, 255, 255, 0.06);
          border: 1px solid ${COLORS.line};
          isolation: isolate;
        }

        .spaceThumb > img {
          display: block;
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .spaceThumbStage {
          position: absolute;
          inset: 0;
          overflow: hidden;
          border-radius: inherit;
          background: transparent;
        }

        .spaceThumbCheckerLayer {
          position: absolute;
          inset: 0;
          z-index: 2;
          pointer-events: none;
          background-color: rgba(255, 255, 255, 0.94);
          background-image:
            linear-gradient(45deg, rgba(175, 181, 202, 0.9) 25%, transparent 25%),
            linear-gradient(-45deg, rgba(175, 181, 202, 0.9) 25%, transparent 25%),
            linear-gradient(45deg, transparent 75%, rgba(175, 181, 202, 0.9) 75%),
            linear-gradient(-45deg, transparent 75%, rgba(175, 181, 202, 0.9) 75%);
          background-size: 12px 12px;
          background-position: 0 0, 0 6px, 6px -6px, -6px 0px;
          -webkit-mask-repeat: no-repeat;
          -webkit-mask-position: center;
          -webkit-mask-size: 100% 100%;
          mask-repeat: no-repeat;
          mask-position: center;
          mask-size: 100% 100%;
        }

        .spaceThumbBaseImage,
        .spaceThumbOverlayImage {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          object-fit: fill;
          object-position: center;
          pointer-events: none;
          display: block;
        }

        .spaceThumbBaseImage {
          z-index: 1;
        }

        .spaceThumbOverlayImage {
          z-index: 10;
        }

        .spaceThumbEmpty {
          height: 100%;
          display: grid;
          place-items: center;
          color: ${COLORS.soft};
          font-size: 13px;
          font-weight: 800;
        }

        .spaceInfo {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 10px;
          padding: 12px 4px 4px;
        }

        .spaceName {
          color: ${COLORS.cream};
          font-size: 17px;
          font-weight: 900;
          margin-bottom: 5px;
        }

        .spaceDesc {
          color: ${COLORS.soft};
          font-size: 12px;
          line-height: 1.5;
          word-break: keep-all;
        }

        .spaceGoBadge {
          flex-shrink: 0;
          border-radius: 999px;
          padding: 6px 10px;
          background: rgba(238, 224, 197, 0.12);
          color: ${COLORS.cream};
          font-size: 12px;
          font-weight: 900;
        }

        .previewViewport {
          position: relative;
          overflow: hidden;
          border-radius: 26px;
          border: 1px solid ${COLORS.line};
          background: rgba(255, 255, 255, 0.04);
          min-height: 260px;
          width: 100%;
          isolation: isolate;
        }

        .sceneStage {
          position: absolute;
          inset: 0;
          overflow: hidden;
          border-radius: 26px;
          background: transparent;
        }

        .maskedTransparencyLayer,
        .maskedFilmLayer {
          position: absolute;
          inset: 0;
          pointer-events: none;

          -webkit-mask-repeat: no-repeat;
          -webkit-mask-position: center;
          -webkit-mask-size: 100% 100%;

          mask-repeat: no-repeat;
          mask-position: center;
          mask-size: 100% 100%;
        }

        .maskedTransparencyLayer {
          z-index: 2;
          background-color: rgba(255, 255, 255, 0.94);
          background-image:
            linear-gradient(45deg, rgba(175, 181, 202, 0.9) 25%, transparent 25%),
            linear-gradient(-45deg, rgba(175, 181, 202, 0.9) 25%, transparent 25%),
            linear-gradient(45deg, transparent 75%, rgba(175, 181, 202, 0.9) 75%),
            linear-gradient(-45deg, transparent 75%, rgba(175, 181, 202, 0.9) 75%);
          background-size: 12px 12px;
          background-position: 0 0, 0 6px, 6px -6px, -6px 0px;
          box-shadow: inset 0 0 0 1px rgba(255,255,255,0.35);
        }

        .maskedFilmLayer {
          z-index: 3;
          background-position: center;
          background-repeat: repeat;
        }

        .sceneBaseImage,
        .sceneOverlayImage {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          object-fit: fill;
          object-position: center;
          pointer-events: none;
          display: block;
        }

        .sceneBaseImage {
          z-index: 1;
        }

        .sceneOverlayImage {
          z-index: 10;
        }

        .emptyPreviewWrap {
          position: absolute;
          inset: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 22px;
        }

        .emptyPreviewBox {
          width: min(440px, 100%);
          border-radius: 24px;
          padding: 18px;
          background: rgba(238, 224, 197, 0.1);
          border: 1px solid ${COLORS.line};
          box-shadow: 0 18px 42px rgba(0, 0, 0, 0.24);
          min-height: 220px;
          display: flex;
          align-items: flex-end;
        }

        .emptyPreviewInner {
          border-radius: 18px;
          padding: 14px 16px;
          background: rgba(5, 2, 59, 0.82);
          color: ${COLORS.white};
          backdrop-filter: blur(8px);
        }

        .zoneApplyGrid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 10px;
          margin-top: 14px;
        }

        .zoneApplyButton {
          border: 1px solid ${COLORS.line};
          border-radius: 20px;
          padding: 13px 12px;
          background: rgba(255, 255, 255, 0.05);
          color: ${COLORS.white};
          cursor: pointer;
          display: grid;
          gap: 6px;
          text-align: left;
          min-height: 76px;
        }

        .zoneApplyButtonActive {
          border-color: rgba(238, 224, 197, 0.62);
          background: rgba(238, 224, 197, 0.14);
        }

        .zoneApplyButton span {
          color: ${COLORS.cream};
          font-size: 14px;
          font-weight: 900;
        }

        .zoneApplyButton strong {
          color: ${COLORS.soft};
          font-size: 12px;
          line-height: 1.35;
          font-weight: 800;
          overflow: hidden;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
        }

        .applyActionRow {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
          margin-top: 12px;
        }

        .smallActionButton {
          border-radius: 12px;
          border: 1px solid ${COLORS.line};
          background: rgba(255, 255, 255, 0.06);
          color: ${COLORS.white};
          font-size: 13px;
          font-weight: 800;
          padding: 9px 12px;
          cursor: pointer;
        }

        .applyWarningText {
          margin: 12px 2px 8px;
          color: #ff4d4d;
          font-size: 13px;
          font-weight: 900;
          line-height: 1.45;
          word-break: keep-all;
        }

        .applyDecisionRow {
          margin-top: 8px;
        }

        .decisionNextButton {
          width: 100%;
          border: none;
          border-radius: 16px;
          padding: 15px 16px;
          background: ${COLORS.cream};
          color: ${COLORS.bg};
          font-size: 16px;
          font-weight: 1000;
          letter-spacing: -0.02em;
          cursor: pointer;
          box-shadow: 0 14px 30px rgba(0, 0, 0, 0.24);
        }

        .decisionNextButton:disabled {
          opacity: 0.45;
          cursor: not-allowed;
          box-shadow: none;
        }

        .decisionSummary {
          border-radius: 22px;
          padding: 14px;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid ${COLORS.line};
          margin-top: 12px;
        }

        .decisionSpaceName {
          color: ${COLORS.cream};
          font-size: 18px;
          font-weight: 900;
          margin-bottom: 10px;
        }

        .decisionZoneList {
          display: grid;
          gap: 8px;
        }

        .decisionZoneItem {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          border-radius: 15px;
          padding: 11px 12px;
          background: rgba(255, 255, 255, 0.045);
          border: 1px solid ${COLORS.line};
        }

        .decisionZoneItem span {
          color: ${COLORS.soft};
          font-size: 13px;
          font-weight: 900;
          white-space: nowrap;
        }

        .decisionZoneItem strong {
          color: ${COLORS.white};
          font-size: 13px;
          line-height: 1.35;
          text-align: right;
          word-break: keep-all;
        }

        .decisionActionGrid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 10px;
          margin-top: 12px;
        }

        .decisionActionCard {
          border-radius: 22px;
          padding: 14px;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid ${COLORS.line};
        }

        .decisionActionIcon {
          display: inline-grid;
          place-items: center;
          width: 30px;
          height: 30px;
          border-radius: 999px;
          background: rgba(238, 224, 197, 0.14);
          color: ${COLORS.cream};
          font-size: 13px;
          font-weight: 900;
          margin-bottom: 10px;
        }

        .decisionActionCard h3 {
          margin: 0 0 8px;
          color: ${COLORS.cream};
          font-size: 17px;
          letter-spacing: -0.03em;
        }

        .decisionActionCard p {
          margin: 0 0 12px;
          color: ${COLORS.soft};
          font-size: 13px;
          line-height: 1.65;
          word-break: keep-all;
        }

        .primaryDecisionButton {
          width: 100%;
          min-height: 44px;
          border: none;
          border-radius: 15px;
          background: ${COLORS.cream};
          color: ${COLORS.creamText};
          font-size: 14px;
          font-weight: 900;
          text-decoration: none;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          box-sizing: border-box;
        }

        .decisionMessage {
          margin-top: 9px;
          color: ${COLORS.cream};
          font-size: 12px;
          line-height: 1.45;
        }

        .storeInfoBox {
          display: grid;
          gap: 4px;
          border-radius: 15px;
          padding: 11px;
          background: rgba(238, 224, 197, 0.09);
          border: 1px solid rgba(238, 224, 197, 0.18);
        }

        .storeInfoBox strong {
          color: ${COLORS.cream};
          font-size: 13px;
        }

        .storeInfoBox span {
          color: ${COLORS.white};
          font-size: 12px;
          line-height: 1.45;
        }

        .bottomStepNav {
          position: fixed;
          left: 50%;
          bottom: 16px;
          transform: translateX(-50%);
          z-index: 60;
          width: min(420px, calc(100% - 28px));
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 7px;
          padding: 8px;
          border-radius: 22px;
          background: rgba(7, 5, 58, 0.88);
          border: 1px solid ${COLORS.line};
          box-shadow: 0 20px 48px rgba(0, 0, 0, 0.36);
          backdrop-filter: blur(14px);
        }

        .bottomStepNavFour {
          grid-template-columns: repeat(4, minmax(0, 1fr));
          width: min(500px, calc(100% - 28px));
        }

        .bottomStepNav button {
          border: 1px solid transparent;
          border-radius: 16px;
          background: rgba(255, 255, 255, 0.05);
          color: ${COLORS.soft};
          padding: 12px 8px;
          font-size: 13px;
          font-weight: 900;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 5px;
          min-width: 0;
          white-space: nowrap;
          word-break: keep-all;
          line-height: 1;
        }

        .bottomStepNav button span {
          display: inline-grid;
          place-items: center;
          width: 18px;
          height: 18px;
          flex: 0 0 18px;
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.08);
          font-size: 11px;
        }

        .bottomStepNav .bottomStepButtonActive {
          border-color: rgba(238, 224, 197, 0.58);
          background: rgba(238, 224, 197, 0.16);
          color: ${COLORS.cream};
        }

        .sheetOverlay {
          position: fixed;
          inset: 0;
          z-index: 80;
          background: rgba(0, 0, 0, 0.46);
          display: flex;
          align-items: flex-end;
          justify-content: center;
          padding: 6px 10px 10px;
        }

        .filmSheet {
          width: min(760px, 100%);
          height: min(92vh, 880px);
          max-height: min(92vh, 880px);
          overflow: hidden;
          border-radius: 28px;
          background: rgba(8, 5, 62, 0.98);
          border: 1px solid rgba(238, 224, 197, 0.22);
          box-shadow: 0 -20px 70px rgba(0, 0, 0, 0.45);
          padding: 12px;
          display: flex;
          flex-direction: column;
        }

        .sheetHandle {
          width: 44px;
          height: 5px;
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.28);
          margin: 0 auto 8px;
        }

        .sheetHeader {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 12px;
          margin-bottom: 12px;
        }

        .sheetHeader h3 {
          margin: 0;
          font-size: 20px;
          letter-spacing: -0.03em;
        }

        .sheetHeader p {
          margin: 4px 0 0;
          color: ${COLORS.soft};
          font-size: 12px;
          line-height: 1.35;
        }

        .sheetCloseButton {
          flex-shrink: 0;
          border: 1px solid ${COLORS.line};
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.06);
          color: ${COLORS.white};
          padding: 9px 12px;
          font-size: 13px;
          font-weight: 900;
          cursor: pointer;
        }

        .palettePanel {
          border-radius: 18px;
          padding: 9px;
          background: rgba(255, 255, 255, 0.045);
          border: 1px solid ${COLORS.line};
          margin-bottom: 9px;
          display: grid;
          gap: 8px;
        }

        .paletteGroup {
          display: grid;
          gap: 6px;
        }

        .paletteHeaderRow {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
        }

        .paletteHeaderRow span {
          color: ${COLORS.cream};
          font-size: 12px;
          font-weight: 900;
        }

        .paletteHeaderRow em {
          color: ${COLORS.soft};
          font-size: 11px;
          font-style: normal;
          font-weight: 800;
        }

        .paletteChipRow,
        .paletteColorRow {
          display: flex;
          gap: 6px;
          overflow-x: auto;
          padding-bottom: 1px;
          -webkit-overflow-scrolling: touch;
        }

        .paletteChip,
        .paletteColorChip,
        .paletteResetButton {
          flex: 0 0 auto;
          border: 1px solid ${COLORS.line};
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.06);
          color: ${COLORS.white};
          font-size: 12px;
          font-weight: 900;
          cursor: pointer;
          white-space: nowrap;
        }

        .paletteChip {
          padding: 7px 10px;
        }

        .paletteChipActive,
        .paletteColorChipActive {
          border-color: rgba(238, 224, 197, 0.92);
          background: ${COLORS.cream};
          color: ${COLORS.bg};
          box-shadow: 0 0 0 2px rgba(238, 224, 197, 0.22), 0 8px 16px rgba(0, 0, 0, 0.22);
        }

        .paletteResetButton {
          padding: 6px 9px;
          color: ${COLORS.cream};
        }

        .paletteColorChip {
          position: relative;
          min-height: 32px;
          padding: 5px 8px 5px 6px;
          display: inline-flex;
          align-items: center;
          gap: 6px;
          transition: transform 0.14s ease, box-shadow 0.14s ease, background 0.14s ease, border-color 0.14s ease;
        }

        .paletteColorChip i {
          width: 16px;
          height: 16px;
          border-radius: 999px;
          border: 1px solid rgba(255, 255, 255, 0.35);
          box-shadow: inset 0 0 0 1px rgba(0, 0, 0, 0.08);
        }

        .paletteColorChipActive {
          transform: translateY(-1px);
        }

        .paletteColorChipActive i {
          border: 2px solid ${COLORS.bg};
          box-shadow: 0 0 0 2px rgba(255, 255, 255, 0.92), inset 0 0 0 1px rgba(0, 0, 0, 0.10);
        }

        .paletteColorCheck {
          position: absolute;
          right: -4px;
          top: -5px;
          width: 18px;
          height: 18px;
          border-radius: 999px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          background: ${COLORS.bg};
          border: 1px solid rgba(238, 224, 197, 0.95);
          color: ${COLORS.cream};
          font-size: 12px;
          font-weight: 1000;
          line-height: 1;
        }

        .paletteColorChipIconOnly {
          width: 34px;
          padding: 5px;
          justify-content: center;
        }

        .paletteColorChipIconOnly i {
          width: 20px;
          height: 20px;
        }

        .sheetSearchForm {
          display: flex;
          gap: 7px;
          margin-bottom: 9px;
        }

        .searchInput {
          min-width: 0;
          flex: 1;
          border-radius: 13px;
          border: 1px solid ${COLORS.line};
          background: rgba(255, 255, 255, 0.06);
          color: ${COLORS.white};
          padding: 8px 10px;
          font-size: 14px;
          outline: none;
        }

        .searchInput::placeholder {
          color: rgba(255, 255, 255, 0.42);
        }

        .searchButton {
          border: none;
          border-radius: 13px;
          padding: 0 13px;
          background: ${COLORS.cream};
          color: ${COLORS.creamText};
          font-size: 13px;
          font-weight: 900;
          cursor: pointer;
          white-space: nowrap;
          min-height: 36px;
        }

        .sheetLoadingText {
          color: ${COLORS.cream};
          font-size: 13px;
          font-weight: 900;
          margin: 0 0 10px;
        }

        .sheetFilmSkeletonItem,
        .sheetFilmSkeletonThumb,
        .sheetFilmSkeletonLine {
          position: relative;
          overflow: hidden;
        }

        .sheetFilmSkeletonItem::after,
        .sheetFilmSkeletonThumb::after,
        .sheetFilmSkeletonLine::after {
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
          animation: sheetShimmer 1.25s infinite;
        }

        .sheetFilmSkeletonItem {
          border: 1px solid ${COLORS.line};
          border-radius: 18px;
          background: rgba(255, 255, 255, 0.045);
          padding: 8px;
        }

        .sheetFilmSkeletonThumb {
          width: 100%;
          aspect-ratio: 1 / 1;
          border-radius: 14px;
          background: rgba(255, 255, 255, 0.09);
        }

        .sheetFilmSkeletonLine {
          height: 12px;
          margin-top: 8px;
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.09);
        }

        .sheetFilmSkeletonLine.short {
          width: 62%;
          height: 10px;
        }

        @keyframes sheetShimmer {
          100% {
            transform: translateX(100%);
          }
        }

        .sheetFilmGrid {
          flex: 1;
          min-height: 0;
          overflow-y: auto;
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          align-content: start;
          align-items: start;
          grid-auto-rows: max-content;
          gap: 10px;
          padding: 2px 2px 8px;
        }

        .sheetFilmItem {
          border: 1px solid ${COLORS.line};
          border-radius: 18px;
          background: rgba(255, 255, 255, 0.045);
          color: ${COLORS.white};
          padding: 8px;
          text-align: left;
          cursor: pointer;
          align-self: start;
          height: auto;
        }

        .sheetFilmItemActive {
          border-color: rgba(238, 224, 197, 0.6);
          background: rgba(238, 224, 197, 0.14);
        }

        .sheetFilmItem:disabled {
          opacity: 0.72;
          cursor: wait;
        }

        .sheetFilmThumb {
          width: 100%;
          aspect-ratio: 1 / 1;
          border-radius: 13px;
          overflow: hidden;
          border: 1px solid ${COLORS.line};
          background: rgba(255, 255, 255, 0.06);
          margin-bottom: 8px;
        }

        .sheetFilmThumb img {
          width: 100%;
          height: 100%;
          display: block;
          object-fit: cover;
        }

        .sheetFilmName {
          color: ${COLORS.cream};
          font-size: 12px;
          line-height: 1.28;
          font-weight: 900;
          min-height: 31px;
          overflow: hidden;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          word-break: keep-all;
        }

        .sheetFilmMeta {
          color: ${COLORS.soft};
          font-size: 11px;
          line-height: 1.3;
          margin-top: 4px;
          overflow: hidden;
          white-space: nowrap;
          text-overflow: ellipsis;
        }

        .emptyFilmBox {
          border-radius: 18px;
          padding: 18px;
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid ${COLORS.line};
          color: ${COLORS.soft};
          font-size: 14px;
          line-height: 1.7;
        }

        @media (max-width: 640px) {
          .contractorIntroTop {
            gap: 14px;
          }

          .contractorLogoBox {
            width: min(320px, 100%);
            min-height: 0;
            border-radius: 0;
            overflow: hidden;
          }

          .contractorLogoBox img {
            max-width: 320px;
            max-height: 128px;
            transform: none;
          }

          .contractorContactRow {
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 8px;
          }

          .contractorContactButton {
            min-height: 44px;
            padding: 0 10px;
            font-size: 13px;
            gap: 6px;
          }

          .contractorContactIcon {
            width: 20px;
            height: 20px;
          }

          .portfolioPhotoGrid {
            grid-template-columns: 1fr;
          }

          .portfolioPhotoCard,
          .portfolioPhotoCard:first-child {
            min-height: 210px;
          }

          .bottomStepNavFour {
            width: min(500px, calc(100% - 10px));
            gap: 4px;
            padding: 6px;
          }

          .customerIntroSkeleton {
            gap: 10px;
            padding: 0 0 18px;
          }

          .introSkeletonHero,
          .introSkeletonProfile,
          .introSkeletonPortfolio {
            border-radius: 22px;
            padding: 16px;
          }

          .introSkeletonProfile {
            grid-template-columns: 72px minmax(0, 1fr);
            gap: 12px;
          }

          .introSkeletonLogo {
            width: 72px;
            height: 72px;
            border-radius: 20px;
          }

          .introSkeletonTitle {
            height: 30px;
          }

          .introSkeletonText {
            height: 14px;
            margin-top: 11px;
          }

          .introSkeletonButtons {
            grid-template-columns: 1fr;
            gap: 8px;
            margin-top: 14px;
          }

          .introSkeletonButton {
            height: 42px;
          }

          .introSkeletonPhotoGrid {
            grid-template-columns: 1fr;
          }

          .introSkeletonPhotoLarge,
          .introSkeletonPhoto {
            min-height: 178px;
            grid-row: auto;
          }

          .pageWrap {
            padding-bottom: 86px;
          }

          .pageInner {
            padding: 8px 10px 24px;
          }

          .backButton {
            margin: 8px 0 8px 10px;
            padding: 9px 13px;
            font-size: 13px;
            top: 8px;
          }

          .heroCard {
            border-radius: 22px;
            padding: 12px;
            margin-bottom: 10px;
          }

          .stepBadge {
            font-size: 12px;
            padding: 6px 10px;
            margin-bottom: 8px;
          }

          .pageTitle {
            font-size: 25px;
          }

          .heroText {
            font-size: 13px;
            line-height: 1.55;
            margin-top: 8px;
          }

          .linkCard {
           width: auto;
            min-width: 0;
            max-width: 100%;
            padding: 10px 14px;
            border-radius: 18px;
          }

           .linkCardText {
            font-size: 13px;
            line-height: 1.4;
          }

          .spaceSelectCard,
          .applyCard,
          .decisionCard {
            border-radius: 22px;
            padding: 12px;
          }

          .sectionHeader,
          .applyTopRow {
            margin-bottom: 10px;
          }

          .sectionTitle,
          .spaceTitle {
            font-size: 22px;
          }

          .spaceCount,
          .changeSpaceButton {
            font-size: 12px;
            padding: 8px 10px;
          }

          .spaceGrid {
            grid-template-columns: 1fr;
            gap: 10px;
          }

          .spaceCard {
            border-radius: 20px;
            padding: 8px;
          }

          .spaceThumb {
            border-radius: 16px;
          }

          .spaceName {
            font-size: 16px;
          }

          .previewViewport {
            border-radius: 20px;
            min-height: 0;
          }

          .sceneStage {
            border-radius: 20px;
          }

          .zoneApplyGrid {
            gap: 7px;
            margin-top: 10px;
          }

          .zoneApplyButton {
            border-radius: 16px;
            padding: 10px 7px;
            min-height: 64px;
            text-align: center;
          }

          .zoneApplyButton span {
            font-size: 13px;
          }

          .zoneApplyButton strong {
            font-size: 10.5px;
            -webkit-line-clamp: 2;
          }

          .applyActionRow {
            gap: 7px;
            overflow-x: auto;
            flex-wrap: nowrap;
          }

          .applyActionRow .smallActionButton {
            white-space: nowrap;
            font-size: 12px;
            padding: 8px 10px;
          }

          .applyWarningText {
            margin: 10px 2px 7px;
            font-size: 12px;
            line-height: 1.45;
          }

          .applyDecisionRow {
            margin-top: 7px;
          }

          .decisionNextButton {
            border-radius: 14px;
            padding: 13px 14px;
            font-size: 15px;
          }

          .decisionSummary {
            border-radius: 18px;
            padding: 11px;
            margin-top: 10px;
          }

          .decisionSpaceName {
            font-size: 16px;
            margin-bottom: 8px;
          }

          .decisionZoneList {
            gap: 7px;
          }

          .decisionZoneItem {
            align-items: flex-start;
            border-radius: 14px;
            padding: 10px;
          }

          .decisionZoneItem span {
            font-size: 12px;
          }

          .decisionZoneItem strong {
            font-size: 12px;
            line-height: 1.35;
            max-width: 68%;
          }

          .decisionActionGrid {
            grid-template-columns: 1fr;
            gap: 10px;
            margin-top: 10px;
          }

          .decisionActionCard {
            position: relative;
            border-radius: 18px;
            padding: 13px 13px 13px 54px;
            min-height: 0;
          }

          .decisionActionIcon {
            position: absolute;
            left: 13px;
            top: 13px;
            width: 28px;
            height: 28px;
            margin-bottom: 0;
            font-size: 12px;
          }

          .decisionActionCard h3 {
            margin: 0 0 5px;
            font-size: 16px;
            line-height: 1.32;
          }

          .decisionActionCard p {
            margin: 0 0 10px;
            font-size: 12.5px;
            line-height: 1.55;
          }

          .primaryDecisionButton {
            width: 100%;
            min-height: 40px;
            border-radius: 14px;
            font-size: 13px;
            padding: 0 12px;
          }

          .decisionMessage {
            margin-top: 7px;
            font-size: 11.5px;
          }

          .storeInfoBox {
            border-radius: 14px;
            padding: 10px;
            gap: 3px;
          }

        .storeInfoBox strong {
          color: ${COLORS.cream};
          font-size: 13px;
        }

        .storeInfoBox span {
          color: ${COLORS.white};
          font-size: 12px;
          line-height: 1.45;
        }

        .bottomStepNav {
            bottom: 10px;
            width: calc(100% - 22px);
            border-radius: 20px;
            padding: 7px;
          }

          .bottomStepNav button {
            border-radius: 15px;
            padding: 10px 4px;
            font-size: 11px;
            gap: 4px;
          }

          .bottomStepNav button span {
            width: 17px;
            height: 17px;
            flex-basis: 17px;
            font-size: 10px;
          }

          .sheetOverlay {
            padding: 8px;
          }

          .filmSheet {
            height: 94vh;
            max-height: 94vh;
            border-radius: 24px;
            padding: 10px;
          }

          .sheetHeader h3 {
            font-size: 19px;
          }

          .sheetHeader p {
            font-size: 12px;
          }

          .palettePanel {
            border-radius: 18px;
            padding: 9px;
            gap: 9px;
          }

          .paletteChip {
            padding: 7px 10px;
            font-size: 11.5px;
          }

          .paletteColorChip {
            min-height: 32px;
            font-size: 11.5px;
          }

          .sheetSearchForm {
            gap: 7px;
          }

          .searchInput {
            height: 42px;
            border-radius: 14px;
            padding: 9px 11px;
            font-size: 14px;
          }

          .searchButton {
            min-height: 42px;
            border-radius: 14px;
            padding: 0 13px;
          }

          .sheetFilmGrid {
            grid-template-columns: repeat(3, minmax(0, 1fr));
            gap: 8px;
          }

          .sheetFilmItem,
          .sheetFilmSkeletonItem {
            border-radius: 16px;
            padding: 7px;
          }

          .sheetFilmSkeletonThumb {
            border-radius: 12px;
          }

          .sheetFilmThumb {
            border-radius: 12px;
            margin-bottom: 6px;
          }

          .sheetFilmName {
            font-size: 11px;
            min-height: 29px;
          }

          .sheetFilmMeta {
            font-size: 10px;
          }
        }
      `}</style>
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
