"use client";

import type { SimulatorFilm } from "../../types";

export type SimulatorFilmResultVariant = "link" | "preset";

export function getFilmName(film: SimulatorFilm) {
  return film.full_name || film.product_code_1 || film.color_name || "필름";
}

export function getFilmCode(film: SimulatorFilm) {
  return [film.product_code_1, film.product_code_2].filter(Boolean).join(" / ");
}

export function getFilmThumbUrl(film: SimulatorFilm) {
  // 검색결과 카드에는 API에서 내려준 thumb_url만 사용합니다.
  // image_url로 대체하지 않아야 thumb_path 적용 여부를 바로 확인할 수 있습니다.
  return film.thumb_url || "";
}

type SimulatorFilmResultCardProps = {
  film: SimulatorFilm;
  active: boolean;
  variant: SimulatorFilmResultVariant;
  previewActive: boolean;
  onSelect: (film: SimulatorFilm) => void;
  onPreview: (film: SimulatorFilm) => void;
  selectTitle: string;
};

export default function SimulatorFilmResultCard({
  film,
  active,
  variant,
  previewActive,
  onSelect,
  onPreview,
  selectTitle,
}: SimulatorFilmResultCardProps) {
  const thumb = getFilmThumbUrl(film);
  const cardClassName =
    variant === "preset"
      ? `filmResultCard ${active ? "filmResultCardActive" : ""}`
      : `filmCard ${active ? "filmCardActive" : ""}`;
  const selectButtonClassName = variant === "preset" ? "filmResultSelectButton" : "filmSelectButton";
  const thumbClassName = variant === "preset" ? "filmResultThumb" : "filmThumb";
  const nameClassName = variant === "preset" ? "filmResultName" : "filmName";
  const actionRowClassName = variant === "preset" ? "filmResultActionRow" : "filmActionRow";
  const sampleButtonBaseClassName = variant === "preset" ? "filmResultSampleButton" : "filmSampleButton";
  const sampleButtonActiveClassName = variant === "preset" ? "filmResultSampleButtonActive" : "filmSampleButtonActive";

  return (
    <div className={cardClassName}>
      <button type="button" onClick={() => onSelect(film)} className={selectButtonClassName} title={selectTitle}>
        <div className={thumbClassName}>
          {thumb ? <img src={thumb} alt={getFilmName(film)} loading="lazy" decoding="async" /> : null}
        </div>
        <div className={nameClassName}>{getFilmName(film)}</div>
      </button>

      <div className={actionRowClassName}>
        <button
          type="button"
          onClick={() => onPreview(film)}
          className={`${sampleButtonBaseClassName} ${previewActive ? sampleButtonActiveClassName : ""}`}
          disabled={!film.sample_url}
        >
          {film.sample_url ? "샘플사진 보기" : "샘플 준비중"}
        </button>
      </div>
    </div>
  );
}
