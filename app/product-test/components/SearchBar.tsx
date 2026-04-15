"use client";

import { BROWN, THEME_COLOR } from "../constants";

type SearchBarProps = {
  q: string;
  setQ: (value: string) => void;
  onSearch: () => void;
};

export default function SearchBar({ q, setQ, onSearch }: SearchBarProps) {
  const closeKeyboard = () => {
    if (typeof document === "undefined") return;
    const active = document.activeElement as HTMLElement | null;
    active?.blur();
  };

  const handleSearch = () => {
    onSearch();
    closeKeyboard();
  };

  return (
    <div
      className="searchRow"
      style={{
        display: "grid",
        gridTemplateColumns: "minmax(0, 1fr) 92px",
        gap: 8,
        alignItems: "stretch",
        marginBottom: 12,
      }}
    >
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        onKeyDown={(e) => {
          if (e.nativeEvent.isComposing) return;

          if (e.key === "Enter") {
            e.preventDefault();
            handleSearch();
          }
        }}
        placeholder="제품번호, 코드, 색상명으로 검색"
        enterKeyHint="search"
        style={{
          width: "100%",
          height: 48,
          border: "1px solid rgba(238,224,197,0.28)",
          borderRadius: 16,
          padding: "0 16px",
          fontSize: 15,
          outline: "none",
          background: "rgba(255, 253, 248, 0.98)",
          color: "#1e1b16",
          boxShadow: "inset 0 1px 0 rgba(255,255,255,0.55)",
          boxSizing: "border-box",
        }}
      />

      <button
        className="searchButton"
        type="button"
        onClick={handleSearch}
        style={{
          height: 48,
          width: "100%",
          border: "1px solid rgba(238,224,197,0.18)",
          borderRadius: 16,
          padding: "0 14px",
          background: THEME_COLOR,
          color: BROWN,
          fontWeight: 800,
          fontSize: 15,
          cursor: "pointer",
          boxShadow: "0 10px 22px rgba(0,0,0,0.16)",
          whiteSpace: "nowrap",
        }}
      >
        검색
      </button>
    </div>
  );
}