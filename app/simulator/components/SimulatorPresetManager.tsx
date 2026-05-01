"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import SimulatorLinkTabs from "./SimulatorLinkTabs";
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

  const paintThenNavigate = (to: string) => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        router.push(to);
      });
    });
  };

  const goToDashboard = () => {
    if (isDashboardMoving) return;

    setIsDashboardMoving(true);
    router.prefetch("/dashboard");
    paintThenNavigate("/dashboard");
  };

  const selectedFilmIds = useMemo(() => {
    return new Set(selectedFilms.map((film) => film.id));
  }, [selectedFilms]);

  const activePaletteCount = useMemo(() => {
    return [selectedPaletteMain, selectedPaletteSub].filter(Boolean).length + selectedPaletteColors.length;
  }, [selectedPaletteMain, selectedPaletteSub, selectedPaletteColors.length]);

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

  useEffect(() => {
    void loadPresets();
    void searchFilms({ query: "", silent: true, updateFacets: true });
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

        <section className="heroCard">
          <div className="stepBadge">필름 제한 프리셋</div>
          <h1>보여줄 필름 묶음 만들기</h1>
          <p>
            자주 쓰는 추천 필름을 프리셋 이름으로 저장해두고, 고객 링크 생성 시 바로 선택할 수 있습니다.
          </p>
        </section>

        <div className="layout">
          <section className="panel formPanel">
            <div className="sectionTitleRow compactTitle">
              <div>
                <h2>{editingId ? "프리셋 수정" : "새 프리셋 만들기"}</h2>
                <p>프리셋 이름을 입력하고 고객에게 보여줄 필름을 담아주세요.</p>
              </div>
              {editingId ? <span>수정 중</span> : <span>새 프리셋</span>}
            </div>

            <label className="presetNameField">
              <span>프리셋 이름설정</span>
              <input
                value={presetName}
                onChange={(event) => setPresetName(event.target.value)}
                placeholder="예: 화이트 추천 20종, 우드 인기색 모음"
              />
            </label>

            <div className="fieldSectionLabel">프리셋 할 제품 찾기</div>

            <div className="filmPicker">
              <form
                onSubmit={(event) => {
                  event.preventDefault();
                  void searchFilms({ updateFacets: false });
                }}
                className="searchRow"
              >
                <input
                  value={filmQuery}
                  onChange={(event) => setFilmQuery(event.target.value)}
                  placeholder="제품번호/색상명 검색 예: 122, 화이트, SG"
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

              <div className="pickerStatusBar">
                <span>검색 결과 {filmSearchResults.length}개</span>
                <strong>선택한 필름 {selectedFilms.length}개</strong>
              </div>

              {selectedFilms.length > 0 ? (
                <div className="selectedFilmList" aria-label="선택한 필름 목록">
                  {selectedFilms.map((film) => (
                    <button
                      key={film.id}
                      type="button"
                      onClick={() => removeFilm(film.id)}
                      title="누르면 선택 해제"
                    >
                      {getFilmName(film)} ×
                    </button>
                  ))}
                </div>
              ) : (
                <div className="hintBox compactHint">
                  검색 결과에서 필름을 누르면 프리셋에 담깁니다.
                </div>
              )}

              <div className="filmList">
                {filmSearchResults.map((film) => {
                  const active = selectedFilmIds.has(film.id);
                  const thumb = getFilmThumbUrl(film);

                  return (
                    <button
                      key={film.id}
                      type="button"
                      onClick={() => toggleFilm(film)}
                      className={`filmRow ${active ? "filmRowActive" : ""}`}
                    >
                      <div className="filmThumb">
                        {thumb ? (
                          <img
                            src={thumb}
                            alt={getFilmName(film)}
                            loading="lazy"
                            decoding="async"
                          />
                        ) : null}
                      </div>
                      <div className="filmInfo">
                        <div className="filmName">{getFilmName(film)}</div>
                        <div className="filmMeta">{getFilmCode(film) || film.manufacturer}</div>
                        <div className="filmPaletteMeta">
                          {[film.palette_main, film.palette_sub, film.palette_color].filter(Boolean).join(" · ")}
                        </div>
                      </div>
                      <div className="filmAction">{active ? "선택됨" : "담기"}</div>
                    </button>
                  );
                })}
              </div>
            </div>

            {error ? <div className="errorBox">{error}</div> : null}
            {message ? <div className="messageBox">{message}</div> : null}

            <div className="actionRow">
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

          <aside className="panel listPanel">
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
      </div>

      <SimulatorLinkTabs active="presets" />

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

        .activeFilterList,
        .selectedFilmList {
          display: flex;
          gap: 8px;
          overflow-x: auto;
          padding-bottom: 2px;
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

        .filmList {
          display: grid;
          gap: 8px;
          max-height: 560px;
          overflow: auto;
          padding-right: 2px;
        }

        .filmRow {
          width: 100%;
          display: grid;
          grid-template-columns: 64px minmax(0, 1fr) 70px;
          gap: 10px;
          align-items: center;
          border: 1px solid ${COLORS.line};
          border-radius: 18px;
          background: rgba(255, 255, 255, 0.045);
          color: ${COLORS.white};
          cursor: pointer;
          text-align: left;
          padding: 8px;
        }

        .filmRowActive {
          border-color: rgba(238, 224, 197, 0.86);
          background: rgba(238, 224, 197, 0.14);
          box-shadow: 0 0 0 2px rgba(238, 224, 197, 0.14) inset;
        }

        .filmThumb {
          width: 64px;
          height: 64px;
          overflow: hidden;
          border-radius: 14px;
          border: 1px solid ${COLORS.line};
          background: rgba(255, 255, 255, 0.06);
        }

        .filmThumb img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
        }

        .filmInfo {
          min-width: 0;
        }

        .filmName {
          color: ${COLORS.cream};
          font-size: 14px;
          font-weight: 900;
          line-height: 1.32;
          word-break: keep-all;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }

        .filmMeta,
        .filmPaletteMeta {
          color: ${COLORS.soft};
          font-size: 11px;
          margin-top: 3px;
          line-height: 1.3;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .filmPaletteMeta {
          color: rgba(238, 224, 197, 0.74);
        }

        .filmAction {
          justify-self: end;
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.08);
          color: ${COLORS.soft};
          border: 1px solid ${COLORS.line};
          padding: 8px 9px;
          font-size: 12px;
          font-weight: 900;
          white-space: nowrap;
        }

        .filmRowActive .filmAction {
          background: ${COLORS.cream};
          color: ${COLORS.creamText};
          border-color: ${COLORS.cream};
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

          .filmList {
            max-height: 470px;
          }

          .filmRow {
            grid-template-columns: 54px minmax(0, 1fr) 58px;
            gap: 8px;
            padding: 7px;
            border-radius: 16px;
          }

          .filmThumb {
            width: 54px;
            height: 54px;
            border-radius: 12px;
          }

          .filmName {
            font-size: 13px;
            -webkit-line-clamp: 1;
          }

          .filmAction {
            padding: 7px 7px;
            font-size: 11px;
          }
        }
      `}</style>
    </main>
  );
}
