"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import SimulatorLinkTabs from "./SimulatorLinkTabs";
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

const DEFAULT_PALETTE_MAIN_OPTIONS = ["솔리드", "우드", "스톤", "메탈", "페브릭레더"];

const DEFAULT_PALETTE_COLOR_OPTIONS = [
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

function getFilmName(film: SimulatorFilm) {
  return film.full_name || film.product_code_1 || film.color_name || "필름";
}

function getFilmCode(film: SimulatorFilm) {
  return [film.product_code_1, film.product_code_2].filter(Boolean).join(" / ");
}

function getFilmThumbUrl(film: SimulatorFilm) {
  return film.thumb_url || film.image_url || "";
}

function orderPaletteValues(values: string[], preferred: string[]) {
  const orderMap = new Map(preferred.map((value, index) => [value, index]));

  return [...values].sort((a, b) => {
    const ai = orderMap.has(a) ? orderMap.get(a)! : 999;
    const bi = orderMap.has(b) ? orderMap.get(b)! : 999;

    if (ai !== bi) return ai - bi;
    return a.localeCompare(b, "ko");
  });
}

function uniqueClean(values: unknown) {
  if (!Array.isArray(values)) return [];

  return Array.from(
    new Set(
      values
        .map((value) => (typeof value === "string" ? value.trim() : ""))
        .filter(Boolean)
    )
  );
}

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

        void searchFilms({ query: "", silent: true, updateFacets: true });
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

  const updatePaletteFacets = (json: any) => {
    const mains = uniqueClean(json?.facets?.palette_mains);
    const subs = uniqueClean(json?.facets?.palette_subs);
    const colors = uniqueClean(json?.facets?.palette_colors);

    if (mains.length > 0) {
      setPaletteMainOptions(orderPaletteValues(mains, DEFAULT_PALETTE_MAIN_OPTIONS));
    }

    setPaletteSubOptions(subs);
    setPaletteColorOptions(
      colors.length > 0
        ? orderPaletteValues(colors, DEFAULT_PALETTE_COLOR_OPTIONS)
        : DEFAULT_PALETTE_COLOR_OPTIONS
    );
  };

  const searchFilms = async (options: SearchOptions = {}) => {
    const requestId = searchRequestRef.current + 1;
    searchRequestRef.current = requestId;

    const q = options.query !== undefined ? options.query.trim() : filmQuery.trim();
    const paletteMain = options.paletteMain !== undefined ? options.paletteMain : selectedPaletteMain;
    const paletteSub = options.paletteSub !== undefined ? options.paletteSub : selectedPaletteSub;
    const paletteColors = options.paletteColors !== undefined ? options.paletteColors : selectedPaletteColors;
    const updateFacets = options.updateFacets === true;
    const silent = options.silent === true;

    if (!silent) {
      setFilmLoading(true);
      setError("");
    }

    try {
      const params = new URLSearchParams();
      if (q) params.set("q", q);
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
      if (updateFacets) updatePaletteFacets(json);
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

  const resetPaletteFilters = () => {
    setSelectedPaletteMain("");
    setSelectedPaletteSub("");
    setSelectedPaletteColors([]);
    void searchFilms({ paletteMain: "", paletteSub: "", paletteColors: [], updateFacets: true });
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
    const nextColors = selectedPaletteColors.includes(value)
      ? selectedPaletteColors.filter((item) => item !== value)
      : [...selectedPaletteColors, value];

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

  const copyText = async (text: string) => {
    setCopyMessage("");

    try {
      await navigator.clipboard.writeText(text);
      setCopyMessage("복사 완료");
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
          <section className="panel">정보를 불러오는 중...</section>
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
                    onClick={() => setFilmScope("custom")}
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
                  <div className="customFilmBox">
                    <form
                      onSubmit={(event) => {
                        event.preventDefault();
                        void searchFilms();
                      }}
                      className="searchRow"
                    >
                      <input
                        value={filmQuery}
                        onChange={(event) => setFilmQuery(event.target.value)}
                        placeholder="예: 122, SG179, 화이트"
                      />
                      <button type="submit">{filmLoading ? "검색중" : "검색"}</button>
                    </form>

                    <div className="filterToolbar">
                      <button
                        type="button"
                        onClick={() => setPaletteOpen((prev) => !prev)}
                        className={`paletteToggle ${activePaletteCount > 0 ? "paletteToggleActive" : ""}`}
                      >
                        <span>색상으로 찾기</span>
                        <strong>{activePaletteCount > 0 ? `${activePaletteCount}개 적용중` : "열기"}</strong>
                      </button>

                      {activePaletteCount > 0 ? (
                        <button type="button" onClick={resetPaletteFilters} className="smallResetButton">
                          색상 초기화
                        </button>
                      ) : null}
                    </div>

                    {activePaletteCount > 0 ? (
                      <div className="activeFilterList">
                        {selectedPaletteMain ? (
                          <button type="button" onClick={() => handlePaletteMainClick(selectedPaletteMain)}>
                            {selectedPaletteMain} ×
                          </button>
                        ) : null}
                        {selectedPaletteSub ? (
                          <button type="button" onClick={() => handlePaletteSubClick(selectedPaletteSub)}>
                            {selectedPaletteSub} ×
                          </button>
                        ) : null}
                        {selectedPaletteColors.map((color) => (
                          <button key={color} type="button" onClick={() => handlePaletteColorClick(color)}>
                            {color} ×
                          </button>
                        ))}
                      </div>
                    ) : null}

                    {paletteOpen ? (
                      <div className="palettePanel">
                        <div className="palettePanelHeader">
                          <div>
                            <strong>색상 팔레트</strong>
                            <p>필요할 때만 열어서 고르고, 결과 목록은 넓게 유지합니다.</p>
                          </div>
                          <button type="button" onClick={() => setPaletteOpen(false)}>
                            접기
                          </button>
                        </div>

                        <div className="paletteGroup">
                          <div className="paletteLabelRow">
                            <span>1차 분류</span>
                          </div>
                          <div className="paletteChipRow">
                            {paletteMainOptions.map((item) => (
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
                            <div className="paletteLabelRow">
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
                          <div className="paletteLabelRow">
                            <span>색상</span>
                            <em>{selectedPaletteColors.length > 0 ? selectedPaletteColors.join(", ") : "전체"}</em>
                          </div>
                          <div className="paletteColorGrid">
                            {paletteColorOptions.map((item) => {
                              const active = selectedPaletteColors.includes(item);

                              return (
                                <button
                                  key={item}
                                  type="button"
                                  onClick={() => handlePaletteColorClick(item)}
                                  className={`paletteColorChip ${active ? "paletteColorChipActive" : ""}`}
                                  aria-pressed={active}
                                >
                                  <i style={{ background: PALETTE_COLOR_SWATCH[item] || "#DDD" }} />
                                  <span>{item}</span>
                                  {active ? <b aria-hidden="true">✓</b> : null}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    ) : null}

                    {selectedFilms.length > 0 ? (
                      <div className="selectedFilmList">
                        {selectedFilms.map((film) => (
                          <button
                            key={film.id}
                            type="button"
                            onClick={() => removeFilm(film.id)}
                          >
                            {getFilmName(film)} ×
                          </button>
                        ))}
                      </div>
                    ) : (
                      <div className="hintBox">
                        아직 선택한 필름이 없습니다. 검색 결과에서 필름을 눌러 추가하세요.
                      </div>
                    )}

                    <div className="filmGrid">
                      {filmSearchResults.map((film) => {
                        const active = selectedFilmIds.has(film.id);

                        return (
                          <button
                            key={film.id}
                            type="button"
                            onClick={() => addFilm(film)}
                            className={`filmCard ${active ? "filmCardActive" : ""}`}
                          >
                            <div className="filmThumb">
                              {getFilmThumbUrl(film) ? (
                                <img
                                  src={getFilmThumbUrl(film)}
                                  alt={getFilmName(film)}
                                  loading="lazy"
                                  decoding="async"
                                />
                              ) : null}
                            </div>
                            <div className="filmName">{getFilmName(film)}</div>
                            <div className="filmMeta">{getFilmCode(film) || film.manufacturer}</div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
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
                    <button type="button" onClick={() => copyText(result.url)}>
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

      <style jsx>{`
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

        .filmCard {
          border-radius: 16px;
          padding: 7px;
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

        .filmMeta {
          color: ${COLORS.soft};
          font-size: 10px;
          margin-top: 3px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
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
          .filterToolbar {
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
        }
      `}</style>
    </main>
  );
}
