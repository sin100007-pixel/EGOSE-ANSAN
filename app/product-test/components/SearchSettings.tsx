"use client";

import type { Dispatch, SetStateAction } from "react";
import { TEXT_SUB, THEME_COLOR } from "../constants";

type SearchSettingsProps = {
  isSettingsOpen: boolean;
  setIsSettingsOpen: Dispatch<SetStateAction<boolean>>;
  hideConsumerPrice: boolean;
  setHideConsumerPrice: Dispatch<SetStateAction<boolean>>;
  hideInstallerPrice: boolean;
  setHideInstallerPrice: Dispatch<SetStateAction<boolean>>;
};

export default function SearchSettings({
  isSettingsOpen,
  setIsSettingsOpen,
  hideConsumerPrice,
  setHideConsumerPrice,
  hideInstallerPrice,
  setHideInstallerPrice,
}: SearchSettingsProps) {
  return (
    <div
      style={{
        marginTop: 2,
        marginBottom: 14,
        paddingTop: 0,
        borderTop: "none",
      }}
    >
      <button
        type="button"
        className="settingsToggleButton"
        onClick={() => setIsSettingsOpen((prev) => !prev)}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 8,
          border: "1px solid rgba(238,224,197,0.55)",
          borderRadius: 14,
          padding: "10px 14px",
          background: "rgba(255,255,255,0.05)",
          color: THEME_COLOR,
          fontSize: 14,
          fontWeight: 900,
          cursor: "pointer",
          boxShadow: "0 10px 24px rgba(0,0,0,0.28)",
        }}
      >
        <span>{isSettingsOpen ? "▾" : "▸"}</span>
        <span>검색 설정</span>
      </button>

      {isSettingsOpen && (
        <div
          style={{
            marginTop: 12,
            padding: "14px 14px",
            borderRadius: 18,
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(238,224,197,0.10)",
          }}
        >
          <div
            style={{
              color: TEXT_SUB,
              fontSize: 14,
              lineHeight: 1.6,
              marginBottom: 12,
            }}
          >
            검색 결과에서 보고 싶은 가격 항목을 선택할 수 있어요.
          </div>

          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 10,
            }}
          >
            <button
              type="button"
              className="settingsOptionButton"
              onClick={() => setHideConsumerPrice((prev) => !prev)}
              style={{
                border: `1px solid ${
                  !hideConsumerPrice
                    ? "rgba(238,224,197,0.42)"
                    : "rgba(238,224,197,0.18)"
                }`,
                borderRadius: 999,
                padding: "10px 14px",
                background: !hideConsumerPrice
                  ? "rgba(238,224,197,0.18)"
                  : "rgba(255,255,255,0.04)",
                color: !hideConsumerPrice ? THEME_COLOR : "#fff",
                fontSize: 14,
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              {hideConsumerPrice ? "소비자가 보기" : "소비자가 숨기기"}
            </button>

            <button
              type="button"
              className="settingsOptionButton"
              onClick={() => setHideInstallerPrice((prev) => !prev)}
              style={{
                border: `1px solid ${
                  !hideInstallerPrice
                    ? "rgba(238,224,197,0.42)"
                    : "rgba(238,224,197,0.18)"
                }`,
                borderRadius: 999,
                padding: "10px 14px",
                background: !hideInstallerPrice
                  ? "rgba(238,224,197,0.18)"
                  : "rgba(255,255,255,0.04)",
                color: !hideInstallerPrice ? THEME_COLOR : "#fff",
                fontSize: 14,
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              {hideInstallerPrice ? "시공자가 보기" : "시공자가 숨기기"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
