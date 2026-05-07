import type { SimulatorFilm, SimulatorSpace } from "../../types";
import type { MaskZoneDefinition } from "../../lib/client-utils";
import { getFilmName } from "../../lib/client-utils";
import SimulatorScenePreview from "./SimulatorScenePreview";

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
  onGoDecisionStep,
}: SimulatorApplyStepProps) {
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
        selectedSpace={selectedSpace}
        maskZones={maskZones}
        zoneFilmMap={zoneFilmMap}
        previewAspectRatio={previewAspectRatio}
        previewHasRealSpace={previewHasRealSpace}
        colors={colors}
        activeZoneKey={activeZoneKey}
        onZoneClick={onOpenFilmSheet}
      />

      <div className="zoneApplyGrid">
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

      <div className="applyDecisionRow">
        <button
          type="button"
          onClick={onGoDecisionStep}
          className="decisionNextButton"
          disabled={!maskZones.some((zone) => Boolean(zoneFilmMap[zone.key]))}
        >
          결정확정으로 넘어가기
        </button>
      </div>
    </section>
  );
}
