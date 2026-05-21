import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties, MouseEvent } from "react";
import type { SimulatorFilm, SimulatorSpace } from "../../types";
import type { MaskZoneDefinition } from "../../lib/client-utils";
import { useMaskZonePicker } from "../../hooks/useMaskZonePicker";

type FullscreenViewMode = "portrait" | "landscape";

type BrowserOrientationController = {
  lock?: (mode: FullscreenViewMode) => Promise<void>;
  unlock?: () => void;
};

function getViewportOrientationMode(): FullscreenViewMode {
  if (typeof window === "undefined") return "portrait";

  const orientationType = window.screen?.orientation?.type;
  if (typeof orientationType === "string") {
    if (orientationType.startsWith("landscape")) return "landscape";
    if (orientationType.startsWith("portrait")) return "portrait";
  }

  return window.innerWidth > window.innerHeight ? "landscape" : "portrait";
}

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
  const [fullscreenViewMode, setFullscreenViewMode] = useState<FullscreenViewMode>("portrait");
  const fullscreenModalRef = useRef<HTMLDivElement | null>(null);
  const hadFullscreenSessionRef = useRef(false);
  const originalFullscreenViewModeRef = useRef<FullscreenViewMode>("portrait");

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


  const closeFullscreen = useCallback(() => {
    setFullscreenOpen(false);
  }, []);

  const applyBrowserOrientation = useCallback(async (mode: FullscreenViewMode) => {
    if (typeof window === "undefined") return;

    try {
      const modal = fullscreenModalRef.current;
      if (modal && modal.requestFullscreen && document.fullscreenElement !== modal) {
        await modal.requestFullscreen();
      }
    } catch {}

    try {
      const orientationController = window.screen?.orientation as BrowserOrientationController | undefined;
      if (orientationController?.lock) {
        await orientationController.lock(mode);
      }
    } catch {}
  }, []);

  const releaseBrowserOrientation = useCallback(async (restoreMode?: FullscreenViewMode) => {
    if (typeof window === "undefined") return;

    try {
      const orientationController = window.screen?.orientation as BrowserOrientationController | undefined;
      if (restoreMode && document.fullscreenElement && orientationController?.lock) {
        await orientationController.lock(restoreMode);
      }
    } catch {}

    try {
      if (document.fullscreenElement && document.exitFullscreen) {
        await document.exitFullscreen();
      }
    } catch {}

    try {
      const orientationController = window.screen?.orientation as BrowserOrientationController | undefined;
      orientationController?.unlock?.();
    } catch {}
  }, []);

  useEffect(() => {
    if (!fullscreenOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closeFullscreen();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [closeFullscreen, fullscreenOpen]);


  useEffect(() => {
    if (!fullscreenOpen) {
      if (hadFullscreenSessionRef.current) {
        hadFullscreenSessionRef.current = false;
        void releaseBrowserOrientation(originalFullscreenViewModeRef.current);
      }
      return;
    }

    hadFullscreenSessionRef.current = true;
    void applyBrowserOrientation(fullscreenViewMode);
  }, [applyBrowserOrientation, fullscreenOpen, fullscreenViewMode, releaseBrowserOrientation]);

  const toggleFullscreenViewMode = useCallback(() => {
    setFullscreenViewMode((prev) => (prev === "portrait" ? "landscape" : "portrait"));
  }, []);

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
              const currentViewportMode = getViewportOrientationMode();
              originalFullscreenViewModeRef.current = currentViewportMode;
              setFullscreenViewMode(currentViewportMode);
              setFullscreenOpen(true);
            }}
          >
            ⛶ 크게 보기
          </button>
        ) : null}
      </div>

      {canOpenFullscreen && fullscreenOpen ? (
        <div
          ref={fullscreenModalRef}
          className={`sceneFullscreenModal sceneFullscreenModal${fullscreenViewMode === "landscape" ? "Landscape" : "Portrait"}`}
          role="dialog"
          aria-modal="true"
          aria-label={fullscreenTitle}
          onClick={closeFullscreen}
        >
          <div className="sceneFullscreenTop" onClick={(event) => event.stopPropagation()}>
            <div>
              <strong>{fullscreenTitle}</strong>
              <span>오른쪽 아래 버튼으로 가로/세로 모드를 바꿀 수 있어요.</span>
            </div>
            <button type="button" className="sceneFullscreenCloseButton" onClick={closeFullscreen}>
              닫기
            </button>
          </div>

          <div className="sceneFullscreenCanvas" onClick={(event) => event.stopPropagation()}>
            <div className="previewViewport sceneFullscreenViewport" style={fullscreenViewportStyle}>
              {renderSceneStage(true)}
            </div>

            <button
              type="button"
              className="sceneFullscreenSwitchButton"
              onClick={toggleFullscreenViewMode}
            >
              {fullscreenViewMode === "portrait" ? "가로모드로 보기" : "세로모드로 보기"}
            </button>
          </div>
        </div>
      ) : null}
    </>
  );
}
