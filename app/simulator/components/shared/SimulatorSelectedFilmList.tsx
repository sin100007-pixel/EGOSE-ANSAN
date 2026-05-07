"use client";

import type { SimulatorFilm } from "../../types";
import { getFilmName } from "./SimulatorFilmResultCard";

type SimulatorSelectedFilmListProps = {
  films: SimulatorFilm[];
  onRemove: (filmId: number) => void;
  emptyText: string;
  emptyClassName?: string;
  ariaLabel?: string;
  buttonTitle?: string;
};

export default function SimulatorSelectedFilmList({
  films,
  onRemove,
  emptyText,
  emptyClassName = "hintBox",
  ariaLabel,
  buttonTitle,
}: SimulatorSelectedFilmListProps) {
  if (films.length === 0) {
    return <div className={emptyClassName}>{emptyText}</div>;
  }

  return (
    <div className="selectedFilmList" aria-label={ariaLabel}>
      {films.map((film) => (
        <button key={film.id} type="button" onClick={() => onRemove(film.id)} title={buttonTitle}>
          {getFilmName(film)} ×
        </button>
      ))}
    </div>
  );
}
