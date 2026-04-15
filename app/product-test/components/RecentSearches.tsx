"use client";

import { TEXT_SUB, THEME_COLOR } from "../constants";

type RecentSearchesProps = {
  recentSearches: string[];
  onApply: (term: string) => void;
};

export default function RecentSearches({
  recentSearches,
  onApply,
}: RecentSearchesProps) {
  return (
    <div style={{ marginTop: 4 }}>
      <div
        style={{
          color: TEXT_SUB,
          fontSize: 13,
          marginBottom: 10,
          fontWeight: 600,
        }}
      >
        최근 검색어
      </div>

      {recentSearches.length > 0 ? (
        <div
          style={{
            display: "flex",
            gap: 8,
            flexWrap: "wrap",
          }}
        >
          {recentSearches.map((term) => (
            <button
              key={term}
              type="button"
              className="exampleChip"
              onClick={() => onApply(term)}
              style={{
                border: "1px solid rgba(238,224,197,0.22)",
                borderRadius: 999,
                padding: "8px 12px",
                background: "rgba(255,255,255,0.04)",
                color: THEME_COLOR,
                fontSize: 14,
                cursor: "pointer",
              }}
            >
              {term}
            </button>
          ))}
        </div>
      ) : (
        <div
          style={{
            color: "rgba(255,255,255,0.48)",
            fontSize: 14,
          }}
        >
          아직 최근 검색어가 없습니다.
        </div>
      )}
    </div>
  );
}
