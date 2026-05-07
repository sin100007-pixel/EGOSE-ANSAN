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
  return film.thumb_url || film.image_url || "";
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
