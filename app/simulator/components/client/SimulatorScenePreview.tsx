import { useCallback } from "react";
import type { MouseEvent } from "react";
import type { SimulatorFilm, SimulatorSpace } from "../../types";
import type { MaskZoneDefinition } from "../../lib/client-utils";
import { useMaskZonePicker } from "../../hooks/useMaskZonePicker";

type SimulatorScenePreviewProps = {
  selectedSpace: SimulatorSpace | null;
  maskZones: MaskZoneDefinition[];
  zoneFilmMap: Record<string, SimulatorFilm | null>;
  previewAspectRatio: string;
  previewHasRealSpace: boolean;
  colors: {
    cream: string;
    soft: string;
  };
  viewportClassName?: string;
  exportKeyPrefix?: string;
  compactEmpty?: boolean;
  activeZoneKey?: string;
  onZoneClick?: (zoneKey: string) => void;
  guideTarget?: string;
};

export default function SimulatorScenePreview({
  selectedSpace,
  maskZones,
  zoneFilmMap,
  previewAspectRatio,
  previewHasRealSpace,
  colors,
  viewportClassName = "",
  exportKeyPrefix = "",
  compactEmpty = false,
  activeZoneKey = "",
  onZoneClick,
  guideTarget,
}: SimulatorScenePreviewProps) {
  const { findZoneKeyAtPointer } = useMaskZonePicker(maskZones);

  const handleSceneClick = useCallback((event: MouseEvent<HTMLDivElement>) => {
    if (!onZoneClick) return;

    const zoneKey = findZoneKeyAtPointer(event.clientX, event.clientY, event.currentTarget);
    if (!zoneKey) return;

    onZoneClick(zoneKey);
  }, [findZoneKeyAtPointer, onZoneClick]);

  return (
    <div
      className={`previewViewport ${viewportClassName}`.trim()}
      style={{
        aspectRatio: previewAspectRatio,
      }}
      data-sim-admin-guide={guideTarget}
    >
      {previewHasRealSpace ? (
        <div
          className={`sceneStage ${onZoneClick ? "sceneStageClickable" : ""}`.trim()}
          onClick={handleSceneClick}
          title={onZoneClick ? "체크무늬 구역을 누르면 필름을 선택할 수 있어요" : undefined}
        >
          {maskZones.map((zone) => {
            const film = zoneFilmMap[zone.key];
            const key = exportKeyPrefix ? `${exportKeyPrefix}-${zone.key}` : zone.key;

            if (film?.image_url) {
              return (
                <div
                  key={key}
                  aria-hidden="true"
                  className={`maskedFilmLayer ${activeZoneKey === zone.key ? "maskedFilmLayerActive" : ""}`.trim()}
                  style={{
                    backgroundImage: `url("${film.image_url}")`,
                    backgroundSize: `${zone.patternSize || 220}px auto`,
                    WebkitMaskImage: `url("${zone.mask_url}")`,
                    maskImage: `url("${zone.mask_url}")`,
                  }}
                />
              );
            }

            return (
              <div
                key={key}
                aria-hidden="true"
                className={`maskedTransparencyLayer ${activeZoneKey === zone.key ? "maskedTransparencyLayerActive" : ""}`.trim()}
                style={{
                  WebkitMaskImage: `url("${zone.mask_url}")`,
                  maskImage: `url("${zone.mask_url}")`,
                }}
              />
            );
          })}

          {selectedSpace?.base_image_url ? (
            <img src={selectedSpace.base_image_url} alt="공간 원본" className="sceneBaseImage" />
          ) : null}

          {selectedSpace?.overlay_image_url ? (
            <img src={selectedSpace.overlay_image_url} alt="공간 오버레이" className="sceneOverlayImage" />
          ) : null}
        </div>
      ) : (
        <div className="emptyPreviewWrap">
          <div className="emptyPreviewBox">
            <div className="emptyPreviewInner">
              <div style={{ color: colors.cream, fontWeight: 900, marginBottom: 6 }}>
                공간 이미지 등록 전 테스트 화면
              </div>
              {compactEmpty ? null : (
                <div style={{ color: colors.soft, fontSize: 14, lineHeight: 1.6 }}>
                  실제 공간 PNG와 구역별 마스크 PNG가 준비되면 이 영역에 적용됩니다.
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
