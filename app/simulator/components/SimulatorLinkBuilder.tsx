"use client";

import { useEffect, useMemo, useState } from "react";
import SimulatorLinkTabs from "./SimulatorLinkTabs";
import type { SimulatorFilm, SimulatorSpace } from "../types";

type BootstrapResponse = {
  spaces?: SimulatorSpace[];
  films?: SimulatorFilm[];
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
  };
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

function getSpaceThumb(space: SimulatorSpace) {
  return space.thumbnail_url || space.overlay_image_url || space.base_image_url || "";
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

  const [filmScope, setFilmScope] = useState<"all" | "custom">("all");
  const [filmQuery, setFilmQuery] = useState("");
  const [filmLoading, setFilmLoading] = useState(false);
  const [filmSearchResults, setFilmSearchResults] = useState<SimulatorFilm[]>([]);
  const [selectedFilms, setSelectedFilms] = useState<SimulatorFilm[]>([]);

  const [result, setResult] = useState<LinkResult | null>(null);

  const selectedFilmIds = useMemo(() => {
    return new Set(selectedFilms.map((film) => film.id));
  }, [selectedFilms]);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError("");

      try {
        const [whoamiRes, bootstrapRes] = await Promise.all([
          fetch("/api/whoami", { cache: "no-store" }),
          fetch("/api/simulator/bootstrap", { cache: "no-store" }),
        ]);

        const whoami = await whoamiRes.json();
        const bootstrap = (await bootstrapRes.json()) as BootstrapResponse;

        if (cancelled) return;

        if (whoami?.name) {
          setInstallerName(whoami.name);
        }

        const nextSpaces = Array.isArray(bootstrap.spaces) ? bootstrap.spaces : [];
        const nextFilms = Array.isArray(bootstrap.films) ? bootstrap.films : [];

        setSpaces(nextSpaces);
        setSelectedSpaceIds(nextSpaces[0]?.id ? [nextSpaces[0].id] : []);
        setFilmSearchResults(nextFilms);
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

  const searchFilms = async () => {
    const q = filmQuery.trim();
    setFilmLoading(true);
    setError("");

    try {
      const params = new URLSearchParams();
      if (q) params.set("q", q);

      const res = await fetch(`/api/simulator/films?${params.toString()}`, {
        cache: "no-store",
      });
      const json = await res.json();

      if (!res.ok) {
        setError(json.error || "필름 검색 중 오류가 발생했습니다.");
        return;
      }

      setFilmSearchResults(Array.isArray(json.items) ? json.items : []);
    } catch {
      setError("필름 검색 중 오류가 발생했습니다.");
    } finally {
      setFilmLoading(false);
    }
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
        <a href="/dashboard" className="backButton">
          ← 대시보드
        </a>

        <section className="heroCard">
          <div className="stepBadge">고객 링크 생성</div>
          <h1>시뮬레이션 링크 만들기</h1>
          <p>
            고객에게 보낼 7일짜리 시뮬레이터 링크를 만듭니다. 공간과 필름 범위를 링크별로 제한할 수 있습니다.
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
                    <option value={3}>3일</option>
                    <option value={7}>7일</option>
                    <option value={14}>14일</option>
                    <option value={30}>30일</option>
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

                      return (
                        <button
                          key={space.id}
                          type="button"
                          onClick={() => toggleSpace(space.id)}
                          className={`spaceCard ${active ? "spaceCardActive" : ""}`}
                        >
                          <div className="spaceThumb">
                            {thumb ? <img src={thumb} alt={space.name} /> : null}
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
                    <p>전체 삼성필름을 허용하거나, 고객이 볼 수 있는 필름만 직접 고를 수 있습니다.</p>
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
                    onClick={() => setFilmScope("custom")}
                    className={filmScope === "custom" ? "scopeActive" : ""}
                  >
                    선택한 필름만 허용
                  </button>
                </div>

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
                    {filmScope === "all" ? "삼성필름 전체" : `${selectedFilms.length}개`}
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
          width: 100%;
          aspect-ratio: 1536 / 1024;
          overflow: hidden;
          border-radius: 15px;
          border: 1px solid ${COLORS.line};
          background: rgba(255, 255, 255, 0.06);
        }

        .spaceThumb img,
        .filmThumb img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
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
          grid-template-columns: 1fr 1fr;
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

        .customFilmBox {
          margin-top: 12px;
        }

        .searchRow {
          display: flex;
          gap: 8px;
          margin-bottom: 10px;
        }

        .searchRow button,
        .createButton,
        .resultActions button,
        .resultActions a {
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
          .resultActions {
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
