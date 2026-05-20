"use client";

import { useEffect, useState, type ReactNode } from "react";
import type { SimulatorFilm, SimulatorSpace } from "../../types";
import type { MaskZoneDefinition } from "../../lib/client-utils";
import { getFilmName } from "../../lib/client-utils";
import SimulatorScenePreview from "./SimulatorScenePreview";

type ApplyHelpKey = "favorite" | "decision";

const APPLY_HELP_MESSAGES: Record<ApplyHelpKey, string> = {
  favorite:
    "선택한공간과 필름을 즐겨찾기 후보로 저장합니다. 나중에 다시 꺼내 볼 수 있고 다른사람과 공유할 수 있습니다. 필름을 1개라도 선택해야 즐겨찾기로 저장할 수 있습니다.",
  decision:
    "4단계인 결정확정으로 이동합니다. 즐겨찾기로 저장된 즐겨찾기 후보가 저장되어 있습니다.",
};

type ApplySplitHelpButtonProps = {
  helpKey: ApplyHelpKey;
  activeHelp: ApplyHelpKey | null;
  onToggleHelp: (helpKey: ApplyHelpKey) => void;
  onMainClick: () => void;
  mainDisabled?: boolean;
  guideTarget: string;
  className?: string;
  mainClassName?: string;
  children: ReactNode;
};

function ApplySplitHelpButton({
  helpKey,
  activeHelp,
  onToggleHelp,
  onMainClick,
  mainDisabled = false,
  guideTarget,
  className = "",
  mainClassName = "",
  children,
}: ApplySplitHelpButtonProps) {
  const opened = activeHelp === helpKey;

  return (
    <div
      className={`applySplitHelpAction applySplitHelpAction-${helpKey} ${
        mainDisabled ? "isMainDisabled" : ""
      } ${className}`}
      data-sim-admin-guide={guideTarget}
      data-apply-help-ui="true"
    >
      <button
        type="button"
        onClick={onMainClick}
        className={`applySplitMainButton ${mainClassName}`}
        disabled={mainDisabled}
      >
        {children}
      </button>

      <button
        type="button"
        className="applySplitHelpButton"
        aria-label="도움말 보기"
        aria-expanded={opened}
        onPointerDown={(event) => {
          event.preventDefault();
          event.stopPropagation();
          onToggleHelp(helpKey);
        }}
      >
        ?
      </button>

      {opened ? (
        <span className="applySplitHelpBubble" role="tooltip">
          {APPLY_HELP_MESSAGES[helpKey]}
        </span>
      ) : null}
    </div>
  );
}

type SimulatorApplyStepProps = {
  selectedSpace: SimulatorSpace | null;
  maskZones: MaskZoneDefinition[];
  activeZoneKey: string;
  activeZone: MaskZoneDefinition | null;
  zoneFilmMap: Record<string, SimulatorFilm | null>;
  selectedFilm: SimulatorFilm | null;
  previewAspectRatio: string;
  previewHasRealSpace: boolean;
  colors: {
    cream: string;
    soft: string;
  };
  onBackToSpace: () => void;
  onOpenFilmSheet: (zoneKey: string) => void;
  onApplyFilmToAllZones: (film: SimulatorFilm) => void;
  onClearZoneFilm: (zoneKey: string) => void;
  onClearAllZones: () => void;
  onAddFavorite: () => void;
  onGoDecisionStep: () => void;
};

export default function SimulatorApplyStep({
  selectedSpace,
  maskZones,
  activeZoneKey,
  activeZone,
  zoneFilmMap,
  selectedFilm,
  previewAspectRatio,
  previewHasRealSpace,
  colors,
  onBackToSpace,
  onOpenFilmSheet,
  onApplyFilmToAllZones,
  onClearZoneFilm,
  onClearAllZones,
  onAddFavorite,
  onGoDecisionStep,
}: SimulatorApplyStepProps) {
  const hasAnyFilm = maskZones.some((zone) => Boolean(zoneFilmMap[zone.key]));
  const [activeHelp, setActiveHelp] = useState<ApplyHelpKey | null>(null);

  const toggleHelp = (helpKey: ApplyHelpKey) => {
    setActiveHelp((prev) => (prev === helpKey ? null : helpKey));
  };

  useEffect(() => {
    if (!activeHelp) return;

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target;
      if (target instanceof Element && target.closest('[data-apply-help-ui="true"]')) {
        return;
      }
      setActiveHelp(null);
    };

    window.addEventListener("pointerdown", handlePointerDown);
    return () => window.removeEventListener("pointerdown", handlePointerDown);
  }, [activeHelp]);

  return (
    <section className="applyCard">
      <div className="applyTopRow">
        <div>
          <div className="sectionLabel">색상 적용</div>
          <h2 className="spaceTitle">{selectedSpace?.name || "공간 없음"}</h2>
        </div>

        <button type="button" onClick={onBackToSpace} className="changeSpaceButton">
          공간 변경
        </button>
      </div>

      <SimulatorScenePreview
        guideTarget="customer-apply-preview"
        selectedSpace={selectedSpace}
        maskZones={maskZones}
        zoneFilmMap={zoneFilmMap}
        previewAspectRatio={previewAspectRatio}
        previewHasRealSpace={previewHasRealSpace}
        colors={colors}
        activeZoneKey={activeZoneKey}
        onZoneClick={onOpenFilmSheet}
      />

      <div className="zoneApplyGrid" data-sim-admin-guide="customer-apply-zone-buttons">
        {maskZones.map((zone) => {
          const active = activeZoneKey === zone.key;
          const film = zoneFilmMap[zone.key] || null;

          return (
            <button
              key={zone.key}
              type="button"
              onClick={() => onOpenFilmSheet(zone.key)}
              className={`zoneApplyButton ${active ? "zoneApplyButtonActive" : ""}`}
            >
              <span>{zone.label}</span>
              <strong className={!film ? "zoneFilmPrompt" : undefined}>
                {film ? getFilmName(film) : "이곳을 눌러 필름선택"}
              </strong>
            </button>
          );
        })}
      </div>

      <div className="applyActionRow">
        {selectedFilm ? (
          <button type="button" onClick={() => onApplyFilmToAllZones(selectedFilm)} className="smallActionButton">
            선택 필름 전체 적용
          </button>
        ) : null}

        {activeZone && zoneFilmMap[activeZone.key] ? (
          <button type="button" onClick={() => onClearZoneFilm(activeZone.key)} className="smallActionButton">
            현재 구역 지우기
          </button>
        ) : null}

        {Object.keys(zoneFilmMap).length > 0 ? (
          <button type="button" onClick={onClearAllZones} className="smallActionButton">
            전체 초기화
          </button>
        ) : null}
      </div>

      <p className="applyWarningText">
        *실물 필름과는 차이가있습니다. 유의해주세요.*
      </p>

      <div className="applyDecisionRow applyDecisionRowWithFavorite">
        <ApplySplitHelpButton
          helpKey="favorite"
          activeHelp={activeHelp}
          onToggleHelp={toggleHelp}
          onMainClick={onAddFavorite}
          mainDisabled={!hasAnyFilm}
          guideTarget="customer-apply-favorite"
          className="applyFavoriteSplitAction"
          mainClassName="applyFavoriteSplitMain"
        >
          ⭐ 즐겨찾기
        </ApplySplitHelpButton>

        <ApplySplitHelpButton
          helpKey="decision"
          activeHelp={activeHelp}
          onToggleHelp={toggleHelp}
          onMainClick={onGoDecisionStep}
          guideTarget="customer-apply-decision"
          className="applyDecisionSplitAction"
          mainClassName="applyDecisionSplitMain"
        >
          결정확정으로
        </ApplySplitHelpButton>
      </div>
    </section>
  );
}
