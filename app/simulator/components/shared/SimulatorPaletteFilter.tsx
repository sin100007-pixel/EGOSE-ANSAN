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
        <div className="palettePanel">
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
            </div>
            <div className="paletteChipRow">
              {mainOptions.map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => onMainClick(item)}
                  className={`paletteChip ${selectedMain === item ? "paletteChipActive" : ""}`}
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
                >
                  전체
                </button>
                {subOptions.map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => onSubClick(item)}
                    className={`paletteChip ${selectedSub === item ? "paletteChipActive" : ""}`}
                  >
                    {item}
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          <div className="paletteGroup">
            <div className="paletteLabelRow">
              <span>색상</span>
              <em>{selectedColors.length > 0 ? selectedColors.join(", ") : "전체"}</em>
            </div>
            <div className="paletteColorGrid">
              {colorOptions.map((item) => {
                const active = selectedColors.includes(item);

                return (
                  <button
                    key={item}
                    type="button"
                    onClick={() => onColorClick(item)}
                    className={`paletteColorChip ${active ? "paletteColorChipActive" : ""}`}
                    aria-pressed={active}
                  >
                    <i style={{ background: PALETTE_COLOR_SWATCH[item] || "#DDD" }} />
                    <span>{item}</span>
                    {active ? <b aria-hidden="true">✓</b> : null}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
