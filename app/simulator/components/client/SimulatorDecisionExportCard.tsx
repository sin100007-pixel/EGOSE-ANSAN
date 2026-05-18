import type { SimulatorFilm, SimulatorLinkInfo, SimulatorSpace } from "../../types";
import type { MaskZoneDefinition } from "../../lib/client-utils";
import { getFilmName, readPreviewAspectRatio } from "../../lib/client-utils";
import SimulatorScenePreview from "./SimulatorScenePreview";

type SimulatorFavoriteCandidate = {
  id: string;
  created_at: string;
  space: SimulatorSpace | null;
  maskZones: MaskZoneDefinition[];
  zoneFilmMap: Record<string, SimulatorFilm | null>;
};

type SimulatorDecisionExportCardProps = {
  exportRef: { current: HTMLDivElement | null };
  selectedSpace: SimulatorSpace | null;
  maskZones: MaskZoneDefinition[];
  zoneFilmMap: Record<string, SimulatorFilm | null>;
  link: SimulatorLinkInfo | null;
  previewAspectRatio: string;
  previewHasRealSpace: boolean;
  hasFabricWarning: boolean;
  favoriteCandidates?: SimulatorFavoriteCandidate[];
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
  favoriteCandidates = [],
  colors,
}: SimulatorDecisionExportCardProps) {
  const hasFavoriteCandidates = favoriteCandidates.length > 0;

  return (
    <div className="decisionExportStage" aria-hidden="true">
      <div
        ref={exportRef}
        className={hasFavoriteCandidates ? "decisionExportCard decisionExportCardFavorites" : "decisionExportCard"}
      >
        <div className="decisionExportHeader">
          <div className="decisionExportBadge">
            {hasFavoriteCandidates ? "즐겨찾기 후보 공유" : "필름 시뮬레이션 결과"}
          </div>
          <h2>{hasFavoriteCandidates ? `선택한 후보 ${favoriteCandidates.length}개` : selectedSpace?.name || "선택 공간"}</h2>
          {link?.installer_name ? <p>시공자: {link.installer_name}</p> : null}
        </div>

        {hasFavoriteCandidates ? (
          <div className="decisionExportFavoriteList">
            {favoriteCandidates.map((candidate, index) => {
              const candidateZones = candidate.maskZones.length > 0 ? candidate.maskZones : maskZones;
              const candidateHasRealSpace = Boolean(
                candidate.space?.base_image_url || candidate.space?.overlay_image_url
              );

              return (
                <section key={`export-favorite-${candidate.id}`} className="decisionExportFavoriteCard">
                  <div className="decisionExportFavoritePreview">
                    <SimulatorScenePreview
                      selectedSpace={candidate.space}
                      maskZones={candidateZones}
                      zoneFilmMap={candidate.zoneFilmMap}
                      previewAspectRatio={readPreviewAspectRatio(candidate.space)}
                      previewHasRealSpace={candidateHasRealSpace}
                      colors={colors}
                      viewportClassName="decisionExportFavoriteViewport"
                      exportKeyPrefix={`export-favorite-${candidate.id}`}
                      compactEmpty
                    />
                  </div>

                  <div className="decisionExportFavoriteInfo">
                    <div className="decisionExportFavoriteNumber">후보 {index + 1}</div>
                    <h3>{candidate.space?.name || `저장한 후보 ${index + 1}`}</h3>

                    <div className="decisionExportList decisionExportFavoriteRows">
                      {candidateZones.map((zone) => {
                        const film = candidate.zoneFilmMap[zone.key] || null;

                        return (
                          <div key={`export-favorite-${candidate.id}-${zone.key}`} className="decisionExportRow">
                            <span>{zone.label}</span>
                            <strong>{film ? getFilmName(film) : "미선택"}</strong>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </section>
              );
            })}
          </div>
        ) : (
          <>
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
          </>
        )}
      </div>
    </div>
  );
}
