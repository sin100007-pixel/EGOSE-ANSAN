"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import SimulatorLinkTabs from "./SimulatorLinkTabs";
import SimulatorFilmSearchPanel from "./shared/SimulatorFilmSearchPanel";
import SimulatorFilmResultCard from "./shared/SimulatorFilmResultCard";
import SimulatorSamplePreview from "./shared/SimulatorSamplePreview";
import SimulatorSelectedFilmList from "./shared/SimulatorSelectedFilmList";
import {
  DEFAULT_PALETTE_COLOR_OPTIONS,
  DEFAULT_PALETTE_MAIN_OPTIONS,
  orderPaletteValues,
  uniqueClean,
} from "./shared/SimulatorPaletteFilter";
import type { SimulatorFilm, SimulatorSpace } from "../types";

type BootstrapResponse = {
  spaces?: SimulatorSpace[];
  films?: SimulatorFilm[];
};

type FilmPreset = {
  id: string;
  name: string;
  description: string | null;
  item_count: number;
};

type PresetsResponse = {
  items?: FilmPreset[];
};

type SearchOptions = {
  query?: string;
  silent?: boolean;
  paletteMain?: string;
  paletteSub?: string;
  paletteColors?: string[];
  updateFacets?: boolean;
  recommended?: boolean;
};

type MaskZoneDefinition = {
  key: string;
  label: string;
  mask_url: string;
  patternSize?: number;
};

type LinkResult = {
  url: string;
  query_url?: string;
  path?: string;
  link?: {
    token: string;
    installer_name: string | null;
    customer_name: string | null;
    expires_at: string;
    film_scope: string;
    preset_id?: string | null;
  };
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

const CUSTOMER_SHARE_MESSAGE = [
  "필름 시뮬레이터, 시뮬봇!",
  "",
  "대표적인 공간 이미지에 500여가지 필름을 적용해, 조합에 따른 뉘앙스를 보여드립니다.",
  "",
  "*Chrome(크롬브라우저)에 최적화되어 있습니다.",
  "",
  "아래 링크를 눌러 실행해주세요.",
].join("\n");

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

function getSpaceThumb(space: SimulatorSpace) {
  return space.thumbnail_url || space.overlay_image_url || space.base_image_url || "";
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

function formatDate(value?: string | null) {
  if (!value) return "";
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

export default function SimulatorLinkBuilder() {
  const router = useRouter();
  const searchRequestRef = useRef(0);
  const [isDashboardMoving, setIsDashboardMoving] = useState(false);

  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");
  const [copyMessage, setCopyMessage] = useState("");

  const [spaces, setSpaces] = useState<SimulatorSpace[]>([]);
  const [selectedSpaceIds, setSelectedSpaceIds] = useState<string[]>([]);

  const [installerName, setInstallerName] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [memo, setMemo] = useState("");
  const [expiresInDays, setExpiresInDays] = useState(7);

  const [filmScope, setFilmScope] = useState<"all" | "custom" | "preset">("all");
  const [presets, setPresets] = useState<FilmPreset[]>([]);
  const [selectedPresetId, setSelectedPresetId] = useState("");
  const [filmQuery, setFilmQuery] = useState("");
  const [filmLoading, setFilmLoading] = useState(false);
  const [filmSearchResults, setFilmSearchResults] = useState<SimulatorFilm[]>([]);
  const [selectedFilms, setSelectedFilms] = useState<SimulatorFilm[]>([]);
  const [previewSampleFilm, setPreviewSampleFilm] = useState<SimulatorFilm | null>(null);

  const [paletteOpen, setPaletteOpen] = useState(false);
  const [selectedPaletteMain, setSelectedPaletteMain] = useState("");
  const [selectedPaletteSub, setSelectedPaletteSub] = useState("");
  const [selectedPaletteColors, setSelectedPaletteColors] = useState<string[]>([]);
  const [paletteMainOptions, setPaletteMainOptions] = useState<string[]>(DEFAULT_PALETTE_MAIN_OPTIONS);
  const [paletteSubOptions, setPaletteSubOptions] = useState<string[]>([]);
  const [paletteColorOptions, setPaletteColorOptions] = useState<string[]>(DEFAULT_PALETTE_COLOR_OPTIONS);

  const [result, setResult] = useState<LinkResult | null>(null);


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

  const selectedFilmIds = useMemo(() => {
    return new Set(selectedFilms.map((film) => film.id));
  }, [selectedFilms]);

  const activePaletteCount = useMemo(() => {
    return [selectedPaletteMain, selectedPaletteSub].filter(Boolean).length + selectedPaletteColors.length;
  }, [selectedPaletteMain, selectedPaletteSub, selectedPaletteColors.length]);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError("");

      try {
        const [whoamiRes, bootstrapRes, presetsRes] = await Promise.all([
          fetch("/api/whoami", { cache: "no-store" }),
          fetch("/api/simulator/bootstrap", { cache: "no-store" }),
          fetch("/api/simulator/presets", { cache: "no-store" }),
        ]);

        const whoami = await whoamiRes.json();
        const bootstrap = (await bootstrapRes.json()) as BootstrapResponse;
        const presetsJson = (await presetsRes.json()) as PresetsResponse;

        if (cancelled) return;

        if (whoami?.name) {
          setInstallerName(whoami.name);
        }

        const nextSpaces = Array.isArray(bootstrap.spaces) ? bootstrap.spaces : [];
        const nextFilms = Array.isArray(bootstrap.films) ? bootstrap.films : [];
        const nextPresets = Array.isArray(presetsJson.items) ? presetsJson.items : [];

        setSpaces(nextSpaces);
        setSelectedSpaceIds(nextSpaces[0]?.id ? [nextSpaces[0].id] : []);
        setFilmSearchResults(nextFilms);
        setPresets(nextPresets);
        setSelectedPresetId(nextPresets[0]?.id || "");

        void searchFilms({ query: "", silent: false, updateFacets: true, recommended: true });
      } catch {
        if (!cancelled) {
          setError("링크 생성 정보를 불러오지 못했습니다.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, []);

  const toggleSpace = (spaceId: string) => {
    setSelectedSpaceIds((prev) => {
      if (prev.includes(spaceId)) {
        return prev.filter((id) => id !== spaceId);
      }
      return [...prev, spaceId];
    });
  };

  const addFilm = (film: SimulatorFilm) => {
    setSelectedFilms((prev) => {
      if (prev.some((item) => item.id === film.id)) return prev;
      return [...prev, film];
    });
  };

  const removeFilm = (filmId: number) => {
    setSelectedFilms((prev) => prev.filter((film) => film.id !== filmId));
  };

  const toggleSamplePreview = (film: SimulatorFilm) => {
    if (!film.sample_url) return;

    setPreviewSampleFilm((prev) => (prev?.id === film.id ? null : film));
  };

  const getPaletteColorOptions = (colors: string[], paletteMain = "", paletteSub = "") => {
    if (!paletteMain && !paletteSub) {
      return orderPaletteValues(
        Array.from(new Set([...DEFAULT_PALETTE_COLOR_OPTIONS, ...colors])),
        DEFAULT_PALETTE_COLOR_OPTIONS
      );
    }

    return colors.length > 0
      ? orderPaletteValues(colors, DEFAULT_PALETTE_COLOR_OPTIONS)
      : DEFAULT_PALETTE_COLOR_OPTIONS;
  };

  const updatePaletteFacets = (json: any, paletteMain = selectedPaletteMain, paletteSub = selectedPaletteSub) => {
    const mains = uniqueClean(json?.facets?.palette_mains);
    const subs = uniqueClean(json?.facets?.palette_subs);
    const colors = uniqueClean(json?.facets?.palette_colors);

    if (mains.length > 0) {
      setPaletteMainOptions(orderPaletteValues(mains, DEFAULT_PALETTE_MAIN_OPTIONS));
    }

    setPaletteSubOptions(subs);
    setPaletteColorOptions(getPaletteColorOptions(colors, paletteMain, paletteSub));
  };

  const searchFilms = async (options: SearchOptions = {}) => {
    const requestId = searchRequestRef.current + 1;
    searchRequestRef.current = requestId;

    const q = options.query !== undefined ? options.query.trim() : filmQuery.trim();
    const paletteMain = options.paletteMain !== undefined ? options.paletteMain : selectedPaletteMain;
    const paletteSub = options.paletteSub !== undefined ? options.paletteSub : selectedPaletteSub;
    const paletteColors = (options.paletteColors !== undefined ? options.paletteColors : selectedPaletteColors).slice(0, 1);
    const updateFacets = options.updateFacets === true;
    const silent = options.silent === true;
    const useRecommended = options.recommended === true;

    if (!silent) {
      setFilmLoading(true);
      setError("");
    }

    try {
      const params = new URLSearchParams();
      if (q) params.set("q", q);
      if (useRecommended) params.set("recommended", "1");
      if (paletteMain) params.set("palette_main", paletteMain);
      if (paletteSub) params.set("palette_sub", paletteSub);
      paletteColors.forEach((color) => params.append("palette_color", color));
      if (!updateFacets) params.set("skip_facets", "1");

      const res = await fetch(`/api/simulator/films?${params.toString()}`, {
        cache: "no-store",
      });
      const json = await res.json();

      if (requestId !== searchRequestRef.current) return;

      if (!res.ok) {
        if (!silent) setError(json.error || "필름 검색 중 오류가 발생했습니다.");
        return;
      }

      setFilmSearchResults(Array.isArray(json.items) ? json.items : []);
      if (updateFacets) updatePaletteFacets(json, paletteMain, paletteSub);
    } catch {
      if (requestId === searchRequestRef.current && !silent) {
        setError("필름 검색 중 오류가 발생했습니다.");
      }
    } finally {
      if (requestId === searchRequestRef.current && !silent) {
        setFilmLoading(false);
      }
    }
  };

  const openCustomFilmScope = () => {
    setFilmScope("custom");

    if (filmSearchResults.length === 0 && !filmLoading) {
      void searchFilms({
        query: "",
        paletteMain: "",
        paletteSub: "",
        paletteColors: [],
        updateFacets: true,
        recommended: true,
      });
    }
  };

  const resetPaletteFilters = () => {
    setSelectedPaletteMain("");
    setSelectedPaletteSub("");
    setSelectedPaletteColors([]);
    void searchFilms({ paletteMain: "", paletteSub: "", paletteColors: [], updateFacets: true, recommended: true });
  };

  const handlePaletteMainClick = (value: string) => {
    const nextMain = selectedPaletteMain === value ? "" : value;

    setSelectedPaletteMain(nextMain);
    setSelectedPaletteSub("");
    setSelectedPaletteColors([]);

    void searchFilms({
      paletteMain: nextMain,
      paletteSub: "",
      paletteColors: [],
      updateFacets: true,
    });
  };

  const handlePaletteSubClick = (value: string) => {
    const nextSub = selectedPaletteSub === value ? "" : value;

    setSelectedPaletteSub(nextSub);
    setSelectedPaletteColors([]);

    void searchFilms({
      paletteMain: selectedPaletteMain,
      paletteSub: nextSub,
      paletteColors: [],
      updateFacets: true,
    });
  };

  const handlePaletteColorClick = (value: string) => {
    const nextColors = selectedPaletteColors.includes(value) ? [] : [value];

    setSelectedPaletteColors(nextColors);

    void searchFilms({
      paletteMain: selectedPaletteMain,
      paletteSub: selectedPaletteSub,
      paletteColors: nextColors,
      updateFacets: false,
    });
  };

  const createLink = async () => {
    setCreating(true);
    setError("");
    setCopyMessage("");
    setResult(null);

    try {
      const res = await fetch("/api/simulator/links", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          installer_name: installerName,
          customer_name: customerName,
          memo,
          expires_in_days: expiresInDays,
          space_ids: selectedSpaceIds,
          film_scope: filmScope,
          preset_id: filmScope === "preset" ? selectedPresetId : null,
          product_ids:
            filmScope === "custom"
              ? selectedFilms.map((film) => film.id)
              : [],
        }),
      });

      const json = await res.json();

      if (!res.ok) {
        setError(json.error || "고객 링크를 생성하지 못했습니다.");
        return;
      }

      setResult(json as LinkResult);
    } catch {
      setError("고객 링크를 생성하지 못했습니다.");
    } finally {
      setCreating(false);
    }
  };

  const copyShareMessage = async (url: string) => {
    setCopyMessage("");

    const message = `${CUSTOMER_SHARE_MESSAGE}\n\n${url}`;

    try {
      await navigator.clipboard.writeText(message);
      setCopyMessage("안내 문구와 링크를 복사했습니다.");
    } catch {
      setCopyMessage("복사에 실패했습니다. 링크를 길게 눌러 직접 복사해주세요.");
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
        <button type="button" onClick={goToDashboard} className="backButton" disabled={isDashboardMoving}>
          ← 대시보드
        </button>

        <section className="heroCard">
          <div className="stepBadge">고객 링크 생성</div>
          <h1>시뮬레이션 링크 만들기</h1>
          <p>
            고객에게 보낼 1일 / 3일 / 7일짜리 시뮬레이터 링크를 만듭니다. 공간과 필름 범위를 링크별로 제한할 수 있습니다.
          </p>
        </section>

        {loading ? (
          <div className="layout">
            <section className="panel formPanel pageSkeletonPanel">
              <div className="sectionTitleRow">
                <div>
                  <h2>링크 정보 준비 중</h2>
                  <p>공간과 필름 설정을 불러오고 있습니다.</p>
                </div>
                <span>준비 중</span>
              </div>

              <div className="skeletonFieldGrid">
                {Array.from({ length: 4 }).map((_, index) => (
                  <div key={`link-field-skeleton-${index}`} className="skeletonFieldBlock">
                    <div className="skeletonLabel" />
                    <div className="skeletonInput" />
                  </div>
                ))}
              </div>

              <div className="skeletonSection">
                <div className="skeletonSectionTitle" />
                <div className="skeletonSpaceGrid">
                  {Array.from({ length: 2 }).map((_, index) => (
                    <div key={`space-skeleton-${index}`} className="skeletonSpaceCard">
                      <div className="skeletonWideThumb" />
                      <div className="skeletonLine" />
                      <div className="skeletonLine short" />
                    </div>
                  ))}
                </div>
              </div>

              <div className="skeletonSection">
                <div className="skeletonSectionTitle" />
                <div className="skeletonScopeStack">
                  <div className="skeletonScopeButton" />
                  <div className="skeletonScopeButton" />
                  <div className="skeletonScopeButton active" />
                </div>
              </div>
            </section>

            <aside className="panel resultPanel pageSkeletonPanel">
              <h2>생성 결과</h2>
              <p className="expiresText">링크 생성 화면을 준비하는 중입니다.</p>
              <div className="skeletonResultBox" />
              <div className="skeletonResultActions">
                <div className="skeletonMiniButton" />
                <div className="skeletonMiniButton" />
              </div>
              <div className="skeletonSummaryRows">
                <div />
                <div />
                <div />
              </div>
            </aside>
          </div>
        ) : (
          <div className="layout">
            <section className="panel formPanel">
              <div className="fieldGrid">
                <label>
                  <span>시공자 이름</span>
                  <input
                    value={installerName}
                    onChange={(event) => setInstallerName(event.target.value)}
                    placeholder="예: 김동진"
                  />
                </label>

                <label>
                  <span>고객 이름</span>
                  <input
                    value={customerName}
                    onChange={(event) => setCustomerName(event.target.value)}
                    placeholder="예: 고객 A"
                  />
                </label>

                <label>
                  <span>유효기간</span>
                  <select
                    value={expiresInDays}
                    onChange={(event) => setExpiresInDays(Number(event.target.value))}
                  >
                    <option value={1}>1일</option>
                    <option value={3}>3일</option>
                    <option value={7}>7일</option>
                  </select>
                </label>

                <label>
                  <span>메모</span>
                  <input
                    value={memo}
                    onChange={(event) => setMemo(event.target.value)}
                    placeholder="내부 확인용 메모"
                  />
                </label>
              </div>

              <div className="sectionBlock">
                <div className="sectionTitleRow">
                  <div>
                    <h2>공간 제한</h2>
                    <p>고객에게 보여줄 공간을 선택합니다.</p>
                  </div>
                  <span>{selectedSpaceIds.length}개 선택</span>
                </div>

                <div className="spaceGrid">
                  {spaces.length > 0 ? (
                    spaces.map((space) => {
                      const active = selectedSpaceIds.includes(space.id);
                      const thumb = getSpaceThumb(space);
                      const thumbZones = readMaskZones(space);
                      const thumbAspectRatio = readPreviewAspectRatio(space);
                      const hasSceneThumb = Boolean(space.base_image_url || space.overlay_image_url);

                      return (
                        <button
                          key={space.id}
                          type="button"
                          onClick={() => toggleSpace(space.id)}
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
                            ) : thumb ? (
                              <img src={thumb} alt={space.name} />
                            ) : (
                              <div className="spaceThumbEmpty">이미지 준비중</div>
                            )}
                          </div>
                          <div className="spaceName">{space.name}</div>
                          <div className="spaceState">{active ? "선택됨" : "선택 안 됨"}</div>
                        </button>
                      );
                    })
                  ) : (
                    <div className="emptyBox">등록된 공간이 없습니다.</div>
                  )}
                </div>
              </div>

              <div className="sectionBlock">
                <div className="sectionTitleRow">
                  <div>
                    <h2>필름 제한</h2>
                    <p>전체 삼성필름, 직접 선택한 필름, 또는 미리 만들어둔 프리셋 중에서 고를 수 있습니다.</p>
                  </div>
                </div>

                <div className="scopeRow">
                  <button
                    type="button"
                    onClick={() => setFilmScope("all")}
                    className={filmScope === "all" ? "scopeActive" : ""}
                  >
                    삼성필름 전체 허용
                  </button>

                  <button
                    type="button"
                    onClick={() => setFilmScope("preset")}
                    className={filmScope === "preset" ? "scopeActive" : ""}
                  >
                    프리셋으로 제한
                  </button>

                  <button
                    type="button"
                    onClick={openCustomFilmScope}
                    className={filmScope === "custom" ? "scopeActive" : ""}
                  >
                    직접 선택
                  </button>
                </div>

                {filmScope === "preset" ? (
                  <div className="presetSelectBox">
                    {presets.length > 0 ? (
                      <>
                        <label>
                          <span>사용할 프리셋</span>
                          <select
                            value={selectedPresetId}
                            onChange={(event) => setSelectedPresetId(event.target.value)}
                          >
                            {presets.map((preset) => (
                              <option key={preset.id} value={preset.id}>
                                {preset.name} · 필름 {preset.item_count}개
                              </option>
                            ))}
                          </select>
                        </label>
                        <div className="hintBox">
                          선택한 프리셋에 담긴 필름만 고객 화면의 검색/색상 팔레트/시뮬레이션에 표시됩니다.
                        </div>
                      </>
                    ) : (
                      <div className="hintBox">
                        아직 만든 프리셋이 없습니다. 하단의 프리셋 메뉴에서 먼저 프리셋을 만들어주세요.
                        <br />
                        <a href="/simulator/presets">프리셋 만들러 가기</a>
                      </div>
                    )}
                  </div>
                ) : null}

                {filmScope === "custom" ? (
                  <SimulatorFilmSearchPanel
                    className="customFilmBox"
                    query={filmQuery}
                    loading={filmLoading}
                    placeholder="예: 122, SG179, 화이트"
                    onQueryChange={setFilmQuery}
                    onSearch={() => void searchFilms()}
                    palette={{
                      open: paletteOpen,
                      activeCount: activePaletteCount,
                      selectedMain: selectedPaletteMain,
                      selectedSub: selectedPaletteSub,
                      selectedColors: selectedPaletteColors,
                      mainOptions: paletteMainOptions,
                      subOptions: paletteSubOptions,
                      colorOptions: paletteColorOptions,
                      onToggleOpen: () => setPaletteOpen((prev) => !prev),
                      onClose: () => setPaletteOpen(false),
                      onReset: resetPaletteFilters,
                      onMainClick: handlePaletteMainClick,
                      onSubClick: handlePaletteSubClick,
                      onColorClick: handlePaletteColorClick,
                    }}
                  >
                    <SimulatorSelectedFilmList
                      films={selectedFilms}
                      onRemove={removeFilm}
                      emptyText="아직 선택한 필름이 없습니다. 검색 결과에서 필름을 눌러 추가하세요."
                    />

                    <div className="filmGrid" aria-busy={filmLoading}>
                      {filmLoading ? (
                        Array.from({ length: 9 }).map((_, index) => (
                          <div key={`film-skeleton-${index}`} className="filmSkeletonCard" aria-hidden="true">
                            <div className="filmSkeletonThumb" />
                            <div className="filmSkeletonLine" />
                            <div className="filmSkeletonLine short" />
                          </div>
                        ))
                      ) : filmSearchResults.length > 0 ? (
                        filmSearchResults.map((film) => {
                          const active = selectedFilmIds.has(film.id);

                          return (
                            <SimulatorFilmResultCard
                              key={film.id}
                              film={film}
                              active={active}
                              variant="link"
                              previewActive={previewSampleFilm?.id === film.id}
                              onSelect={addFilm}
                              onPreview={toggleSamplePreview}
                              selectTitle={active ? "이미 선택된 필름입니다" : "누르면 링크 제한 필름에 담깁니다"}
                            />
                          );
                        })
                      ) : null}
                    </div>

                    <SimulatorSamplePreview
                      film={previewSampleFilm}
                      onClose={() => setPreviewSampleFilm(null)}
                    />
                  </SimulatorFilmSearchPanel>
                ) : null}
              </div>

              {error ? <div className="errorBox">{error}</div> : null}

              <button
                type="button"
                onClick={createLink}
                disabled={creating}
                className="createButton"
              >
                {creating ? "링크 생성 중..." : "고객 링크 생성"}
              </button>
            </section>

            <aside className="panel resultPanel">
              <h2>생성 결과</h2>

              {result?.url ? (
                <div className="resultBox">
                  <div className="resultLabel">고객에게 보낼 링크</div>
                  <div className="urlBox">{result.url}</div>

                  <div className="resultActions">
                    <button type="button" onClick={() => copyShareMessage(result.url)}>
                      링크 복사
                    </button>
                    <a href={result.url} target="_blank" rel="noreferrer">
                      열어보기
                    </a>
                  </div>

                  {result.link?.expires_at ? (
                    <div className="expiresText">
                      만료: {formatDate(result.link.expires_at)}
                    </div>
                  ) : null}

                  {copyMessage ? <div className="copyMessage">{copyMessage}</div> : null}
                </div>
              ) : (
                <div className="hintBox">
                  정보를 입력하고 고객 링크를 생성하면 여기에 링크가 표시됩니다.
                </div>
              )}

              <div className="summaryBox">
                <div>
                  <span>공간</span>
                  <strong>{selectedSpaceIds.length}개</strong>
                </div>
                <div>
                  <span>필름</span>
                  <strong>
                    {filmScope === "all"
                      ? "삼성필름 전체"
                      : filmScope === "preset"
                        ? presets.find((preset) => preset.id === selectedPresetId)?.name || "프리셋 선택"
                        : `${selectedFilms.length}개`}
                  </strong>
                </div>
                <div>
                  <span>기간</span>
                  <strong>{expiresInDays}일</strong>
                </div>
              </div>
            </aside>
          </div>
        )}
      </div>

      <SimulatorLinkTabs active="new" />

      <style jsx global>{`
        .page {
          min-height: 100vh;
          padding-bottom: 96px;
          box-sizing: border-box;
          background:
            radial-gradient(circle at top left, rgba(238, 224, 197, 0.1), transparent 24%),
            radial-gradient(circle at top right, rgba(255, 255, 255, 0.08), transparent 20%),
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

        .pageInner {
          width: min(1180px, 100%);
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
        .panel {
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

        .layout {
          display: grid;
          grid-template-columns: minmax(0, 1.35fr) minmax(320px, 0.65fr);
          gap: 18px;
          align-items: start;
        }

        .pageSkeletonPanel,
        .skeletonLabel,
        .skeletonInput,
        .skeletonSectionTitle,
        .skeletonSpaceCard,
        .skeletonWideThumb,
        .skeletonLine,
        .skeletonScopeButton,
        .skeletonResultBox,
        .skeletonMiniButton,
        .skeletonSummaryRows div {
          position: relative;
          overflow: hidden;
        }

        .pageSkeletonPanel::after,
        .skeletonLabel::after,
        .skeletonInput::after,
        .skeletonSectionTitle::after,
        .skeletonSpaceCard::after,
        .skeletonWideThumb::after,
        .skeletonLine::after,
        .skeletonScopeButton::after,
        .skeletonResultBox::after,
        .skeletonMiniButton::after,
        .skeletonSummaryRows div::after {
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
          animation: pageSkeletonShimmer 1.35s infinite;
        }

        .skeletonFieldGrid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 12px;
        }

        .skeletonFieldBlock {
          display: grid;
          gap: 8px;
        }

        .skeletonLabel {
          width: 92px;
          height: 14px;
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.08);
        }

        .skeletonInput {
          height: 52px;
          border-radius: 18px;
          background: rgba(255, 255, 255, 0.08);
          border: 1px solid rgba(238, 224, 197, 0.08);
        }

        .skeletonSection {
          margin-top: 22px;
          display: grid;
          gap: 12px;
        }

        .skeletonSectionTitle {
          width: 140px;
          height: 22px;
          border-radius: 999px;
          background: rgba(238, 224, 197, 0.13);
        }

        .skeletonSpaceGrid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 10px;
        }

        .skeletonSpaceCard {
          border-radius: 20px;
          padding: 8px;
          border: 1px solid rgba(238, 224, 197, 0.12);
          background: rgba(255, 255, 255, 0.045);
        }

        .skeletonWideThumb {
          width: 100%;
          aspect-ratio: 1536 / 1024;
          border-radius: 15px;
          background: rgba(255, 255, 255, 0.09);
        }

        .skeletonLine {
          height: 12px;
          margin-top: 9px;
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.09);
        }

        .skeletonLine.short {
          width: 64%;
          height: 10px;
        }

        .skeletonScopeStack {
          display: grid;
          gap: 8px;
        }

        .skeletonScopeButton {
          height: 48px;
          border-radius: 16px;
          background: rgba(255, 255, 255, 0.07);
          border: 1px solid rgba(238, 224, 197, 0.1);
        }

        .skeletonScopeButton.active {
          background: rgba(238, 224, 197, 0.13);
        }

        .skeletonResultBox {
          height: 88px;
          border-radius: 18px;
          background: rgba(255, 255, 255, 0.06);
          border: 1px dashed rgba(238, 224, 197, 0.18);
          margin-top: 14px;
        }

        .skeletonResultActions {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 8px;
          margin-top: 14px;
        }

        .skeletonMiniButton {
          height: 42px;
          border-radius: 14px;
          background: rgba(238, 224, 197, 0.13);
          border: 1px solid rgba(238, 224, 197, 0.12);
        }

        .skeletonSummaryRows {
          display: grid;
          gap: 8px;
          margin-top: 16px;
        }

        .skeletonSummaryRows div {
          height: 42px;
          border-radius: 15px;
          background: rgba(255, 255, 255, 0.055);
          border: 1px solid rgba(238, 224, 197, 0.08);
        }

        @keyframes pageSkeletonShimmer {
          100% {
            transform: translateX(100%);
          }
        }

        .panel {
          border-radius: 28px;
          padding: 18px;
        }

        .fieldGrid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 12px;
        }

        label {
          display: grid;
          gap: 7px;
        }

        label span,
        .sectionTitleRow h2,
        .resultPanel h2 {
          color: ${COLORS.cream};
          font-weight: 900;
        }

        label span {
          font-size: 13px;
        }

        input,
        select {
          width: 100%;
          box-sizing: border-box;
          border-radius: 15px;
          border: 1px solid ${COLORS.line};
          background: rgba(255, 255, 255, 0.06);
          color: ${COLORS.white};
          padding: 12px 13px;
          font-size: 15px;
          outline: none;
        }

        select option {
          color: #111;
        }

        .sectionBlock {
          margin-top: 22px;
        }

        .sectionTitleRow {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 12px;
          margin-bottom: 12px;
        }

        .sectionTitleRow h2,
        .resultPanel h2 {
          margin: 0;
          font-size: 20px;
          letter-spacing: -0.03em;
        }

        .sectionTitleRow p {
          margin: 5px 0 0;
          color: ${COLORS.soft};
          font-size: 13px;
          line-height: 1.5;
        }

        .sectionTitleRow > span {
          border-radius: 999px;
          padding: 7px 10px;
          color: ${COLORS.cream};
          background: rgba(238, 224, 197, 0.1);
          font-size: 12px;
          font-weight: 900;
          white-space: nowrap;
        }

        .spaceGrid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
          gap: 10px;
        }

        .spaceCard,
        .filmCard {
          border: 1px solid ${COLORS.line};
          background: rgba(255, 255, 255, 0.045);
          color: ${COLORS.white};
          cursor: pointer;
          text-align: left;
        }

        .spaceCard {
          border-radius: 20px;
          padding: 8px;
        }

        .spaceCardActive,
        .filmCardActive {
          border-color: rgba(238, 224, 197, 0.58);
          background: rgba(238, 224, 197, 0.14);
        }

        .spaceThumb {
          position: relative;
          width: 100%;
          aspect-ratio: 1536 / 1024;
          overflow: hidden;
          border-radius: 15px;
          border: 1px solid ${COLORS.line};
          background: rgba(255, 255, 255, 0.06);
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
        .spaceThumbOverlayImage,
        .spaceThumb img,
        .filmThumb img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
        }

        .spaceThumbBaseImage,
        .spaceThumbOverlayImage {
          position: absolute;
          inset: 0;
        }

        .spaceThumbBaseImage {
          z-index: 1;
        }

        .spaceThumbOverlayImage {
          z-index: 3;
        }

        .spaceThumbEmpty {
          width: 100%;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: ${COLORS.soft};
          font-size: 13px;
          font-weight: 800;
        }

        .spaceName {
          color: ${COLORS.cream};
          font-size: 15px;
          font-weight: 900;
          margin: 9px 4px 4px;
        }

        .spaceState {
          color: ${COLORS.soft};
          font-size: 12px;
          font-weight: 800;
          margin: 0 4px 4px;
        }

        .scopeRow {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 8px;
        }

        .scopeRow button {
          border: 1px solid ${COLORS.line};
          border-radius: 16px;
          padding: 12px 10px;
          background: rgba(255, 255, 255, 0.05);
          color: ${COLORS.white};
          font-size: 14px;
          font-weight: 900;
          cursor: pointer;
        }

        .scopeRow .scopeActive {
          border-color: rgba(238, 224, 197, 0.6);
          background: rgba(238, 224, 197, 0.16);
          color: ${COLORS.cream};
        }

        .presetSelectBox,
        .customFilmBox {
          margin-top: 12px;
        }

        .hintBox a {
          color: ${COLORS.cream};
          font-weight: 900;
        }

        .searchRow {
          display: flex;
          gap: 8px;
          margin-bottom: 10px;
        }

        .searchRow button,
        .createButton,
        .resultActions button,
        .resultActions a,
        .smallResetButton,
        .palettePanelHeader button {
          border: none;
          border-radius: 15px;
          padding: 0 15px;
          min-height: 46px;
          background: ${COLORS.cream};
          color: ${COLORS.creamText};
          font-size: 14px;
          font-weight: 900;
          cursor: pointer;
          text-decoration: none;
          display: inline-flex;
          align-items: center;
          justify-content: center;
        }


        .smallResetButton,
        .palettePanelHeader button {
          background: rgba(255, 255, 255, 0.08);
          color: ${COLORS.white};
          border: 1px solid ${COLORS.line};
        }

        .filterToolbar {
          display: grid;
          grid-template-columns: minmax(0, 1fr) auto;
          gap: 8px;
          align-items: stretch;
          margin-bottom: 10px;
        }

        .paletteToggle {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          border: 1px solid ${COLORS.line};
          border-radius: 17px;
          background: rgba(255, 255, 255, 0.055);
          color: ${COLORS.white};
          padding: 12px 13px;
          cursor: pointer;
          text-align: left;
        }

        .paletteToggle span {
          color: ${COLORS.cream};
          font-size: 14px;
          font-weight: 900;
        }

        .paletteToggle strong {
          color: ${COLORS.soft};
          font-size: 12px;
          font-weight: 900;
        }

        .paletteToggleActive {
          border-color: rgba(238, 224, 197, 0.72);
          background: rgba(238, 224, 197, 0.12);
          box-shadow: 0 0 0 2px rgba(238, 224, 197, 0.12) inset;
        }

        .activeFilterList {
          display: flex;
          gap: 8px;
          overflow-x: auto;
          padding-bottom: 2px;
          margin-bottom: 10px;
          -webkit-overflow-scrolling: touch;
        }

        .activeFilterList button {
          flex: 0 0 auto;
          border: 1px solid rgba(238, 224, 197, 0.48);
          border-radius: 999px;
          background: rgba(238, 224, 197, 0.16);
          color: ${COLORS.cream};
          padding: 8px 11px;
          font-size: 12px;
          font-weight: 900;
          cursor: pointer;
          max-width: 220px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .palettePanel {
          border-radius: 20px;
          padding: 12px;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(238, 224, 197, 0.2);
          display: grid;
          gap: 12px;
          margin-bottom: 10px;
        }

        .palettePanelHeader {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 12px;
        }

        .palettePanelHeader strong {
          color: ${COLORS.cream};
          font-size: 15px;
        }

        .palettePanelHeader p {
          margin: 4px 0 0;
          color: ${COLORS.soft};
          font-size: 12px;
          line-height: 1.45;
          word-break: keep-all;
        }

        .palettePanelHeader button {
          flex-shrink: 0;
          padding: 8px 11px;
          border-radius: 999px;
          font-size: 12px;
        }

        .paletteGroup {
          display: grid;
          gap: 7px;
        }

        .paletteLabelRow {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
        }

        .paletteLabelRow span {
          color: ${COLORS.cream};
          font-size: 12px;
          font-weight: 900;
        }

        .paletteLabelRow em {
          color: ${COLORS.soft};
          font-size: 11px;
          font-style: normal;
          font-weight: 800;
        }

        .paletteChipRow {
          display: flex;
          gap: 6px;
          overflow-x: auto;
          padding-bottom: 1px;
          -webkit-overflow-scrolling: touch;
        }

        .paletteChip {
          flex: 0 0 auto;
          border: 1px solid ${COLORS.line};
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.06);
          color: ${COLORS.white};
          font-size: 12px;
          font-weight: 900;
          cursor: pointer;
          white-space: nowrap;
          padding: 8px 11px;
        }

        .paletteChipActive {
          border-color: rgba(238, 224, 197, 0.92);
          background: ${COLORS.cream};
          color: ${COLORS.bg};
          box-shadow: 0 0 0 2px rgba(238, 224, 197, 0.22), 0 8px 16px rgba(0, 0, 0, 0.22);
        }

        .paletteColorGrid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 7px;
        }

        .paletteColorChip {
          position: relative;
          min-width: 0;
          display: flex;
          align-items: center;
          gap: 7px;
          border: 1px solid ${COLORS.line};
          border-radius: 14px;
          background: rgba(255, 255, 255, 0.06);
          color: ${COLORS.white};
          padding: 8px 9px;
          font-size: 12px;
          font-weight: 900;
          cursor: pointer;
        }

        .paletteColorChip i {
          flex: 0 0 auto;
          width: 16px;
          height: 16px;
          border-radius: 999px;
          border: 1px solid rgba(255, 255, 255, 0.42);
          box-shadow: inset 0 0 0 1px rgba(0, 0, 0, 0.08);
        }

        .paletteColorChip span {
          min-width: 0;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .paletteColorChip b {
          position: absolute;
          right: 6px;
          top: 5px;
          width: 16px;
          height: 16px;
          border-radius: 999px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          background: ${COLORS.bg};
          color: ${COLORS.cream};
          font-size: 11px;
        }

        .paletteColorChipActive {
          border-color: rgba(238, 224, 197, 0.92);
          background: ${COLORS.cream};
          color: ${COLORS.bg};
          box-shadow: 0 0 0 2px rgba(238, 224, 197, 0.18) inset;
        }

        .paletteColorChipActive i {
          border: 2px solid ${COLORS.bg};
          box-shadow: 0 0 0 2px rgba(255, 255, 255, 0.92), inset 0 0 0 1px rgba(0, 0, 0, 0.10);
        }

        .selectedFilmList {
          display: flex;
          flex-wrap: wrap;
          gap: 7px;
          margin: 10px 0;
        }

        .selectedFilmList button {
          border: 1px solid rgba(238, 224, 197, 0.32);
          border-radius: 999px;
          padding: 7px 10px;
          background: rgba(238, 224, 197, 0.1);
          color: ${COLORS.cream};
          font-size: 12px;
          font-weight: 900;
          cursor: pointer;
        }

        .filmGrid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(110px, 1fr));
          gap: 8px;
          max-height: 430px;
          overflow-y: auto;
          padding-right: 4px;
        }

        .filmSkeletonCard,
        .filmSkeletonThumb,
        .filmSkeletonLine {
          position: relative;
          overflow: hidden;
        }

        .filmSkeletonCard::after,
        .filmSkeletonThumb::after,
        .filmSkeletonLine::after {
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
          animation: filmSkeletonShimmer 1.25s infinite;
        }

        .filmSkeletonCard {
          border: 1px solid ${COLORS.line};
          border-radius: 16px;
          background: rgba(255, 255, 255, 0.045);
          padding: 7px;
        }

        .filmSkeletonThumb {
          width: 100%;
          aspect-ratio: 1 / 1;
          border-radius: 12px;
          background: rgba(255, 255, 255, 0.09);
        }

        .filmSkeletonLine {
          height: 11px;
          margin-top: 8px;
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.09);
        }

        .filmSkeletonLine.short {
          width: 64%;
          height: 9px;
        }

        @keyframes filmSkeletonShimmer {
          100% {
            transform: translateX(100%);
          }
        }

        .filmCard {
          border-radius: 16px;
          padding: 7px;
          display: flex;
          flex-direction: column;
          gap: 8px;
          cursor: default;
        }

        .filmSelectButton {
          appearance: none;
          width: 100%;
          border: 0;
          border-radius: 0;
          padding: 0;
          background: transparent;
          color: inherit;
          text-align: left;
          cursor: pointer;
        }

        .filmThumb {
          width: 100%;
          aspect-ratio: 1 / 1;
          overflow: hidden;
          border-radius: 12px;
          border: 1px solid ${COLORS.line};
          background: rgba(255, 255, 255, 0.06);
        }

        .filmName {
          color: ${COLORS.cream};
          font-size: 11px;
          font-weight: 900;
          line-height: 1.25;
          min-height: 28px;
          margin-top: 7px;
          overflow: hidden;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
        }

        .filmActionRow {
          margin-top: auto;
        }

        .filmSampleButton {
          width: 100%;
          min-height: 30px;
          border-radius: 11px;
          border: 1px solid rgba(238, 224, 197, 0.24);
          background: rgba(238, 224, 197, 0.10);
          color: ${COLORS.cream};
          font-size: 10px;
          font-weight: 900;
          letter-spacing: -0.02em;
          cursor: pointer;
          padding: 0 6px;
        }

        .filmSampleButtonActive {
          background: rgba(238, 224, 197, 0.18);
          border-color: rgba(238, 224, 197, 0.42);
        }

        .filmSampleButton:disabled {
          color: rgba(255, 255, 255, 0.42);
          background: rgba(255, 255, 255, 0.05);
          border-color: rgba(255, 255, 255, 0.08);
          cursor: default;
        }

        .sampleBubbleBackdrop {
          position: fixed;
          inset: 0;
          z-index: 10020;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
          background: rgba(5, 2, 35, 0.34);
          backdrop-filter: blur(3px);
        }

        .sampleBubble {
          width: min(320px, calc(100vw - 40px));
          max-height: calc(100dvh - 36px);
          overflow-y: auto;
          overscroll-behavior: contain;
          border-radius: 24px;
          border: 1px solid rgba(238, 224, 197, 0.18);
          background: linear-gradient(180deg, rgba(14, 12, 82, 0.98) 0%, rgba(8, 6, 64, 0.98) 100%);
          box-shadow: 0 18px 48px rgba(0, 0, 0, 0.34);
          padding: 18px;
          position: relative;
        }

        .sampleBubbleClose {
          position: absolute;
          top: 14px;
          right: 14px;
          border: 0;
          background: rgba(255, 255, 255, 0.08);
          color: ${COLORS.white};
          border-radius: 999px;
          min-width: 54px;
          min-height: 32px;
          font-size: 12px;
          font-weight: 800;
          cursor: pointer;
          padding: 0 12px;
        }

        .sampleBubbleLabel {
          color: rgba(238, 224, 197, 0.82);
          font-size: 11px;
          font-weight: 800;
          margin-bottom: 6px;
        }

        .sampleBubbleTitle {
          color: ${COLORS.cream};
          font-size: 16px;
          line-height: 1.35;
          font-weight: 900;
          padding-right: 60px;
        }

        .sampleBubbleCode {
          color: ${COLORS.soft};
          font-size: 12px;
          line-height: 1.35;
          margin-top: 4px;
          margin-bottom: 12px;
        }

        .sampleBubbleImageWrap {
          width: 100%;
          height: min(58dvh, 520px);
          border-radius: 18px;
          overflow: hidden;
          border: 1px solid rgba(238, 224, 197, 0.18);
          background: rgba(255, 255, 255, 0.04);
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .sampleBubbleImageWrap img {
          width: 100%;
          height: 100%;
          display: block;
          object-fit: contain;
        }

        .sampleBubbleText {
          margin: 10px 2px 0;
          color: ${COLORS.soft};
          font-size: 12px;
          line-height: 1.5;
        }

        .hintBox,
        .emptyBox,
        .errorBox {
          border-radius: 16px;
          padding: 14px;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid ${COLORS.line};
          color: ${COLORS.soft};
          font-size: 13px;
          line-height: 1.6;
        }

        .errorBox {
          margin-top: 16px;
          color: #ffd6d6;
          background: rgba(120, 20, 20, 0.22);
        }

        .createButton {
          width: 100%;
          margin-top: 18px;
          min-height: 52px;
          font-size: 16px;
        }

        .createButton:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .resultPanel {
          position: sticky;
          top: 16px;
        }

        .resultBox {
          display: grid;
          gap: 10px;
        }

        .resultLabel {
          color: ${COLORS.cream};
          font-size: 13px;
          font-weight: 900;
        }

        .urlBox {
          border-radius: 15px;
          padding: 12px;
          background: rgba(255, 255, 255, 0.06);
          border: 1px solid ${COLORS.line};
          color: ${COLORS.white};
          font-size: 13px;
          line-height: 1.45;
          word-break: break-all;
        }

        .resultActions {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 8px;
        }

        .expiresText,
        .copyMessage {
          color: ${COLORS.soft};
          font-size: 13px;
          line-height: 1.5;
        }

        .summaryBox {
          display: grid;
          gap: 8px;
          margin-top: 16px;
        }

        .summaryBox div {
          display: flex;
          justify-content: space-between;
          gap: 10px;
          border-radius: 15px;
          padding: 12px;
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid ${COLORS.line};
        }

        .summaryBox span {
          color: ${COLORS.soft};
          font-size: 13px;
        }

        .summaryBox strong {
          color: ${COLORS.cream};
          font-size: 13px;
        }

        @media (max-width: 860px) {
          .layout {
            grid-template-columns: 1fr;
          }

          .resultPanel {
            position: static;
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

          .fieldGrid,
          .scopeRow,
          .resultActions,
          .filterToolbar,
          .skeletonFieldGrid,
          .skeletonSpaceGrid,
          .skeletonResultActions {
            grid-template-columns: 1fr;
          }

          .spaceGrid {
            grid-template-columns: 1fr;
          }

          .filmGrid {
            grid-template-columns: repeat(3, minmax(0, 1fr));
            max-height: none;
          }

          .searchRow {
            gap: 7px;
          }

          .searchRow button {
            padding: 0 13px;
          }

          .filmSampleButton {
            min-height: 28px;
            font-size: 10px;
          }

          .sampleBubble {
            width: min(300px, calc(100vw - 28px));
            max-height: calc(100dvh - 24px);
            padding: 16px;
            border-radius: 20px;
          }

          .sampleBubbleImageWrap {
            height: min(54dvh, 460px);
          }

          .sampleBubbleTitle {
            font-size: 15px;
          }

          .sampleBubbleText {
            font-size: 11px;
          }
        }
      `}</style>
    </main>
  );
}
