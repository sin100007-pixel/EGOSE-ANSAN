"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import SimulatorLinkTabs from "./SimulatorLinkTabs";
import SimulatorAdminTutorial, { type SimulatorAdminTutorialStep } from "./SimulatorAdminTutorial";
import SimulatorAdminFilmPickerSheet from "./shared/SimulatorAdminFilmPickerSheet";
import SimulatorSelectedFilmList from "./shared/SimulatorSelectedFilmList";
import {
  DEFAULT_PALETTE_COLOR_OPTIONS,
  DEFAULT_PALETTE_MAIN_OPTIONS,
  orderPaletteValues,
  uniqueClean,
} from "./shared/SimulatorPaletteFilter";
import type { SimulatorFilm } from "../types";

type PresetSummary = {
  id: string;
  name: string;
  description: string | null;
  item_count: number;
  created_at: string;
  updated_at: string | null;
};

type PresetDetail = PresetSummary & {
  product_ids: number[];
  films: SimulatorFilm[];
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

const PRESET_MANAGER_TUTORIAL_STEPS = [
  {
    id: "preset-start",
    target: "preset-hero",
    title: "프리셋을 만드는 화면입니다",
    description:
      "고객에게 추천할 필름 묶음을 저장해두고, 링크 생성에서 빠르게 불러올 수 있습니다.",
    tip: "예: 화이트 추천, 우드 인기색, 주방 추천색처럼 상담 상황별로 만들어두면 좋아요.",
  },
  {
    id: "preset-name",
    target: "preset-name",
    title: "프리셋 이름을 입력합니다",
    description:
      "링크 생성 화면에서 바로 알아볼 수 있도록 추천 조합의 이름을 입력합니다.",
    tip: "고객에게 보이는 이름이 아니라 시공자가 관리하기 위한 이름입니다.",
  },
  {
    id: "preset-picker-launch",
    target: "preset-picker-launch",
    title: "프리셋으로 만들 색상을 선택합니다",
    description:
      "버튼을 누르면 하단에서 필름 선택창이 올라옵니다. 그 안에서 검색, 패턴, 색상으로 필름을 고를 수 있습니다.",
    scrollBlock: "center",
  },
  {
    id: "preset-picker-sheet",
    target: "preset-picker-sheet",
    title: "필름묶음을 만들 필름을 고릅니다",
    description:
      "하단 필름 선택창 안에서 검색, 패턴, 색상으로 원하는 필름을 고를 수 있습니다.",
    tip: (
      <>
        필름 이미지 오른쪽 위에 있는 <span className="simAdminTutorialSamplePill">샘플</span>을 누르면 크게 확대해서 볼 수 있어요.
      </>
    ),
    scrollBlock: "center",
    cardPlacement: "bottom",
    cardBottom: 118,
    cardBottomMobile: 104,
    spotlightFullViewport: true,
    allowTargetInteraction: true,
  },
  {
    id: "preset-selected-list",
    target: "preset-selected-list",
    title: "선택한 필름을 확인합니다",
    description:
      "프리셋에 담긴 필름이 이곳에 표시됩니다. 필요 없는 필름은 칩을 눌러 제거할 수 있습니다.",
    scrollBlock: "center",
  },
  {
    id: "preset-save",
    target: "preset-save",
    title: "프리셋을 저장합니다",
    description:
      "프리셋 이름과 선택한 필름을 확인한 뒤 저장하면 링크 생성 화면에서 바로 사용할 수 있습니다.",
    cardBottomMobile: 130,
  },
  {
    id: "preset-list",
    target: "preset-list",
    title: "저장된 프리셋을 관리합니다",
    description:
      "내 프리셋에서 저장된 묶음을 확인하고, 필요하면 수정하거나 삭제할 수 있습니다.",
    tip: "수정 버튼을 누르면 작성 영역으로 불러와서 필름 구성을 바꿀 수 있어요.",
    scrollBlock: "end",
    cardBottomMobile: 310,
  },
] satisfies readonly SimulatorAdminTutorialStep[];

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

export default function SimulatorPresetManager() {
  const router = useRouter();
  const [isDashboardMoving, setIsDashboardMoving] = useState(false);

  const [presets, setPresets] = useState<PresetSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState("");
  const [loadingPresetId, setLoadingPresetId] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const [editingId, setEditingId] = useState("");
  const [presetName, setPresetName] = useState("");

  const [filmQuery, setFilmQuery] = useState("");
  const [filmLoading, setFilmLoading] = useState(false);
  const [filmSearchResults, setFilmSearchResults] = useState<SimulatorFilm[]>([]);
  const [selectedFilms, setSelectedFilms] = useState<SimulatorFilm[]>([]);
  const [previewSampleFilm, setPreviewSampleFilm] = useState<SimulatorFilm | null>(null);
  const [filmPickerOpen, setFilmPickerOpen] = useState(false);

  const [paletteOpen, setPaletteOpen] = useState(false);
  const [selectedPaletteMain, setSelectedPaletteMain] = useState("");
  const [selectedPaletteSub, setSelectedPaletteSub] = useState("");
  const [selectedPaletteColors, setSelectedPaletteColors] = useState<string[]>([]);
  const [paletteMainOptions, setPaletteMainOptions] = useState<string[]>(DEFAULT_PALETTE_MAIN_OPTIONS);
  const [paletteSubOptions, setPaletteSubOptions] = useState<string[]>([]);
  const [paletteColorOptions, setPaletteColorOptions] = useState<string[]>(DEFAULT_PALETTE_COLOR_OPTIONS);

  const searchRequestRef = useRef(0);


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

  const showInitialLoading = loading && presets.length === 0;

  const loadPresets = async () => {
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/simulator/presets", { cache: "no-store" });
      const json = await res.json();

      if (!res.ok) {
        setError(json.error || "프리셋 목록을 불러오지 못했습니다.");
        return;
      }

      setPresets(Array.isArray(json.items) ? json.items : []);
    } catch {
      setError("프리셋 목록을 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
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
    const isKeywordSearch = q.length > 0;
    const requestPaletteMain = isKeywordSearch ? "" : paletteMain;
    const requestPaletteSub = isKeywordSearch ? "" : paletteSub;
    const requestPaletteColors = isKeywordSearch ? [] : paletteColors;
    const updateFacets = options.updateFacets === true;
    const silent = options.silent === true;
    const isInitialSheetRequest =
      q.length === 0 &&
      !requestPaletteMain &&
      !requestPaletteSub &&
      requestPaletteColors.length === 0;
    // 필터를 모두 해제한 상태는 추천 컬러 목록이어야 합니다.
    // recommended 파라미터가 없으면 /api/simulator/films가 전체 필름을 넓게 반환합니다.
    const useRecommended = options.recommended === true || isInitialSheetRequest;

    if (!silent) {
      setFilmLoading(true);
      setError("");
    }

    try {
      const params = new URLSearchParams();
      if (q) params.set("q", q);
      if (useRecommended) params.set("recommended", "1");
      if (requestPaletteMain) params.set("palette_main", requestPaletteMain);
      if (requestPaletteSub) params.set("palette_sub", requestPaletteSub);
      requestPaletteColors.forEach((color) => params.append("palette_color", color));
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
      if (updateFacets) updatePaletteFacets(json, requestPaletteMain, requestPaletteSub);
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

  useEffect(() => {
    void loadPresets();
    void searchFilms({ query: "", silent: false, updateFacets: true, recommended: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const addFilm = (film: SimulatorFilm) => {
    setSelectedFilms((prev) => {
      if (prev.some((item) => item.id === film.id)) return prev;
      return [...prev, film];
    });
  };

  const removeFilm = (filmId: number) => {
    setSelectedFilms((prev) => prev.filter((film) => film.id !== filmId));
  };

  const toggleFilm = (film: SimulatorFilm) => {
    if (selectedFilmIds.has(film.id)) {
      removeFilm(film.id);
      return;
    }

    addFilm(film);
  };

  const toggleSamplePreview = (film: SimulatorFilm) => {
    if (!film.sample_url) return;

    setPreviewSampleFilm((prev) => (prev?.id === film.id ? null : film));
  };

  const openFilmPicker = () => {
    setFilmPickerOpen(true);

    if (filmSearchResults.length === 0 && !filmLoading) {
      void searchFilms({ query: "", paletteMain: "", paletteSub: "", paletteColors: [], updateFacets: true, recommended: true });
    }
  };

  const closeFilmPicker = () => {
    setFilmPickerOpen(false);
    setPreviewSampleFilm(null);
  };

  const handlePresetTutorialStepChange = useCallback(
    (
      tutorialStep: SimulatorAdminTutorialStep,
      _index: number,
      isOpen: boolean,
    ) => {
      if (!isOpen) {
        setFilmPickerOpen(false);
        setPreviewSampleFilm(null);
        return;
      }

      if (tutorialStep.id === "preset-picker-sheet") {
        setFilmPickerOpen(true);
        return;
      }

      setFilmPickerOpen(false);
      setPreviewSampleFilm(null);
    },
    [],
  );

  const resetForm = () => {
    setEditingId("");
    setPresetName("");
    setSelectedFilms([]);
    setMessage("");
    setError("");
  };

  const resetPaletteFilters = () => {
    setSelectedPaletteMain("");
    setSelectedPaletteSub("");
    setSelectedPaletteColors([]);
    setFilmQuery("");
    void searchFilms({ query: "", paletteMain: "", paletteSub: "", paletteColors: [], updateFacets: true, recommended: true });
  };

  const handlePaletteMainClick = (value: string) => {
    const nextMain = selectedPaletteMain === value ? "" : value;

    setSelectedPaletteMain(nextMain);
    setSelectedPaletteSub("");
    setSelectedPaletteColors([]);
    setFilmQuery("");

    void searchFilms({
      query: "",
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
    setFilmQuery("");

    void searchFilms({
      query: "",
      paletteMain: selectedPaletteMain,
      paletteSub: nextSub,
      paletteColors: [],
      updateFacets: true,
    });
  };

  const handlePaletteColorClick = (value: string) => {
    const nextColors = selectedPaletteColors.includes(value) ? [] : [value];

    setSelectedPaletteColors(nextColors);
    setFilmQuery("");

    void searchFilms({
      query: "",
      paletteMain: selectedPaletteMain,
      paletteSub: selectedPaletteSub,
      paletteColors: nextColors,
      updateFacets: false,
    });
  };

  const savePreset = async () => {
    setSaving(true);
    setError("");
    setMessage("");

    try {
      const res = await fetch("/api/simulator/presets", {
        method: editingId ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: editingId || undefined,
          name: presetName,
          description: "",
          product_ids: selectedFilms.map((film) => film.id),
        }),
      });
      const json = await res.json();

      if (!res.ok) {
        setError(json.error || "프리셋을 저장하지 못했습니다.");
        return;
      }

      setMessage(editingId ? "프리셋을 수정했습니다." : "프리셋을 만들었습니다.");
      resetForm();
      await loadPresets();
    } catch {
      setError("프리셋을 저장하지 못했습니다.");
    } finally {
      setSaving(false);
    }
  };

  const editPreset = async (presetId: string) => {
    setLoadingPresetId(presetId);
    setError("");
    setMessage("");

    try {
      const params = new URLSearchParams({ id: presetId });
      const res = await fetch(`/api/simulator/presets?${params.toString()}`, {
        cache: "no-store",
      });
      const json = await res.json();

      if (!res.ok) {
        setError(json.error || "프리셋 내용을 불러오지 못했습니다.");
        return;
      }

      const detail = json.item as PresetDetail;
      setEditingId(detail.id);
      setPresetName(detail.name || "");
      setSelectedFilms(Array.isArray(detail.films) ? detail.films : []);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch {
      setError("프리셋 내용을 불러오지 못했습니다.");
    } finally {
      setLoadingPresetId("");
    }
  };

  const deletePreset = async (preset: PresetSummary) => {
    const ok = window.confirm(`${preset.name} 프리셋을 삭제할까요?`);

    if (!ok) return;

    setDeletingId(preset.id);
    setError("");
    setMessage("");

    try {
      const res = await fetch("/api/simulator/presets", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ id: preset.id }),
      });
      const json = await res.json();

      if (!res.ok) {
        setError(json.error || "프리셋을 삭제하지 못했습니다.");
        return;
      }

      if (editingId === preset.id) resetForm();
      setMessage("프리셋을 삭제했습니다.");
      await loadPresets();
    } catch {
      setError("프리셋을 삭제하지 못했습니다.");
    } finally {
      setDeletingId("");
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

        <section className="heroCard" data-sim-admin-guide="preset-hero">
          <div className="stepBadge">필름 제한 프리셋</div>
          <h1>보여줄 필름 묶음 만들기</h1>
          <p>
            자주 쓰는 추천 필름을 프리셋 이름으로 저장해두고, 고객 링크 생성 시 바로 선택할 수 있습니다.
          </p>
        </section>

        <SimulatorAdminTutorial
          storageKey="preset-manager-guide-choice-v1"
          steps={PRESET_MANAGER_TUTORIAL_STEPS}
          buttonLabel="프리셋"
          onStepChange={handlePresetTutorialStepChange}
        />

        {showInitialLoading ? (
          <div className="layout">
            <section className="panel formPanel skeletonPanel">
              <div className="sectionTitleRow compactTitle">
                <div>
                  <h2>새 프리셋 만들기</h2>
                  <p>프리셋 정보를 불러오는 중입니다.</p>
                </div>
                <span>준비 중</span>
              </div>

              <div className="skeletonField">
                <div className="skeletonLabel" />
                <div className="skeletonInput" />
              </div>

              <div className="skeletonField">
                <div className="skeletonLabel short" />
                <div className="skeletonSearchRow">
                  <div className="skeletonInput" />
                  <div className="skeletonButton" />
                </div>
              </div>

              <div className="skeletonHint">프리셋 화면을 예쁘게 준비하는 중...</div>

              <div className="skeletonFilmGrid">
                {Array.from({ length: 6 }).map((_, index) => (
                  <div key={index} className="skeletonFilmCard">
                    <div className="skeletonFilmThumb" />
                    <div className="skeletonFilmLine" />
                    <div className="skeletonFilmLine short" />
                  </div>
                ))}
              </div>

              <div className="skeletonActionButton" />
            </section>

            <aside className="panel listPanel skeletonPanel">
              <div className="sectionTitleRow">
                <div>
                  <h2>내 프리셋</h2>
                  <p>저장된 프리셋을 정리하고 있습니다.</p>
                </div>
                <div className="skeletonMiniButton" />
              </div>

              <div className="skeletonPresetList">
                {Array.from({ length: 3 }).map((_, index) => (
                  <div key={index} className="skeletonPresetCard">
                    <div className="skeletonPresetTitle" />
                    <div className="skeletonPresetMeta" />
                    <div className="skeletonPresetActions">
                      <div className="skeletonMiniButton" />
                      <div className="skeletonMiniButton danger" />
                    </div>
                  </div>
                ))}
              </div>
            </aside>
          </div>
        ) : (
        <div className="layout">
          <section className="panel formPanel">
            <div className="sectionTitleRow compactTitle">
              <div>
                <h2>{editingId ? "프리셋 수정" : "새 프리셋 만들기"}</h2>
                <p>프리셋 이름을 입력하고 고객에게 보여줄 필름을 담아주세요.</p>
              </div>
              {editingId ? <span>수정 중</span> : <span>새 프리셋</span>}
            </div>

            <label className="presetNameField" data-sim-admin-guide="preset-name">
              <span>프리셋 이름설정</span>
              <input
                value={presetName}
                onChange={(event) => setPresetName(event.target.value)}
                placeholder="예: 화이트 추천 20종, 우드 인기색 모음"
              />
            </label>

            <div data-sim-admin-guide="preset-picker-area">
              <div className="fieldSectionLabel">프리셋 할 제품 찾기</div>

              <div className="filmPickerLaunchBox" data-sim-admin-guide="preset-picker-launch">
                <button type="button" onClick={openFilmPicker} className="openFilmSheetButton">
                  프리셋으로 만들 색상 선택하기
                </button>
                <div className="pickerStatusBar compactPickerStatus">
                  <span>검색 결과 {filmSearchResults.length}개</span>
                  <strong>선택한 필름 {selectedFilms.length}개</strong>
                </div>
                <p className="filmPickerLaunchHint">
                  버튼을 누르면 시뮬레이터와 같은 필름 선택창이 하단에서 열립니다. 패턴과 색상으로 좁혀서 고를 수 있어요.
                </p>
              </div>

              <div className="selectedFilmSummaryBox" data-sim-admin-guide="preset-selected-list">
                <div className="selectedFilmSummaryHeader">
                  <span>프리셋에 담긴 필름</span>
                  <strong>{selectedFilms.length}개</strong>
                </div>
                <SimulatorSelectedFilmList
                  films={selectedFilms}
                  onRemove={removeFilm}
                  emptyText="아직 선택한 필름이 없습니다. 버튼을 눌러 프리셋에 넣을 필름을 골라주세요."
                  emptyClassName="hintBox compactHint"
                  ariaLabel="선택한 필름 목록"
                  buttonTitle="누르면 선택 해제"
                />
              </div>
            </div>

            {error ? <div className="errorBox">{error}</div> : null}
            {message ? <div className="messageBox">{message}</div> : null}

            <div className="actionRow" data-sim-admin-guide="preset-save">
              <button
                type="button"
                onClick={savePreset}
                disabled={saving}
                className="saveButton"
              >
                {saving ? "저장 중..." : editingId ? "프리셋 수정 완료" : "프리셋 만들기"}
              </button>
              {editingId ? (
                <button type="button" onClick={resetForm} className="cancelButton">
                  새 프리셋으로 전환
                </button>
              ) : null}
            </div>
          </section>

          <aside className="panel listPanel" data-sim-admin-guide="preset-list">
            <div className="sectionTitleRow">
              <div>
                <h2>내 프리셋</h2>
                <p>링크 생성 화면에서 바로 선택할 수 있습니다.</p>
              </div>
              <button type="button" onClick={() => void loadPresets()} className="refreshButton">
                새로고침
              </button>
            </div>

            {loading ? (
              <div className="emptyBox">프리셋을 불러오는 중...</div>
            ) : presets.length === 0 ? (
              <div className="emptyBox">아직 만든 프리셋이 없습니다.</div>
            ) : (
              <div className="presetList">
                {presets.map((preset) => (
                  <article key={preset.id} className="presetCard">
                    <div>
                      <h3>{preset.name}</h3>
                    </div>
                    <div className="presetMeta">
                      <span>필름 {preset.item_count}개</span>
                      <span>{formatDate(preset.updated_at || preset.created_at)}</span>
                    </div>
                    <div className="presetActions">
                      <button
                        type="button"
                        onClick={() => void editPreset(preset.id)}
                        disabled={loadingPresetId === preset.id}
                      >
                        {loadingPresetId === preset.id ? "불러오는 중" : "수정"}
                      </button>
                      <button
                        type="button"
                        onClick={() => void deletePreset(preset)}
                        disabled={deletingId === preset.id}
                        className="deleteButton"
                      >
                        {deletingId === preset.id ? "삭제 중" : "삭제"}
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </aside>
        </div>
        )}
      </div>

      {filmPickerOpen ? (
        <SimulatorAdminFilmPickerSheet
          title="프리셋으로 만들 필름"
          subtitle="고객에게 추천할 필름을 검색하고 선택해 프리셋에 담아주세요."
          films={filmSearchResults}
          selectedFilms={selectedFilms}
          filmQuery={filmQuery}
          filmLoading={filmLoading}
          filmError={error}
          selectedPaletteMain={selectedPaletteMain}
          selectedPaletteSub={selectedPaletteSub}
          selectedPaletteColors={selectedPaletteColors}
          paletteMainOptions={paletteMainOptions}
          paletteSubOptions={paletteSubOptions}
          paletteColorOptions={paletteColorOptions}
          previewSampleFilm={previewSampleFilm}
          emptyText="조건에 맞는 필름이 없습니다. 검색어 또는 색상 조건을 바꿔보세요."
          doneLabel="프리셋에 담기 완료"
          guideTarget="preset-picker-sheet"
          onClose={closeFilmPicker}
          onResetPaletteFilters={resetPaletteFilters}
          onPaletteMainClick={handlePaletteMainClick}
          onPaletteSubClick={handlePaletteSubClick}
          onPaletteColorClick={handlePaletteColorClick}
          onFilmQueryChange={setFilmQuery}
          onSearchFilms={() => void searchFilms({ updateFacets: false })}
          onToggleFilm={toggleFilm}
          onRemoveSelectedFilm={removeFilm}
          onToggleSamplePreview={toggleSamplePreview}
          onCloseSamplePreview={() => setPreviewSampleFilm(null)}
        />
      ) : null}

      <SimulatorLinkTabs active="presets" />

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

        .stepBadge,
        .sectionTitleRow > span {
          display: inline-flex;
          border-radius: 999px;
          padding: 7px 11px;
          background: rgba(238, 224, 197, 0.1);
          color: ${COLORS.cream};
          font-size: 13px;
          font-weight: 900;
          white-space: nowrap;
        }

        h1 {
          margin: 0;
          font-size: clamp(28px, 5vw, 44px);
          line-height: 1.08;
          letter-spacing: -0.04em;
        }

        .heroCard p,
        .sectionTitleRow p {
          color: ${COLORS.soft};
          line-height: 1.6;
          word-break: keep-all;
        }

        .heroCard p {
          margin: 12px 0 0;
          font-size: 15px;
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

        .sectionTitleRow {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 12px;
          margin-bottom: 14px;
        }

        .compactTitle {
          margin-bottom: 12px;
        }

        .sectionTitleRow h2 {
          margin: 0;
          color: ${COLORS.cream};
          font-size: 20px;
          letter-spacing: -0.03em;
        }

        .sectionTitleRow p {
          margin: 5px 0 0;
          font-size: 13px;
        }

        label {
          display: grid;
          gap: 7px;
        }

        label span {
          color: ${COLORS.cream};
          font-size: 13px;
          font-weight: 900;
        }

        input {
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

        .presetNameField {
          margin-bottom: 10px;
        }

        .fieldSectionLabel {
          color: ${COLORS.cream};
          font-size: 13px;
          font-weight: 900;
          margin: 0 0 7px;
        }

        .filmPicker {
          display: grid;
          gap: 10px;
        }

        .searchRow {
          display: grid;
          grid-template-columns: minmax(0, 1fr) 86px;
          gap: 8px;
        }

        .searchRow button,
        .saveButton,
        .cancelButton,
        .refreshButton,
        .presetActions button,
        .smallResetButton,
        .palettePanelHeader button {
          border: 0;
          border-radius: 15px;
          padding: 12px 13px;
          font-size: 14px;
          font-weight: 900;
          cursor: pointer;
        }

        .searchRow button,
        .saveButton,
        .presetActions button:first-child,
        .refreshButton {
          background: ${COLORS.cream};
          color: ${COLORS.creamText};
        }

        .cancelButton,
        .deleteButton,
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
          -webkit-overflow-scrolling: touch;
        }

        .selectedFilmList {
          width: 100%;
          max-width: 100%;
          min-width: 0;
          display: flex;
          flex-wrap: wrap;
          gap: 7px;
          overflow-x: hidden;
          overflow-y: auto;
          max-height: 112px;
          padding: 1px 2px 2px;
          box-sizing: border-box;
          overscroll-behavior: contain;
          -webkit-overflow-scrolling: touch;
        }

        .activeFilterList button,
        .selectedFilmList button {
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

        .selectedFilmList button {
          flex: 0 1 auto;
          max-width: 100%;
          min-width: 0;
        }

        .palettePanel {
          border-radius: 20px;
          padding: 12px;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(238, 224, 197, 0.2);
          display: grid;
          gap: 12px;
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
          grid-template-columns: repeat(4, minmax(0, 1fr));
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

        .pickerStatusBar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          border: 1px solid ${COLORS.line};
          border-radius: 16px;
          background: rgba(0, 0, 0, 0.12);
          padding: 10px 12px;
        }

        .pickerStatusBar span,
        .pickerStatusBar strong {
          font-size: 13px;
          font-weight: 900;
        }

        .pickerStatusBar span {
          color: ${COLORS.soft};
        }

        .pickerStatusBar strong {
          color: ${COLORS.cream};
        }

        .hintBox,
        .emptyBox,
        .errorBox,
        .messageBox {
          border-radius: 18px;
          padding: 14px;
          font-size: 14px;
          line-height: 1.6;
          margin-top: 12px;
        }

        .compactHint {
          margin-top: 0;
          padding: 11px 12px;
        }

        .hintBox,
        .emptyBox {
          border: 1px dashed ${COLORS.line};
          color: ${COLORS.soft};
          background: rgba(255, 255, 255, 0.04);
        }

        .errorBox {
          border: 1px solid rgba(255, 120, 120, 0.45);
          color: #ffd2d2;
          background: rgba(255, 60, 60, 0.12);
        }

        .messageBox {
          border: 1px solid rgba(238, 224, 197, 0.38);
          color: ${COLORS.cream};
          background: rgba(238, 224, 197, 0.1);
        }

        .filmPickerLaunchBox,
        .selectedFilmSummaryBox {
          min-width: 0;
          max-width: 100%;
          overflow: hidden;
          border-radius: 18px;
          border: 1px solid ${COLORS.line};
          background: rgba(255, 255, 255, 0.045);
          padding: 12px;
          margin-bottom: 12px;
          box-sizing: border-box;
        }

        .openFilmSheetButton {
          width: 100%;
          min-height: 52px;
          border: 0;
          border-radius: 16px;
          background: ${COLORS.cream};
          color: ${COLORS.creamText};
          font-size: 15px;
          font-weight: 1000;
          cursor: pointer;
          box-shadow: 0 10px 22px rgba(0, 0, 0, 0.16);
        }

        .compactPickerStatus {
          margin-top: 10px;
        }

        .filmPickerLaunchHint {
          margin: 9px 2px 0;
          color: ${COLORS.soft};
          font-size: 12px;
          line-height: 1.55;
        }

        .selectedFilmSummaryHeader {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          margin-bottom: 8px;
          color: ${COLORS.cream};
          font-size: 13px;
          font-weight: 1000;
        }

        .selectedFilmSummaryHeader strong {
          border-radius: 999px;
          padding: 5px 9px;
          background: rgba(238, 224, 197, 0.12);
          color: ${COLORS.cream};
          font-size: 12px;
        }

        .filmResultGrid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 8px;
          max-height: min(52dvh, 560px);
          overflow-y: auto;
          overscroll-behavior: contain;
          -webkit-overflow-scrolling: touch;
          padding-right: 4px;
          padding-bottom: 4px;
          scrollbar-width: thin;
          scrollbar-color: rgba(238, 224, 197, 0.55) rgba(255, 255, 255, 0.06);
        }

        .filmResultGrid::-webkit-scrollbar {
          width: 6px;
        }

        .filmResultGrid::-webkit-scrollbar-track {
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.06);
        }

        .filmResultGrid::-webkit-scrollbar-thumb {
          border-radius: 999px;
          background: rgba(238, 224, 197, 0.55);
        }

        .filmResultSkeletonCard,
        .filmResultSkeletonThumb,
        .filmResultSkeletonLine {
          position: relative;
          overflow: hidden;
        }

        .filmResultSkeletonCard::after,
        .filmResultSkeletonThumb::after,
        .filmResultSkeletonLine::after {
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
          animation: filmResultSkeletonShimmer 1.25s infinite;
        }

        .filmResultSkeletonCard {
          border: 1px solid ${COLORS.line};
          background: rgba(255, 255, 255, 0.045);
          border-radius: 16px;
          padding: 7px;
        }

        .filmResultSkeletonThumb {
          width: 100%;
          aspect-ratio: 1 / 1;
          border-radius: 12px;
          background: rgba(255, 255, 255, 0.09);
        }

        .filmResultSkeletonLine {
          height: 11px;
          margin-top: 8px;
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.09);
        }

        .filmResultSkeletonLine.short {
          width: 64%;
          height: 9px;
        }

        @keyframes filmResultSkeletonShimmer {
          100% {
            transform: translateX(100%);
          }
        }

        .filmResultCard {
          border: 1px solid ${COLORS.line};
          background: rgba(255, 255, 255, 0.045);
          color: ${COLORS.white};
          cursor: default;
          text-align: left;
          border-radius: 16px;
          padding: 7px;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .filmResultSelectButton {
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

        .filmResultCardActive {
          border-color: rgba(238, 224, 197, 0.58);
          background: rgba(238, 224, 197, 0.14);
          box-shadow: inset 0 0 0 1px rgba(238, 224, 197, 0.12);
        }

        .filmResultThumb {
          width: 100%;
          aspect-ratio: 1 / 1;
          overflow: hidden;
          border-radius: 12px;
          border: 1px solid ${COLORS.line};
          background: rgba(255, 255, 255, 0.06);
        }

        .filmResultThumb img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
        }

        .filmResultName {
          margin-top: 8px;
          font-size: 12px;
          line-height: 1.25;
          font-weight: 900;
          color: ${COLORS.cream};
          display: -webkit-box;
          -webkit-box-orient: vertical;
          -webkit-line-clamp: 2;
          overflow: hidden;
          min-height: 30px;
          word-break: keep-all;
        }

        .filmResultActionRow {
          margin-top: auto;
        }

        .filmResultSampleButton {
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

        .filmResultSampleButtonActive {
          background: rgba(238, 224, 197, 0.18);
          border-color: rgba(238, 224, 197, 0.42);
        }

        .filmResultSampleButton:disabled {
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

        .actionRow {
          display: flex;
          gap: 10px;
          margin-top: 16px;
          flex-wrap: wrap;
        }

        .saveButton {
          flex: 1;
          min-width: 180px;
        }

        .presetList {
          display: grid;
          gap: 10px;
        }

        .presetCard {
          border: 1px solid ${COLORS.line};
          border-radius: 20px;
          background: rgba(255, 255, 255, 0.045);
          padding: 14px;
        }

        .presetCard h3 {
          margin: 0;
          color: ${COLORS.cream};
          font-size: 17px;
          letter-spacing: -0.02em;
          word-break: keep-all;
        }

        .presetMeta {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          margin-top: 10px;
        }

        .presetMeta span {
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.06);
          border: 1px solid ${COLORS.line};
          color: ${COLORS.soft};
          padding: 6px 8px;
          font-size: 12px;
          font-weight: 800;
        }

        .presetActions {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 8px;
          margin-top: 12px;
        }


        .skeletonPanel,
        .skeletonLabel,
        .skeletonInput,
        .skeletonButton,
        .skeletonHint,
        .skeletonFilmCard,
        .skeletonFilmThumb,
        .skeletonFilmLine,
        .skeletonActionButton,
        .skeletonMiniButton,
        .skeletonPresetCard,
        .skeletonPresetTitle,
        .skeletonPresetMeta {
          position: relative;
          overflow: hidden;
        }

        .skeletonPanel::after,
        .skeletonLabel::after,
        .skeletonInput::after,
        .skeletonButton::after,
        .skeletonHint::after,
        .skeletonFilmCard::after,
        .skeletonFilmThumb::after,
        .skeletonFilmLine::after,
        .skeletonActionButton::after,
        .skeletonMiniButton::after,
        .skeletonPresetCard::after,
        .skeletonPresetTitle::after,
        .skeletonPresetMeta::after {
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
          animation: shimmer 1.35s infinite;
        }

        .skeletonField {
          display: grid;
          gap: 8px;
          margin-top: 14px;
        }

        .skeletonLabel {
          width: 108px;
          height: 14px;
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.08);
        }

        .skeletonLabel.short {
          width: 82px;
        }

        .skeletonInput {
          width: 100%;
          height: 52px;
          border-radius: 18px;
          background: rgba(255, 255, 255, 0.08);
          border: 1px solid rgba(238, 224, 197, 0.08);
        }

        .skeletonSearchRow {
          display: grid;
          grid-template-columns: minmax(0, 1fr) 78px;
          gap: 10px;
        }

        .skeletonButton {
          height: 52px;
          border-radius: 18px;
          background: rgba(238, 224, 197, 0.16);
          border: 1px solid rgba(238, 224, 197, 0.14);
        }

        .skeletonHint {
          margin-top: 14px;
          border-radius: 18px;
          min-height: 68px;
          padding: 20px 16px;
          background: rgba(255, 255, 255, 0.06);
          border: 1px dashed rgba(238, 224, 197, 0.18);
          color: rgba(255, 255, 255, 0.7);
          font-weight: 800;
        }

        .skeletonFilmGrid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 10px;
          margin-top: 14px;
        }

        .skeletonFilmCard {
          border-radius: 18px;
          padding: 8px;
          background: rgba(255, 255, 255, 0.045);
          border: 1px solid rgba(238, 224, 197, 0.12);
        }

        .skeletonFilmThumb {
          width: 100%;
          aspect-ratio: 1 / 1;
          border-radius: 14px;
          background: rgba(255, 255, 255, 0.09);
        }

        .skeletonFilmLine {
          margin-top: 8px;
          height: 12px;
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.09);
        }

        .skeletonFilmLine.short {
          width: 68%;
          height: 10px;
        }

        .skeletonActionButton {
          margin-top: 16px;
          width: 180px;
          max-width: 100%;
          height: 54px;
          border-radius: 18px;
          background: rgba(238, 224, 197, 0.16);
          border: 1px solid rgba(238, 224, 197, 0.14);
        }

        .skeletonPresetList {
          display: grid;
          gap: 12px;
          margin-top: 14px;
        }

        .skeletonPresetCard {
          border-radius: 20px;
          padding: 16px;
          background: rgba(255, 255, 255, 0.045);
          border: 1px solid rgba(238, 224, 197, 0.12);
        }

        .skeletonPresetTitle {
          width: 54%;
          height: 16px;
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.09);
        }

        .skeletonPresetMeta {
          width: 72%;
          height: 12px;
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.08);
          margin-top: 10px;
        }

        .skeletonPresetActions {
          display: flex;
          gap: 8px;
          margin-top: 14px;
        }

        .skeletonMiniButton {
          width: 74px;
          height: 38px;
          border-radius: 14px;
          background: rgba(255, 255, 255, 0.08);
          border: 1px solid rgba(238, 224, 197, 0.12);
        }

        .skeletonMiniButton.danger {
          background: rgba(235, 87, 87, 0.12);
          border-color: rgba(235, 87, 87, 0.22);
        }

        @keyframes shimmer {
          100% {
            transform: translateX(100%);
          }
        }

        button:disabled {
          opacity: 0.58;
          cursor: not-allowed;
        }

        @media (max-width: 940px) {
          .layout {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 640px) {
          .pageInner {
            padding: 14px 12px 52px;
          }

          .heroCard,
          .panel {
            border-radius: 24px;
          }

          .panel {
            padding: 14px;
          }

          .compactTitle {
            align-items: flex-start;
          }

          .searchRow {
            grid-template-columns: minmax(0, 1fr) 74px;
          }

          .searchRow button {
            padding-left: 8px;
            padding-right: 8px;
          }

          .filterToolbar {
            grid-template-columns: 1fr;
          }

          .smallResetButton {
            padding: 10px 12px;
          }

          .paletteColorGrid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }

          .filmResultGrid {
            grid-template-columns: repeat(3, minmax(0, 1fr));
            gap: 7px;
            max-height: min(46dvh, 430px);
            padding-right: 3px;
          }

          .filmResultCard {
            border-radius: 16px;
            padding: 7px;
          }

          .filmResultThumb {
            border-radius: 12px;
          }

          .filmResultName {
            font-size: 12px;
            min-height: 28px;
          }

          .filmResultSampleButton {
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
