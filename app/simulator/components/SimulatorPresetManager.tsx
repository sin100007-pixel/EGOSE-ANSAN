"use client";

import { useEffect, useMemo, useState } from "react";
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

function getFilmName(film: SimulatorFilm) {
  return film.full_name || film.product_code_1 || film.color_name || "필름";
}

function getFilmCode(film: SimulatorFilm) {
  return [film.product_code_1, film.product_code_2].filter(Boolean).join(" / ");
}

function getFilmThumbUrl(film: SimulatorFilm) {
  return film.thumb_url || film.image_url || "";
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
  const [presets, setPresets] = useState<PresetSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState("");
  const [loadingPresetId, setLoadingPresetId] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const [editingId, setEditingId] = useState("");
  const [presetName, setPresetName] = useState("");
  const [description, setDescription] = useState("");

  const [filmQuery, setFilmQuery] = useState("");
  const [filmLoading, setFilmLoading] = useState(false);
  const [filmSearchResults, setFilmSearchResults] = useState<SimulatorFilm[]>([]);
  const [selectedFilms, setSelectedFilms] = useState<SimulatorFilm[]>([]);

  const selectedFilmIds = useMemo(() => {
    return new Set(selectedFilms.map((film) => film.id));
  }, [selectedFilms]);

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

  useEffect(() => {
    void loadPresets();
    void searchFilms("", true);
  }, []);

  const searchFilms = async (query?: string, silent = false) => {
    const q = typeof query === "string" ? query.trim() : filmQuery.trim();

    if (!silent) {
      setFilmLoading(true);
      setError("");
    }

    try {
      const params = new URLSearchParams();
      if (q) params.set("q", q);
      params.set("skip_facets", "1");

      const res = await fetch(`/api/simulator/films?${params.toString()}`, {
        cache: "no-store",
      });
      const json = await res.json();

      if (!res.ok) {
        if (!silent) setError(json.error || "필름 검색 중 오류가 발생했습니다.");
        return;
      }

      setFilmSearchResults(Array.isArray(json.items) ? json.items : []);
    } catch {
      if (!silent) setError("필름 검색 중 오류가 발생했습니다.");
    } finally {
      if (!silent) setFilmLoading(false);
    }
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

  const resetForm = () => {
    setEditingId("");
    setPresetName("");
    setDescription("");
    setSelectedFilms([]);
    setMessage("");
    setError("");
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
          description,
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
      setDescription(detail.description || "");
      setSelectedFilms(Array.isArray(detail.films) ? detail.films : []);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch {
      setError("프리셋 내용을 불러오지 못했습니다.");
    } finally {
      setLoadingPresetId("");
    }
  };

  const deletePreset = async (preset: PresetSummary) => {
    const ok = window.confirm(
      `${preset.name} 프리셋을 삭제할까요?\n기존 고객 링크가 이 프리셋을 사용 중이면 링크에는 기존 프리셋 내용이 유지됩니다.`
    );

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
        <a href="/dashboard" className="backButton">
          ← 대시보드
        </a>

        <section className="heroCard">
          <div className="stepBadge">필름 제한 프리셋</div>
          <h1>보여줄 필름 묶음 만들기</h1>
          <p>
            자주 쓰는 추천 필름을 프리셋으로 저장해두면, 고객 링크 생성 시 프리셋만 선택해서 필름 노출 범위를 빠르게 제한할 수 있습니다.
          </p>
        </section>

        <div className="layout">
          <section className="panel formPanel">
            <div className="sectionTitleRow">
              <div>
                <h2>{editingId ? "프리셋 수정" : "새 프리셋 만들기"}</h2>
                <p>프리셋 이름을 정하고 고객에게 보여줄 필름을 선택하세요.</p>
              </div>
              {editingId ? <span>수정 중</span> : <span>새 프리셋</span>}
            </div>

            <div className="fieldGrid">
              <label>
                <span>프리셋 이름</span>
                <input
                  value={presetName}
                  onChange={(event) => setPresetName(event.target.value)}
                  placeholder="예: 화이트 추천 20종"
                />
              </label>

              <label>
                <span>설명</span>
                <input
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  placeholder="예: 밝은 주방/붙박이장 고객용"
                />
              </label>
            </div>

            <div className="filmPicker">
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
                  placeholder="예: 122, 화이트, 우드, SG"
                />
                <button type="submit">{filmLoading ? "검색중" : "검색"}</button>
              </form>

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
                  아직 선택한 필름이 없습니다. 검색 결과에서 필름을 눌러 프리셋에 담아주세요.
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
                      {active ? <div className="selectedMark">선택됨</div> : null}
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
                      <p>{preset.description || "설명 없음"}</p>
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
        }

        h1 {
          margin: 0;
          font-size: clamp(28px, 5vw, 44px);
          line-height: 1.08;
          letter-spacing: -0.04em;
        }

        .heroCard p,
        .sectionTitleRow p,
        .presetCard p {
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

        .fieldGrid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 12px;
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

        .filmPicker {
          margin-top: 18px;
        }

        .searchRow {
          display: grid;
          grid-template-columns: minmax(0, 1fr) 92px;
          gap: 8px;
        }

        .searchRow button,
        .saveButton,
        .cancelButton,
        .refreshButton,
        .presetActions button {
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
        .deleteButton {
          background: rgba(255, 255, 255, 0.08);
          color: ${COLORS.white};
          border: 1px solid ${COLORS.line};
        }

        .selectedFilmList {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          margin-top: 12px;
        }

        .selectedFilmList button {
          border: 1px solid rgba(238, 224, 197, 0.48);
          border-radius: 999px;
          background: rgba(238, 224, 197, 0.16);
          color: ${COLORS.cream};
          padding: 8px 11px;
          font-size: 12px;
          font-weight: 900;
          cursor: pointer;
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

        .filmGrid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(132px, 1fr));
          gap: 10px;
          margin-top: 12px;
          max-height: 520px;
          overflow: auto;
          padding-right: 2px;
        }

        .filmCard {
          position: relative;
          border: 1px solid ${COLORS.line};
          border-radius: 18px;
          background: rgba(255, 255, 255, 0.045);
          color: ${COLORS.white};
          cursor: pointer;
          text-align: left;
          padding: 8px;
        }

        .filmCardActive {
          border-color: rgba(238, 224, 197, 0.8);
          background: rgba(238, 224, 197, 0.16);
          box-shadow: 0 0 0 2px rgba(238, 224, 197, 0.18) inset;
        }

        .filmThumb {
          width: 100%;
          aspect-ratio: 1 / 1;
          overflow: hidden;
          border-radius: 13px;
          border: 1px solid ${COLORS.line};
          background: rgba(255, 255, 255, 0.06);
        }

        .filmThumb img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
        }

        .filmName {
          color: ${COLORS.cream};
          font-size: 13px;
          font-weight: 900;
          line-height: 1.35;
          margin-top: 8px;
          word-break: keep-all;
        }

        .filmMeta {
          color: ${COLORS.soft};
          font-size: 11px;
          margin-top: 4px;
          line-height: 1.35;
        }

        .selectedMark {
          position: absolute;
          top: 12px;
          right: 12px;
          border-radius: 999px;
          background: ${COLORS.cream};
          color: ${COLORS.creamText};
          padding: 5px 7px;
          font-size: 11px;
          font-weight: 900;
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
        }

        .presetCard p {
          margin: 6px 0 0;
          font-size: 13px;
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

        @media (max-width: 860px) {
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

          .fieldGrid {
            grid-template-columns: 1fr;
          }

          .filmGrid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
            max-height: 480px;
          }
        }
      `}</style>
    </main>
  );
}
