"use client";

import type { ReactNode } from "react";
import SimulatorPaletteFilter, { type SimulatorPaletteFilterProps } from "./SimulatorPaletteFilter";

type SimulatorFilmSearchPanelProps = {
  className: string;
  query: string;
  loading: boolean;
  placeholder: string;
  palette: SimulatorPaletteFilterProps;
  onQueryChange: (value: string) => void;
  onSearch: () => void;
  children: ReactNode;
};

export default function SimulatorFilmSearchPanel({
  className,
  query,
  loading,
  placeholder,
  palette,
  onQueryChange,
  onSearch,
  children,
}: SimulatorFilmSearchPanelProps) {
  return (
    <div className={className}>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          onSearch();
        }}
        className="searchRow"
      >
        <input
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder={placeholder}
        />
        <button type="submit">{loading ? "검색중" : "검색"}</button>
      </form>

      <SimulatorPaletteFilter {...palette} loading={loading} />

      {children}
    </div>
  );
}
