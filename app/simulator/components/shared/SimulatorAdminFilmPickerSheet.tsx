"use client";

import { useEffect, useRef } from "react";

import type { SimulatorFilm } from "../../types";
import {
  PALETTE_COLOR_SWATCH,
  PALETTE_MAIN_OPTIONS,
  getFilmCode,
  getFilmName,
  getFilmThumbUrl,
} from "../../lib/client-utils";

type SimulatorAdminFilmPickerSheetProps = {
  title: string;
  subtitle: string;
  films: SimulatorFilm[];
  selectedFilms: SimulatorFilm[];
  filmQuery: string;
  filmLoading: boolean;
  filmError?: string;
  selectedPaletteMain: string;
  selectedPaletteSub: string;
  selectedPaletteColors: string[];
  paletteMainOptions?: string[];
  paletteSubOptions: string[];
  paletteColorOptions: string[];
  previewSampleFilm: SimulatorFilm | null;
  emptyText?: string;
  doneLabel?: string;
  guideTarget?: string;
  onClose: () => void;
  onResetPaletteFilters: () => void;
  onPaletteMainClick: (value: string) => void;
  onPaletteSubClick: (value: string) => void;
  onPaletteColorClick: (value: string) => void;
  onFilmQueryChange: (value: string) => void;
  onSearchFilms: () => void;
  onToggleFilm: (film: SimulatorFilm) => void;
  onRemoveSelectedFilm: (filmId: number) => void;
  onToggleSamplePreview: (film: SimulatorFilm) => void;
  onCloseSamplePreview: () => void;
};

export default function SimulatorAdminFilmPickerSheet({
  title,
  films,
  selectedFilms,
  filmQuery,
  filmLoading,
  filmError = "",
  selectedPaletteMain,
  selectedPaletteSub,
  selectedPaletteColors,
  paletteMainOptions,
  paletteSubOptions,
  paletteColorOptions,
  previewSampleFilm,
  emptyText = "표시할 필름이 없습니다.",
  doneLabel = "선택 완료",
  guideTarget,
  onClose,
  onResetPaletteFilters,
  onPaletteMainClick,
  onPaletteSubClick,
  onPaletteColorClick,
  onFilmQueryChange,
  onSearchFilms,
  onToggleFilm,
  onRemoveSelectedFilm,
  onToggleSamplePreview,
  onCloseSamplePreview,
}: SimulatorAdminFilmPickerSheetProps) {
  const selectedFilmIds = new Set(selectedFilms.map((film) => film.id));
  const selectedChipsRef = useRef<HTMLDivElement | null>(null);
  const lastSelectedChipRef = useRef<HTMLButtonElement | null>(null);
  const selectedLastFilmId = selectedFilms[selectedFilms.length - 1]?.id ?? 0;
  const mainOptions =
    paletteMainOptions && paletteMainOptions.length > 0
      ? paletteMainOptions
      : PALETTE_MAIN_OPTIONS;
  const hasActiveFilter = Boolean(
    selectedPaletteMain ||
    selectedPaletteSub ||
    selectedPaletteColors.length > 0 ||
    filmQuery.trim(),
  );

  useEffect(() => {
    const selectedChips = selectedChipsRef.current;
    if (!selectedChips || selectedFilms.length === 0) return;

    const frameId = window.requestAnimationFrame(() => {
      const lastChip = lastSelectedChipRef.current;

      if (lastChip) {
        lastChip.scrollIntoView({
          block: "nearest",
          inline: "nearest",
        });
      }

      selectedChips.scrollTop = selectedChips.scrollHeight;
    });

    return () => window.cancelAnimationFrame(frameId);
  }, [selectedFilms.length, selectedLastFilmId]);

  useEffect(() => {
    const html = document.documentElement;
    const body = document.body;
    const prevHtmlOverflowX = html.style.overflowX;
    const prevBodyOverflowX = body.style.overflowX;
    const prevBodyTouchAction = body.style.touchAction;

    html.style.overflowX = "hidden";
    body.style.overflowX = "hidden";
    body.style.touchAction = "pan-y";

    return () => {
      html.style.overflowX = prevHtmlOverflowX;
      body.style.overflowX = prevBodyOverflowX;
      body.style.touchAction = prevBodyTouchAction;
    };
  }, []);

  return (
    <div
      className="adminFilmSheetOverlay"
      role="presentation"
      onClick={onClose}
    >
      <section
        className="adminFilmSheet"
        data-sim-admin-guide={guideTarget}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="adminFilmSheetTopBar">
          <div className="adminFilmSheetHandle" aria-hidden="true" />
          <button
            type="button"
            onClick={onClose}
            className="adminFilmSheetCloseButton"
          >
            닫기
          </button>
        </div>

        <div className="adminFilmPalettePanel">
          <div className="adminFilmPaletteGroup">
            <div className="adminFilmPaletteHeaderRow">
              <span>1차 분류</span>
              {hasActiveFilter ? (
                <button
                  type="button"
                  onClick={onResetPaletteFilters}
                  className="adminFilmPaletteResetButton"
                >
                  초기화
                </button>
              ) : null}
            </div>

            <div className="adminFilmPaletteChipRow">
              {mainOptions.map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => onPaletteMainClick(item)}
                  className={`adminFilmPaletteChip ${selectedPaletteMain === item ? "adminFilmPaletteChipActive" : ""}`}
                >
                  {item}
                </button>
              ))}
            </div>
          </div>

          {selectedPaletteMain ? (
            <div className="adminFilmPaletteGroup">
              <div className="adminFilmPaletteHeaderRow">
                <span>2차 분류</span>
                <em>선택사항</em>
              </div>

              <div className="adminFilmPaletteChipRow">
                <button
                  type="button"
                  onClick={() => onPaletteSubClick("")}
                  className={`adminFilmPaletteChip ${!selectedPaletteSub ? "adminFilmPaletteChipActive" : ""}`}
                >
                  전체
                </button>

                {paletteSubOptions.map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => onPaletteSubClick(item)}
                    className={`adminFilmPaletteChip ${selectedPaletteSub === item ? "adminFilmPaletteChipActive" : ""}`}
                  >
                    {item}
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          <div className="adminFilmPaletteGroup">
            <div className="adminFilmPaletteHeaderRow">
              <span>색상 팔레트</span>
              <em>
                {selectedPaletteColors.length > 0
                  ? selectedPaletteColors.join(", ")
                  : "전체"}
              </em>
            </div>

            <div className="adminFilmPaletteColorRow">
              {paletteColorOptions.map((item) => {
                const active = selectedPaletteColors.includes(item);

                return (
                  <button
                    key={item}
                    type="button"
                    onClick={() => onPaletteColorClick(item)}
                    className={`adminFilmPaletteColorChip ${active ? "adminFilmPaletteColorChipActive" : ""}`}
                    aria-label={`${item}${active ? " 선택됨" : ""}`}
                    aria-pressed={active}
                    title={item}
                  >
                    <i
                      aria-hidden="true"
                      style={{
                        background: PALETTE_COLOR_SWATCH[item] || "#DDD",
                      }}
                    />
                    {active ? <span aria-hidden="true">✓</span> : null}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <form
          onSubmit={(event) => {
            event.preventDefault();
            onSearchFilms();
          }}
          className="adminFilmSheetSearchForm"
        >
          <input
            value={filmQuery}
            onChange={(event) => onFilmQueryChange(event.target.value)}
            placeholder="예: 122, SG122, 화이트"
            className="adminFilmSheetSearchInput"
          />

          <button type="submit" className="adminFilmSheetSearchButton">
            검색
          </button>
        </form>

        <div className="adminFilmSheetStatusBar">
          <span>검색 결과 {films.length}개</span>
          <strong>선택한 필름 {selectedFilms.length}개</strong>
        </div>

        {selectedFilms.length > 0 ? (
          <div
            ref={selectedChipsRef}
            className="adminFilmSheetSelectedChips"
            aria-label="선택한 필름 목록"
          >
            {selectedFilms.map((film, index) => {
              const isLastSelected = index === selectedFilms.length - 1;

              return (
                <button
                  key={film.id}
                  ref={isLastSelected ? lastSelectedChipRef : null}
                  type="button"
                  onClick={() => onRemoveSelectedFilm(film.id)}
                >
                  {getFilmName(film)} ×
                </button>
              );
            })}
          </div>
        ) : (
          <div className="adminFilmSheetSelectedEmpty">
            검색 결과에서 필름을 누르면 선택됩니다.
          </div>
        )}

        {filmError ? (
          <div className="adminFilmSheetError">{filmError}</div>
        ) : null}

        <div className="adminFilmSheetGrid" aria-busy={filmLoading}>
          {filmLoading ? (
            Array.from({ length: 8 }).map((_, index) => (
              <div
                key={`admin-film-skeleton-${index}`}
                className="adminFilmSheetSkeletonItem"
                aria-hidden="true"
              >
                <div className="adminFilmSheetSkeletonThumb" />
                <div className="adminFilmSheetSkeletonLine" />
                <div className="adminFilmSheetSkeletonLine short" />
              </div>
            ))
          ) : films.length > 0 ? (
            films.map((film) => {
              const active = selectedFilmIds.has(film.id);
              const thumbUrl = getFilmThumbUrl(film);

              return (
                <div
                  key={film.id}
                  className={`adminFilmSheetItem ${active ? "adminFilmSheetItemActive" : ""}`}
                >
                  <button
                    type="button"
                    onClick={() => onToggleFilm(film)}
                    className="adminFilmSheetSelectButton"
                  >
                    <div className="adminFilmSheetThumb">
                      {thumbUrl ? (
                        <img
                          src={thumbUrl}
                          alt={getFilmName(film)}
                          loading="lazy"
                          decoding="async"
                        />
                      ) : null}
                    </div>

                    <div className="adminFilmSheetName">
                      {getFilmName(film)}
                    </div>
                    {getFilmCode(film) ? (
                      <div className="adminFilmSheetCode">
                        {getFilmCode(film)}
                      </div>
                    ) : null}
                    <div className="adminFilmSheetSelectBadge">
                      {active ? "선택됨" : "선택"}
                    </div>
                  </button>

                  {film.sample_url ? (
                    <div className="adminFilmSheetActionRow">
                      <button
                        type="button"
                        onClick={() => onToggleSamplePreview(film)}
                        className={`adminFilmSheetSampleButton ${previewSampleFilm?.id === film.id ? "adminFilmSheetSampleButtonActive" : ""}`}
                      >
                        샘플
                      </button>
                    </div>
                  ) : null}
                </div>
              );
            })
          ) : (
            <div className="adminFilmSheetEmptyBox">{emptyText}</div>
          )}
        </div>

        <div className="adminFilmSheetFooter">
          <button type="button" onClick={onClose}>
            {doneLabel}
          </button>
        </div>

        {previewSampleFilm?.sample_url ? (
          <div
            className="adminFilmSheetSampleBackdrop"
            onClick={onCloseSamplePreview}
          >
            <div
              className="adminFilmSheetSampleBubble"
              onClick={(event) => event.stopPropagation()}
            >
              <button
                type="button"
                onClick={onCloseSamplePreview}
                className="adminFilmSheetSampleClose"
              >
                닫기
              </button>

              <div className="adminFilmSheetSampleLabel">필름봇 샘플사진</div>
              <div className="adminFilmSheetSampleTitle">
                {getFilmName(previewSampleFilm)}
              </div>
              {getFilmCode(previewSampleFilm) ? (
                <div className="adminFilmSheetSampleCode">
                  {getFilmCode(previewSampleFilm)}
                </div>
              ) : null}

              <div className="adminFilmSheetSampleImageWrap">
                <img
                  src={previewSampleFilm.sample_url}
                  alt={`${getFilmName(previewSampleFilm)} 샘플사진`}
                  loading="lazy"
                  decoding="async"
                />
              </div>
            </div>
          </div>
        ) : null}
      </section>

      <style jsx global>{`
        .adminFilmSheetOverlay {
          position: fixed;
          inset: 0;
          z-index: 10030;
          background: rgba(0, 0, 0, 0.48);
          display: flex;
          align-items: flex-end;
          justify-content: center;
          padding: 4px 6px 6px;
        }

        .adminFilmSheet {
          width: min(820px, calc(100vw - 12px));
          height: min(96dvh, 920px);
          max-height: min(96dvh, 920px);
          overflow: hidden;
          border-radius: 24px;
          background: rgba(8, 5, 62, 0.98);
          border: 1px solid rgba(238, 224, 197, 0.22);
          box-shadow: 0 -20px 70px rgba(0, 0, 0, 0.45);
          padding: 10px;
          display: flex;
          flex-direction: column;
          color: #fff;
          box-sizing: border-box;
        }

        .adminFilmSheetTopBar {
          position: relative;
          min-height: 34px;
          margin-bottom: 6px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .adminFilmSheetHandle {
          width: 44px;
          height: 5px;
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.28);
        }

        .adminFilmSheetCloseButton {
          position: absolute;
          right: 0;
          top: 0;
          flex-shrink: 0;
          border: 1px solid rgba(238, 224, 197, 0.18);
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.075);
          color: #fff;
          padding: 8px 12px;
          font-size: 13px;
          font-weight: 900;
          cursor: pointer;
        }

        .adminFilmPalettePanel {
          border-radius: 18px;
          padding: 8px;
          background: rgba(255, 255, 255, 0.045);
          border: 1px solid rgba(238, 224, 197, 0.16);
          margin-bottom: 7px;
          display: grid;
          gap: 7px;
        }

        .adminFilmPaletteGroup {
          display: grid;
          gap: 6px;
        }

        .adminFilmPaletteHeaderRow {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
        }

        .adminFilmPaletteHeaderRow span {
          color: #eee0c5;
          font-size: 12px;
          font-weight: 900;
        }

        .adminFilmPaletteHeaderRow em {
          color: rgba(255, 255, 255, 0.72);
          font-size: 11px;
          font-style: normal;
          font-weight: 800;
        }

        .adminFilmPaletteChipRow,
        .adminFilmPaletteColorRow {
          display: flex;
          gap: 6px;
          overflow-x: auto;
          padding-bottom: 0;
          -webkit-overflow-scrolling: touch;
        }

        .adminFilmSheetSelectedChips {
          width: 100%;
          max-width: 100%;
          min-width: 0;
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
          overflow-x: hidden;
          overflow-y: auto;
          max-height: 68px;
          padding: 1px 2px 2px;
          box-sizing: border-box;
          overscroll-behavior: contain;
          -webkit-overflow-scrolling: touch;
        }

        .adminFilmPaletteChip,
        .adminFilmPaletteColorChip,
        .adminFilmPaletteResetButton {
          flex: 0 0 auto;
          border: 1px solid rgba(238, 224, 197, 0.16);
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.06);
          color: #fff;
          font-size: 12px;
          font-weight: 900;
          cursor: pointer;
          white-space: nowrap;
        }

        .adminFilmPaletteChip {
          padding: 7px 10px;
        }

        .adminFilmPaletteChipActive,
        .adminFilmPaletteColorChipActive {
          border-color: rgba(238, 224, 197, 0.92);
          background: #eee0c5;
          color: #05023b;
          box-shadow:
            0 0 0 2px rgba(238, 224, 197, 0.22),
            0 8px 16px rgba(0, 0, 0, 0.22);
        }

        .adminFilmPaletteResetButton {
          padding: 6px 9px;
          color: #eee0c5;
        }

        .adminFilmPaletteColorChip {
          position: relative;
          width: 34px;
          min-height: 32px;
          padding: 5px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
        }

        .adminFilmPaletteColorChip i {
          width: 20px;
          height: 20px;
          border-radius: 999px;
          border: 1px solid rgba(255, 255, 255, 0.35);
          box-shadow: inset 0 0 0 1px rgba(0, 0, 0, 0.08);
        }

        .adminFilmPaletteColorChip span {
          position: absolute;
          right: -4px;
          top: -5px;
          width: 18px;
          height: 18px;
          border-radius: 999px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          background: #05023b;
          border: 1px solid rgba(238, 224, 197, 0.95);
          color: #eee0c5;
          font-size: 12px;
          font-weight: 1000;
        }

        .adminFilmSheetSearchForm {
          display: flex;
          gap: 7px;
          margin-bottom: 7px;
        }

        .adminFilmSheetSearchInput {
          min-width: 0;
          flex: 1;
          border-radius: 13px;
          border: 1px solid rgba(238, 224, 197, 0.16);
          background: rgba(255, 255, 255, 0.06);
          color: #fff;
          padding: 8px 10px;
          font-size: 16px;
          outline: none;
        }

        .adminFilmSheetSearchInput::placeholder {
          color: rgba(255, 255, 255, 0.42);
        }

        .adminFilmSheetSearchButton {
          border: none;
          border-radius: 13px;
          padding: 0 13px;
          background: #eee0c5;
          color: #7a5a34;
          font-size: 13px;
          font-weight: 900;
          cursor: pointer;
          white-space: nowrap;
          min-height: 36px;
        }

        .adminFilmSheetStatusBar {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 10px;
          border-radius: 14px;
          padding: 7px 10px;
          background: rgba(255, 255, 255, 0.045);
          border: 1px solid rgba(238, 224, 197, 0.14);
          margin-bottom: 6px;
          color: rgba(255, 255, 255, 0.78);
          font-size: 12px;
          font-weight: 900;
        }

        .adminFilmSheetStatusBar strong {
          color: #eee0c5;
        }

        .adminFilmSheetSelectedChips {
          margin-bottom: 6px;
        }

        .adminFilmSheetSelectedChips button {
          flex: 0 1 auto;
          max-width: 100%;
          min-width: 0;
          border: 1px solid rgba(238, 224, 197, 0.32);
          border-radius: 999px;
          padding: 7px 10px;
          background: rgba(238, 224, 197, 0.1);
          color: #eee0c5;
          font-size: 12px;
          font-weight: 900;
          cursor: pointer;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .adminFilmSheetSelectedEmpty,
        .adminFilmSheetError {
          border-radius: 14px;
          padding: 8px 10px;
          margin-bottom: 6px;
          font-size: 12px;
          font-weight: 800;
          line-height: 1.45;
        }

        .adminFilmSheetSelectedEmpty {
          background: rgba(238, 224, 197, 0.08);
          color: rgba(255, 255, 255, 0.72);
          border: 1px dashed rgba(238, 224, 197, 0.22);
        }

        .adminFilmSheetError {
          background: rgba(255, 60, 60, 0.12);
          color: #ffd2d2;
          border: 1px solid rgba(255, 120, 120, 0.35);
        }

        .adminFilmSheetGrid {
          flex: 1;
          min-height: 0;
          overflow-y: auto;
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          align-content: start;
          align-items: start;
          grid-auto-rows: max-content;
          gap: 8px;
          padding: 2px 2px 8px 2px;
          overscroll-behavior: contain;
          -webkit-overflow-scrolling: touch;
          scrollbar-width: thin;
          scrollbar-color: rgba(238, 224, 197, 0.55) rgba(255, 255, 255, 0.06);
        }

        .adminFilmSheetGrid::-webkit-scrollbar {
          width: 6px;
        }

        .adminFilmSheetGrid::-webkit-scrollbar-track {
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.06);
        }

        .adminFilmSheetGrid::-webkit-scrollbar-thumb {
          border-radius: 999px;
          background: rgba(238, 224, 197, 0.55);
        }

        .adminFilmSheetItem,
        .adminFilmSheetSkeletonItem {
          border: 1px solid rgba(238, 224, 197, 0.16);
          border-radius: 18px;
          background: rgba(255, 255, 255, 0.045);
          padding: 7px;
          align-self: start;
          position: relative;
        }

        .adminFilmSheetItem {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .adminFilmSheetItemActive {
          border-color: rgba(238, 224, 197, 0.78);
          background: rgba(238, 224, 197, 0.14);
          box-shadow: 0 0 0 2px rgba(238, 224, 197, 0.14);
        }

        .adminFilmSheetSelectButton {
          appearance: none;
          width: 100%;
          border: 0;
          background: transparent;
          padding: 0;
          text-align: left;
          color: inherit;
          cursor: pointer;
        }

        .adminFilmSheetThumb,
        .adminFilmSheetSkeletonThumb {
          width: 100%;
          aspect-ratio: 1 / 1;
          border-radius: 13px;
          overflow: hidden;
          border: 1px solid rgba(238, 224, 197, 0.16);
          background: rgba(255, 255, 255, 0.06);
          margin-bottom: 6px;
        }

        .adminFilmSheetThumb img {
          width: 100%;
          height: 100%;
          display: block;
          object-fit: cover;
        }

        .adminFilmSheetName {
          color: #eee0c5;
          font-size: 12px;
          line-height: 1.28;
          font-weight: 900;
          min-height: 30px;
          overflow: hidden;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          word-break: keep-all;
        }

        .adminFilmSheetCode {
          margin-top: 4px;
          color: rgba(255, 255, 255, 0.58);
          font-size: 10px;
          font-weight: 800;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .adminFilmSheetSelectBadge {
          margin-top: 6px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-height: 24px;
          border-radius: 999px;
          padding: 0 8px;
          background: rgba(238, 224, 197, 0.1);
          color: #eee0c5;
          border: 1px solid rgba(238, 224, 197, 0.2);
          font-size: 10px;
          font-weight: 900;
        }

        .adminFilmSheetItemActive .adminFilmSheetSelectBadge {
          background: #eee0c5;
          color: #05023b;
        }

        .adminFilmSheetActionRow {
          position: absolute;
          top: 11px;
          right: 11px;
          z-index: 2;
        }

        .adminFilmSheetSampleButton {
          min-height: 24px;
          border-radius: 999px;
          border: 1px solid rgba(238, 224, 197, 0.52);
          background: rgba(5, 2, 59, 0.72);
          color: #eee0c5;
          padding: 0 7px;
          font-size: 10px;
          font-weight: 900;
          letter-spacing: -0.02em;
          cursor: pointer;
          backdrop-filter: blur(4px);
        }

        .adminFilmSheetSampleButtonActive {
          background: rgba(238, 224, 197, 0.18);
          border-color: rgba(238, 224, 197, 0.42);
        }

        .adminFilmSheetSampleButton:disabled {
          color: rgba(255, 255, 255, 0.42);
          background: rgba(255, 255, 255, 0.05);
          border-color: rgba(255, 255, 255, 0.08);
          cursor: default;
        }

        .adminFilmSheetFooter {
          flex-shrink: 0;
          padding-top: 7px;
        }

        .adminFilmSheetFooter button {
          width: 100%;
          min-height: 42px;
          border: 0;
          border-radius: 15px;
          background: #eee0c5;
          color: #7a5a34;
          font-size: 14px;
          font-weight: 900;
          cursor: pointer;
        }

        .adminFilmSheetSkeletonItem,
        .adminFilmSheetSkeletonThumb,
        .adminFilmSheetSkeletonLine {
          position: relative;
          overflow: hidden;
        }

        .adminFilmSheetSkeletonItem::after,
        .adminFilmSheetSkeletonThumb::after,
        .adminFilmSheetSkeletonLine::after {
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
          animation: adminFilmSheetShimmer 1.25s infinite;
        }

        .adminFilmSheetSkeletonLine {
          height: 12px;
          margin-top: 8px;
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.09);
        }

        .adminFilmSheetSkeletonLine.short {
          width: 62%;
          height: 10px;
        }

        @keyframes adminFilmSheetShimmer {
          100% {
            transform: translateX(100%);
          }
        }

        .adminFilmSheetEmptyBox {
          grid-column: 1 / -1;
          border-radius: 18px;
          padding: 18px;
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid rgba(238, 224, 197, 0.16);
          color: rgba(255, 255, 255, 0.72);
          font-size: 14px;
          line-height: 1.7;
        }

        .adminFilmSheetSampleBackdrop {
          position: fixed;
          inset: 0;
          z-index: 10040;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
          background: rgba(5, 2, 35, 0.34);
          backdrop-filter: blur(3px);
        }

        .adminFilmSheetSampleBubble {
          width: min(320px, calc(100vw - 40px));
          max-height: calc(100dvh - 36px);
          overflow-y: auto;
          border-radius: 24px;
          border: 1px solid rgba(238, 224, 197, 0.18);
          background: linear-gradient(
            180deg,
            rgba(14, 12, 82, 0.98) 0%,
            rgba(8, 6, 64, 0.98) 100%
          );
          box-shadow: 0 18px 48px rgba(0, 0, 0, 0.34);
          padding: 18px;
          position: relative;
        }

        .adminFilmSheetSampleClose {
          position: absolute;
          top: 14px;
          right: 14px;
          border: 0;
          background: rgba(255, 255, 255, 0.08);
          color: #fff;
          border-radius: 999px;
          min-width: 54px;
          min-height: 32px;
          font-size: 12px;
          font-weight: 800;
          cursor: pointer;
        }

        .adminFilmSheetSampleLabel {
          color: rgba(238, 224, 197, 0.82);
          font-size: 11px;
          font-weight: 800;
          margin-bottom: 6px;
        }

        .adminFilmSheetSampleTitle {
          color: #eee0c5;
          font-size: 16px;
          line-height: 1.35;
          font-weight: 900;
          padding-right: 60px;
        }

        .adminFilmSheetSampleCode {
          color: rgba(255, 255, 255, 0.72);
          font-size: 12px;
          line-height: 1.35;
          margin-top: 4px;
          margin-bottom: 12px;
        }

        .adminFilmSheetSampleImageWrap {
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

        .adminFilmSheetSampleImageWrap img {
          width: 100%;
          height: 100%;
          display: block;
          object-fit: contain;
        }

        @media (max-width: 640px) {
          .adminFilmSheetOverlay {
            padding: 4px;
          }

          .adminFilmSheet {
            width: calc(100vw - 8px);
            height: calc(100dvh - 8px);
            max-height: calc(100dvh - 8px);
            border-radius: 20px;
            padding: 9px;
          }

          .adminFilmPalettePanel {
            border-radius: 16px;
            padding: 7px;
            gap: 7px;
          }

          .adminFilmPaletteChip {
            padding: 7px 10px;
            font-size: 11.5px;
          }

          .adminFilmSheetSearchInput,
          .adminFilmSheetSearchButton {
            min-height: 40px;
            border-radius: 13px;
          }

          .adminFilmSheetSearchInput {
            font-size: 16px;
          }

          .adminFilmSheetSearchButton {
            font-size: 13px;
          }

          .adminFilmSheetGrid {
            grid-template-columns: repeat(3, minmax(0, 1fr));
            gap: 7px;
          }

          .adminFilmSheetItem,
          .adminFilmSheetSkeletonItem {
            border-radius: 16px;
            padding: 7px;
          }

          .adminFilmSheetThumb,
          .adminFilmSheetSkeletonThumb {
            border-radius: 12px;
            margin-bottom: 6px;
          }

          .adminFilmSheetName {
            font-size: 11px;
            min-height: 29px;
          }

          .adminFilmSheetCode {
            display: none;
          }

          .adminFilmSheetActionRow {
            top: 10px;
            right: 10px;
          }

          .adminFilmSheetSampleButton {
            min-height: 22px;
            padding: 0 6px;
            font-size: 9px;
          }
        }
      `}</style>
    </div>
  );
}
