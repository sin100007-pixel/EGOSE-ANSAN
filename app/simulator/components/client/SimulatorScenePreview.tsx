import { useCallback, useEffect, useMemo, useState } from "react";
import type { CSSProperties, MouseEvent } from "react";
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
  enableFullscreen?: boolean;
  fullscreenTitle?: string;
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
  enableFullscreen = false,
  fullscreenTitle = "적용 이미지 크게 보기",
}: SimulatorScenePreviewProps) {
  const { findZoneKeyAtPointer } = useMaskZonePicker(maskZones);
  const [fullscreenOpen, setFullscreenOpen] = useState(false);

  const handleSceneClick = useCallback((event: MouseEvent<HTMLDivElement>) => {
    if (!onZoneClick) return;

    const zoneKey = findZoneKeyAtPointer(event.clientX, event.clientY, event.currentTarget);
    if (!zoneKey) return;

    onZoneClick(zoneKey);
  }, [findZoneKeyAtPointer, onZoneClick]);

  const aspectRatioValue = useMemo(() => {
    const normalized = previewAspectRatio.replace(/\s/g, "");
    const [widthText, heightText] = normalized.split("/");
    const width = Number(widthText);
    const height = Number(heightText);

    if (Number.isFinite(width) && Number.isFinite(height) && height > 0) {
      return width / height;
    }

    const singleValue = Number(normalized);
    return Number.isFinite(singleValue) && singleValue > 0 ? singleValue : 4 / 3;
  }, [previewAspectRatio]);

  useEffect(() => {
    if (!fullscreenOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setFullscreenOpen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [fullscreenOpen]);

  const renderSceneStage = (fullscreen: boolean) => {
    const clickable = !fullscreen && Boolean(onZoneClick);

    return (
      <div
        className={`sceneStage ${clickable ? "sceneStageClickable" : ""}`.trim()}
        onClick={clickable ? handleSceneClick : undefined}
        title={clickable ? "체크무늬 구역을 누르면 필름을 선택할 수 있어요" : undefined}
      >
        {maskZones.map((zone) => {
          const film = zoneFilmMap[zone.key];
          const baseKey = exportKeyPrefix ? `${exportKeyPrefix}-${zone.key}` : zone.key;
          const key = fullscreen ? `${baseKey}-fullscreen` : baseKey;

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
    );
  };

  const fullscreenViewportStyle = {
    aspectRatio: previewAspectRatio,
    "--scene-aspect-value": String(aspectRatioValue),
  } as CSSProperties;

  const canOpenFullscreen = enableFullscreen && previewHasRealSpace;

  return (
    <>
      <div
        className={`previewViewport ${viewportClassName}`.trim()}
        style={{
          aspectRatio: previewAspectRatio,
        }}
        data-sim-admin-guide={guideTarget}
      >
        {previewHasRealSpace ? (
          renderSceneStage(false)
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

        {canOpenFullscreen ? (
          <button
            type="button"
            className="sceneExpandButton"
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              setFullscreenOpen(true);
            }}
          >
            ⛶ 크게 보기
          </button>
        ) : null}
      </div>

      {canOpenFullscreen && fullscreenOpen ? (
        <div
          className="sceneFullscreenModal"
          role="dialog"
          aria-modal="true"
          aria-label={fullscreenTitle}
          onClick={() => setFullscreenOpen(false)}
        >
          <div className="sceneFullscreenTop" onClick={(event) => event.stopPropagation()}>
            <div>
              <strong>{fullscreenTitle}</strong>
              <span>세로/가로 화면에 맞춰 크게 보여줍니다.</span>
            </div>
            <button type="button" className="sceneFullscreenCloseButton" onClick={() => setFullscreenOpen(false)}>
              닫기
            </button>
          </div>

          <div className="sceneFullscreenCanvas" onClick={(event) => event.stopPropagation()}>
            <div className="previewViewport sceneFullscreenViewport" style={fullscreenViewportStyle}>
              {renderSceneStage(true)}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
