"use client";

export const DEFAULT_PALETTE_MAIN_OPTIONS = ["솔리드", "우드", "스톤", "메탈", "페브릭레더"];

export const DEFAULT_PALETTE_COLOR_OPTIONS = [
  "흰색",
  "아이보리",
  "베이지",
  "옐로/골드",
  "연브라운",
  "브라운",
  "진브라운",
  "다크브라운",
  "검정/차콜",
  "회색/실버",
  "블루",
  "그린",
  "레드/핑크",
  "퍼플",
];

const PALETTE_COLOR_SWATCH: Record<string, string> = {
  흰색: "#F8F6EF",
  아이보리: "#EFE2C8",
  베이지: "#CDBA99",
  "옐로/골드": "#C9A04D",
  연브라운: "#B98252",
  브라운: "#8A5A35",
  진브라운: "#5A3926",
  다크브라운: "#3E2A20",
  "회색/실버": "#9A9A94",
  "검정/차콜": "#222222",
  그린: "#6F8A5B",
  블루: "#3D65B8",
  "레드/핑크": "#C95E6D",
  퍼플: "#7A5A9A",
};

export function orderPaletteValues(values: string[], preferred: string[]) {
  const orderMap = new Map(preferred.map((value, index) => [value, index]));

  return [...values].sort((a, b) => {
    const ai = orderMap.has(a) ? orderMap.get(a)! : 999;
    const bi = orderMap.has(b) ? orderMap.get(b)! : 999;

    if (ai !== bi) return ai - bi;
    return a.localeCompare(b, "ko");
  });
}

export function uniqueClean(values: unknown) {
  if (!Array.isArray(values)) return [];

  return Array.from(
    new Set(
      values
        .map((value) => (typeof value === "string" ? value.trim() : ""))
        .filter(Boolean)
    )
  );
}

export type SimulatorPaletteFilterProps = {
  open: boolean;
  loading?: boolean;
  activeCount: number;
  selectedMain: string;
  selectedSub: string;
  selectedColors: string[];
  mainOptions: string[];
  subOptions: string[];
  colorOptions: string[];
  onToggleOpen: () => void;
  onClose: () => void;
  onReset: () => void;
  onMainClick: (value: string) => void;
  onSubClick: (value: string) => void;
  onColorClick: (value: string) => void;
};

export default function SimulatorPaletteFilter({
  open,
  loading = false,
  activeCount,
  selectedMain,
  selectedSub,
  selectedColors,
  mainOptions,
  subOptions,
  colorOptions,
  onToggleOpen,
  onClose,
  onReset,
  onMainClick,
  onSubClick,
  onColorClick,
}: SimulatorPaletteFilterProps) {
  return (
    <>
      <div className="filterToolbar">
        <button
          type="button"
          onClick={onToggleOpen}
          className={`paletteToggle ${activeCount > 0 ? "paletteToggleActive" : ""}`}
        >
          <span>색상으로 찾기</span>
          <strong>{activeCount > 0 ? `${activeCount}개 적용중` : "열기"}</strong>
        </button>

        {activeCount > 0 ? (
          <button type="button" onClick={onReset} className="smallResetButton">
            색상 초기화
          </button>
        ) : null}
      </div>

      {activeCount > 0 ? (
        <div className="activeFilterList">
          {selectedMain ? (
            <button type="button" onClick={() => onMainClick(selectedMain)}>
              {selectedMain} ×
            </button>
          ) : null}
          {selectedSub ? (
            <button type="button" onClick={() => onSubClick(selectedSub)}>
              {selectedSub} ×
            </button>
          ) : null}
          {selectedColors.map((color) => (
            <button key={color} type="button" onClick={() => onColorClick(color)}>
              {color} ×
            </button>
          ))}
        </div>
      ) : null}

      {open ? (
        <div className={`palettePanel ${loading ? "palettePanelLoading" : ""}`} aria-busy={loading}>
          <div className="palettePanelHeader">
            <div>
              <strong>색상 팔레트</strong>
              <p>필요할 때만 열어서 고르고, 결과 목록은 넓게 유지합니다.</p>
            </div>
            <button type="button" onClick={onClose}>
              접기
            </button>
          </div>

          <div className="paletteGroup">
            <div className="paletteLabelRow">
              <span>1차 분류</span>
              {loading ? <em className="paletteStatus">불러오는 중…</em> : null}
            </div>
            <div className="paletteChipRow">
              {mainOptions.map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => onMainClick(item)}
                  className={`paletteChip ${selectedMain === item ? "paletteChipActive" : ""}`}
                  disabled={loading}
                >
                  {item}
                </button>
              ))}
            </div>
          </div>

          {selectedMain ? (
            <div className="paletteGroup">
              <div className="paletteLabelRow">
                <span>2차 분류</span>
                <em>선택사항</em>
              </div>
              <div className="paletteChipRow">
                <button
                  type="button"
                  onClick={() => onSubClick("")}
                  className={`paletteChip ${!selectedSub ? "paletteChipActive" : ""}`}
                  disabled={loading}
                >
                  전체
                </button>
                {subOptions.map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => onSubClick(item)}
                    className={`paletteChip ${selectedSub === item ? "paletteChipActive" : ""}`}
                    disabled={loading}
                  >
                    {item}
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          <div className="paletteGroup">
            <div className="paletteLabelRow">
              <span>색상 팔레트</span>
              <em>{selectedColors.length > 0 ? `${selectedColors.length}개 선택` : "전체"}</em>
            </div>
            <div className="paletteColorScroller">
              {colorOptions.map((item) => {
                const active = selectedColors.includes(item);
                return (
                  <button
                    key={item}
                    type="button"
                    onClick={() => onColorClick(item)}
                    className={`paletteSwatchButton ${active ? "paletteSwatchButtonActive" : ""}`}
                    aria-pressed={active}
                    aria-label={`${item}${active ? " 선택됨" : ""}`}
                    title={item}
                    disabled={loading}
                  >
                    <i style={{ background: PALETTE_COLOR_SWATCH[item] || "#DDD" }} />
                    {active ? <b aria-hidden="true">✓</b> : null}
                  </button>
                );
              })}
            </div>
          </div>

          <style jsx>{`
            .palettePanelLoading {
              opacity: 0.96;
            }
            .paletteStatus {
              color: rgba(255,255,255,0.72);
              font-style: normal;
            }
            .paletteColorScroller {
              display: flex;
              align-items: center;
              gap: 10px;
              overflow-x: auto;
              padding: 2px 2px 10px;
              scrollbar-width: thin;
            }
            .paletteColorScroller::-webkit-scrollbar {
              height: 6px;
            }
            .paletteColorScroller::-webkit-scrollbar-thumb {
              background: rgba(238,224,197,0.34);
              border-radius: 999px;
            }
            .paletteSwatchButton {
              position: relative;
              flex: 0 0 auto;
              width: 38px;
              height: 38px;
              border-radius: 999px;
              border: 1px solid rgba(238,224,197,0.24);
              background: rgba(255,255,255,0.06);
              display: inline-flex;
              align-items: center;
              justify-content: center;
              box-shadow: inset 0 1px 0 rgba(255,255,255,0.03);
            }
            .paletteSwatchButton i {
              width: 24px;
              height: 24px;
              border-radius: 999px;
              border: 1.5px solid rgba(255,255,255,0.66);
              box-shadow: 0 1px 4px rgba(0,0,0,0.28);
              display: block;
            }
            .paletteSwatchButton b {
              position: absolute;
              right: -2px;
              top: -3px;
              width: 16px;
              height: 16px;
              border-radius: 999px;
              background: #eee0c5;
              color: #67502a;
              display: inline-flex;
              align-items: center;
              justify-content: center;
              font-size: 10px;
              font-weight: 900;
              border: 1px solid rgba(20,18,65,0.45);
            }
            .paletteSwatchButtonActive {
              border-color: rgba(238,224,197,0.72);
              box-shadow: 0 0 0 2px rgba(238,224,197,0.16);
            }
            .paletteSwatchButton:disabled,
            .paletteChip:disabled {
              opacity: 0.62;
              cursor: wait;
            }
          `}</style>
        </div>
      ) : null}
    </>
  );
}
