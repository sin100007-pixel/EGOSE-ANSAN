import type { SimulatorFilm } from "../../types";
import type { MaskZoneDefinition } from "../../lib/client-utils";
import {
  PALETTE_MAIN_OPTIONS,
  PALETTE_COLOR_SWATCH,
  getFilmCode,
  getFilmName,
  getFilmThumbUrl,
} from "../../lib/client-utils";

type SimulatorFilmSheetProps = {
  activeZone: MaskZoneDefinition | null;
  films: SimulatorFilm[];
  filmQuery: string;
  filmLoading: boolean;
  filmError: string;
  selectedFilm: SimulatorFilm | null;
  selectedPaletteMain: string;
  selectedPaletteSub: string;
  selectedPaletteColors: string[];
  paletteSubOptions: string[];
  paletteColorOptions: string[];
  applyingFilmId: number | null;
  previewSampleFilm: SimulatorFilm | null;
  onClose: () => void;
  onResetPaletteFilters: () => void;
  onPaletteMainClick: (value: string) => void;
  onPaletteSubClick: (value: string) => void;
  onPaletteColorClick: (value: string) => void;
  onFilmQueryChange: (value: string) => void;
  onSearchFilms: () => void;
  onFilmClick: (film: SimulatorFilm) => void;
  onToggleSamplePreview: (film: SimulatorFilm) => void;
  onCloseSamplePreview: () => void;
};

export default function SimulatorFilmSheet({
  activeZone,
  films,
  filmQuery,
  filmLoading,
  filmError,
  selectedFilm,
  selectedPaletteMain,
  selectedPaletteSub,
  selectedPaletteColors,
  paletteSubOptions,
  paletteColorOptions,
  applyingFilmId,
  previewSampleFilm,
  onClose,
  onResetPaletteFilters,
  onPaletteMainClick,
  onPaletteSubClick,
  onPaletteColorClick,
  onFilmQueryChange,
  onSearchFilms,
  onFilmClick,
  onToggleSamplePreview,
  onCloseSamplePreview,
}: SimulatorFilmSheetProps) {
  const isShowingRecommendedFilms =
    !filmQuery.trim() &&
    !selectedPaletteMain &&
    !selectedPaletteSub &&
    selectedPaletteColors.length === 0;

  return (
    <div className="sheetOverlay" role="presentation" onClick={onClose}>
      <section
        className="filmSheet"
        data-sim-admin-guide="customer-apply-sheet"
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

          <button type="button" onClick={onClose} className="sheetCloseButton">
            닫기
          </button>
        </div>

        <div className="palettePanel">
          <div className="paletteGroup" data-sim-admin-guide="customer-apply-pattern-filter">
            <div className="paletteHeaderRow">
              <span>1차 분류</span>
              {selectedPaletteMain || selectedPaletteSub || selectedPaletteColors.length > 0 ? (
                <button type="button" onClick={onResetPaletteFilters} className="paletteResetButton">
                  초기화
                </button>
              ) : null}
            </div>

            <div className="paletteChipRow">
              {PALETTE_MAIN_OPTIONS.map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => onPaletteMainClick(item)}
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
                  onClick={() => onPaletteSubClick("")}
                  className={`paletteChip ${!selectedPaletteSub ? "paletteChipActive" : ""}`}
                >
                  전체
                </button>

                {paletteSubOptions.map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => onPaletteSubClick(item)}
                    className={`paletteChip ${selectedPaletteSub === item ? "paletteChipActive" : ""}`}
                  >
                    {item}
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          <div className="paletteGroup" data-sim-admin-guide="customer-apply-color-filter">
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
                    onClick={() => onPaletteColorClick(item)}
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
            onSearchFilms();
          }}
          className="sheetSearchForm"
        >
          <input
            value={filmQuery}
            onChange={(event) => onFilmQueryChange(event.target.value)}
            placeholder="예: 122, SG122, 화이트"
            className="searchInput"
          />

          <button type="submit" className="searchButton">
            검색
          </button>
        </form>

        {filmError ? (
          <div style={{ color: "#ffd6d6", fontSize: 14, marginBottom: 10 }}>{filmError}</div>
        ) : null}

        <div className="sheetFilmGrid" aria-busy={filmLoading}>
          {isShowingRecommendedFilms ? (
            <div className="sheetRecommendedTitle">⭐ 추천 컬러 ⭐</div>
          ) : null}

          {filmLoading ? (
            Array.from({ length: 8 }).map((_, index) => (
              <div key={`sheet-film-skeleton-${index}`} className="sheetFilmSkeletonItem" aria-hidden="true">
                <div className="sheetFilmSkeletonThumb" />
                <div className="sheetFilmSkeletonLine" />
                <div className="sheetFilmSkeletonLine short" />
              </div>
            ))
          ) : films.length > 0 ? (
            films.map((film) => {
              const active = selectedFilm?.id === film.id;
              const thumbUrl = getFilmThumbUrl(film);

              return (
                <div
                  key={film.id}
                  className={`sheetFilmItem ${active ? "sheetFilmItemActive" : ""}`}
                >
                  <button
                    type="button"
                    onClick={() => onFilmClick(film)}
                    disabled={applyingFilmId !== null}
                    className="sheetFilmSelectButton"
                  >
                    <div className="sheetFilmThumb">
                      {thumbUrl ? (
                        <img
                          src={thumbUrl}
                          alt={getFilmName(film)}
                          loading="lazy"
                          decoding="async"
                        />
                      ) : null}
                    </div>

                    <div className="sheetFilmName">{getFilmName(film)}</div>
                  </button>

                  <div className="sheetFilmActionRow">
                    <button
                      type="button"
                      onClick={() => onToggleSamplePreview(film)}
                      className={`sheetFilmSampleButton ${previewSampleFilm?.id === film.id ? "sheetFilmSampleButtonActive" : ""}`}
                      disabled={!film.sample_url}
                    >
                      {film.sample_url ? "샘플사진 보기" : "샘플 준비중"}
                    </button>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="emptyFilmBox">표시할 필름이 없습니다.</div>
          )}
        </div>

        {previewSampleFilm?.sample_url ? (
          <div className="sheetSampleBubbleBackdrop" onClick={onCloseSamplePreview}>
            <div className="sheetSampleBubble" onClick={(event) => event.stopPropagation()}>
              <button
                type="button"
                onClick={onCloseSamplePreview}
                className="sheetSampleBubbleClose"
              >
                닫기
              </button>

              <div className="sheetSampleBubbleLabel">필름봇 샘플사진</div>
              <div className="sheetSampleBubbleTitle">{getFilmName(previewSampleFilm)}</div>

              {getFilmCode(previewSampleFilm) ? (
                <div className="sheetSampleBubbleCode">{getFilmCode(previewSampleFilm)}</div>
              ) : null}

              <div className="sheetSampleBubbleImageWrap">
                <img
                  src={previewSampleFilm.sample_url}
                  alt={`${getFilmName(previewSampleFilm)} 샘플사진`}
                  loading="lazy"
                  decoding="async"
                />
              </div>

              <p className="sheetSampleBubbleText">
                실제 확대 질감을 참고할 수 있도록 필름봇용 샘플사진을 보여드리고 있어요.
              </p>
            </div>
          </div>
        ) : null}
      </section>
    </div>
  );
}
