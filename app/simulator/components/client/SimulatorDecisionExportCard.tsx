import type { SimulatorFilm, SimulatorLinkInfo, SimulatorSpace } from "../../types";
import type { MaskZoneDefinition } from "../../lib/client-utils";
import { getFilmName } from "../../lib/client-utils";
import SimulatorScenePreview from "./SimulatorScenePreview";

type SimulatorDecisionExportCardProps = {
  exportRef: { current: HTMLDivElement | null };
  selectedSpace: SimulatorSpace | null;
  maskZones: MaskZoneDefinition[];
  zoneFilmMap: Record<string, SimulatorFilm | null>;
  link: SimulatorLinkInfo | null;
  previewAspectRatio: string;
  previewHasRealSpace: boolean;
  hasFabricWarning: boolean;
  colors: {
    cream: string;
    soft: string;
  };
};

export default function SimulatorDecisionExportCard({
  exportRef,
  selectedSpace,
  maskZones,
  zoneFilmMap,
  link,
  previewAspectRatio,
  previewHasRealSpace,
  hasFabricWarning,
  colors,
}: SimulatorDecisionExportCardProps) {
  return (
    <div className="decisionExportStage" aria-hidden="true">
      <div ref={exportRef} className="decisionExportCard">
        <div className="decisionExportHeader">
          <div className="decisionExportBadge">필름 시뮬레이션 결과</div>
          <h2>{selectedSpace?.name || "선택 공간"}</h2>
          {link?.installer_name ? <p>시공자: {link.installer_name}</p> : null}
        </div>

        <div className="decisionExportPreview">
          <SimulatorScenePreview
            selectedSpace={selectedSpace}
            maskZones={maskZones}
            zoneFilmMap={zoneFilmMap}
            previewAspectRatio={previewAspectRatio}
            previewHasRealSpace={previewHasRealSpace}
            colors={colors}
            viewportClassName="decisionExportViewport"
            exportKeyPrefix="export"
            compactEmpty
          />
        </div>

        <div className="decisionExportList">
          {maskZones.map((zone) => {
            const film = zoneFilmMap[zone.key] || null;

            return (
              <div key={`export-row-${zone.key}`} className="decisionExportRow">
                <span>{zone.label}</span>
                <strong>{film ? getFilmName(film) : "미선택"}</strong>
              </div>
            );
          })}
        </div>

        {hasFabricWarning ? (
          <div className="decisionExportWarning">
            선택된 필름에 패브릭필름이 있습니다. 시뮬레이션상 불가피하게 왜곡이 심한 종류이므로 주의 부탁드립니다.
          </div>
        ) : null}
      </div>
    </div>
  );
}
