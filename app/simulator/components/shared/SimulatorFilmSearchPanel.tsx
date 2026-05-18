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
  searchGuideTarget?: string;
  paletteGuideTarget?: string;
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
  searchGuideTarget,
  paletteGuideTarget,
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
        data-sim-admin-guide={searchGuideTarget}
      >
        <input
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder={placeholder}
        />
        <button type="submit">{loading ? "검색중" : "검색"}</button>
      </form>

      <div data-sim-admin-guide={paletteGuideTarget}>
        <SimulatorPaletteFilter {...palette} loading={loading} />
      </div>

      {children}
    </div>
  );
}
