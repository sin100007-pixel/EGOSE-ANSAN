import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { CSSProperties, MouseEvent, TouchEvent } from "react";
import type { SimulatorFilm, SimulatorSpace } from "../../types";
import type { MaskZoneDefinition } from "../../lib/client-utils";
import { useMaskZonePicker } from "../../hooks/useMaskZonePicker";

type FullscreenViewMode = "portrait" | "landscape";

type FullscreenViewportSize = {
  width: number;
  height: number;
};

type FullscreenPan = {
  x: number;
  y: number;
};

type FullscreenPinchStart = {
  distance: number;
  midX: number;
  midY: number;
  zoom: number;
  panX: number;
  panY: number;
};

type FullscreenPanStart = {
  x: number;
  y: number;
  panX: number;
  panY: number;
};

type EgoseSceneFullscreenWindow = Window &
  typeof globalThis & {
    __egoseSceneFullscreenOpen?: boolean;
    __egoseSceneFullscreenBackConsumed?: boolean;
  };

type EgoseFullscreenDocument = Document & {
  webkitFullscreenElement?: Element | null;
  webkitExitFullscreen?: () => Promise<void> | void;
};

type EgoseFullscreenElement = HTMLElement & {
  webkitRequestFullscreen?: () => Promise<void> | void;
};

type EgoseScreenOrientation = {
  lock?: (orientation: string) => Promise<void>;
  unlock?: () => void;
};

function getEgoseSceneFullscreenWindow() {
  if (typeof window === "undefined") return null;
  return window as EgoseSceneFullscreenWindow;
}

function getNativeFullscreenElement() {
  if (typeof document === "undefined") return null;

  const fullscreenDocument = document as EgoseFullscreenDocument;
  return document.fullscreenElement || fullscreenDocument.webkitFullscreenElement || null;
}

function isKakaoInAppBrowser() {
  if (typeof navigator === "undefined") return false;

  return /KAKAOTALK/i.test(navigator.userAgent);
}

function clampNumber(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

type TouchPointList = {
  length: number;
  [index: number]: { clientX: number; clientY: number } | undefined;
};

function getTouchDistance(touches: TouchPointList) {
  if (touches.length < 2) return 0;

  const first = touches[0];
  const second = touches[1];
  if (!first || !second) return 0;

  const deltaX = second.clientX - first.clientX;
  const deltaY = second.clientY - first.clientY;

  return Math.hypot(deltaX, deltaY);
}

function getTouchMidpoint(touches: TouchPointList) {
  const first = touches[0];
  const second = touches[1];

  if (!first || !second) {
    return { x: 0, y: 0 };
  }

  return {
    x: (first.clientX + second.clientX) / 2,
    y: (first.clientY + second.clientY) / 2,
  };
}

async function requestNativeFullscreen() {
  if (typeof document === "undefined") return false;

  if (getNativeFullscreenElement()) return true;

  const fullscreenElement = document.documentElement as EgoseFullscreenElement;
  const requestFullscreen = fullscreenElement.requestFullscreen || fullscreenElement.webkitRequestFullscreen;

  if (!requestFullscreen) return false;

  try {
    await requestFullscreen.call(fullscreenElement);
    return true;
  } catch {
    return false;
  }
}

async function exitNativeFullscreen() {
  if (typeof document === "undefined") return false;

  if (!getNativeFullscreenElement()) return false;

  const fullscreenDocument = document as EgoseFullscreenDocument;
  const exitFullscreen = document.exitFullscreen || fullscreenDocument.webkitExitFullscreen;

  if (!exitFullscreen) return false;

  try {
    await exitFullscreen.call(document);
    return true;
  } catch {
    return false;
  }
}

function unlockScreenOrientation() {
  if (typeof window === "undefined") return;

  const orientation = window.screen?.orientation as EgoseScreenOrientation | undefined;

  try {
    orientation?.unlock?.();
  } catch {}
}

async function lockScreenOrientation(mode: FullscreenViewMode) {
  if (typeof window === "undefined") return false;

  const orientation = window.screen?.orientation as EgoseScreenOrientation | undefined;
  if (!orientation?.lock) return false;

  try {
    await orientation.lock(mode === "landscape" ? "landscape" : "portrait");
    return true;
  } catch {
    return false;
  }
}

function markSceneFullscreenBackConsumed() {
  const egoseWindow = getEgoseSceneFullscreenWindow();
  if (!egoseWindow) return;

  egoseWindow.__egoseSceneFullscreenOpen = false;
  egoseWindow.__egoseSceneFullscreenBackConsumed = true;

  window.setTimeout(() => {
    egoseWindow.__egoseSceneFullscreenBackConsumed = false;
  }, 500);
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
  showFullscreenButton?: boolean;
  fullscreenTitle?: string;
  fullscreenOpenSignal?: number;
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
  showFullscreenButton = true,
  fullscreenTitle = "적용 이미지 크게 보기",
  fullscreenOpenSignal = 0,
}: SimulatorScenePreviewProps) {
  const { findZoneKeyAtPointer } = useMaskZonePicker(maskZones);
  const [fullscreenOpen, setFullscreenOpen] = useState(false);
  const [fullscreenViewMode, setFullscreenViewMode] = useState<FullscreenViewMode>("portrait");
  const [fullscreenViewportSize, setFullscreenViewportSize] = useState<FullscreenViewportSize>({
    width: 0,
    height: 0,
  });
  const [fullscreenZoom, setFullscreenZoom] = useState(1);
  const [fullscreenPan, setFullscreenPan] = useState<FullscreenPan>({ x: 0, y: 0 });
  const fullscreenHistoryPushedRef = useRef(false);
  const nativeFullscreenRequestedRef = useRef(false);
  const nativeFullscreenClosingRef = useRef(false);
  const fullscreenPinchStartRef = useRef<FullscreenPinchStart | null>(null);
  const fullscreenPanStartRef = useRef<FullscreenPanStart | null>(null);

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

  const enterNativeFullscreen = useCallback(async (
    targetMode: FullscreenViewMode,
    options: { lockOrientation?: boolean } = {}
  ) => {
    // 카카오 인앱브라우저는 native fullscreen / orientation lock 동작이 기기별로 불안정해서
    // CSS 전체화면만 사용한다. 이렇게 해야 처음 크게 보기에서 불필요하게 90도 돌지 않는다.
    if (isKakaoInAppBrowser()) {
      nativeFullscreenRequestedRef.current = false;
      return false;
    }

    const didEnterFullscreen = await requestNativeFullscreen();
    nativeFullscreenRequestedRef.current = didEnterFullscreen;

    if (didEnterFullscreen && options.lockOrientation) {
      await lockScreenOrientation(targetMode);
    }

    return didEnterFullscreen;
  }, []);

  const leaveNativeFullscreen = useCallback(() => {
    nativeFullscreenClosingRef.current = true;
    nativeFullscreenRequestedRef.current = false;
    unlockScreenOrientation();

    void exitNativeFullscreen().finally(() => {
      if (typeof window === "undefined") {
        nativeFullscreenClosingRef.current = false;
        return;
      }

      window.setTimeout(() => {
        nativeFullscreenClosingRef.current = false;
      }, 220);
    });
  }, []);

  const resetFullscreenZoom = useCallback(() => {
    fullscreenPinchStartRef.current = null;
    fullscreenPanStartRef.current = null;
    setFullscreenZoom(1);
    setFullscreenPan({ x: 0, y: 0 });
  }, []);

  const closeFullscreen = useCallback(() => {
    resetFullscreenZoom();
    leaveNativeFullscreen();

    if (typeof window !== "undefined" && fullscreenHistoryPushedRef.current) {
      try {
        window.history.back();
        return;
      } catch {}
    }

    fullscreenHistoryPushedRef.current = false;
    const egoseWindow = getEgoseSceneFullscreenWindow();
    if (egoseWindow) {
      egoseWindow.__egoseSceneFullscreenOpen = false;
    }
    setFullscreenOpen(false);
  }, [leaveNativeFullscreen, resetFullscreenZoom]);


  useEffect(() => {
    const egoseWindow = getEgoseSceneFullscreenWindow();
    if (!egoseWindow) return;

    egoseWindow.__egoseSceneFullscreenOpen = fullscreenOpen;

    return () => {
      if (egoseWindow.__egoseSceneFullscreenOpen) {
        egoseWindow.__egoseSceneFullscreenOpen = false;
      }
    };
  }, [fullscreenOpen]);

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
    if (!fullscreenOpen) return;

    const handleFullscreenPopState = (event: PopStateEvent) => {
      event.preventDefault();
      event.stopImmediatePropagation();
      fullscreenHistoryPushedRef.current = false;
      markSceneFullscreenBackConsumed();
      resetFullscreenZoom();
      leaveNativeFullscreen();
      setFullscreenOpen(false);
    };

    window.addEventListener("popstate", handleFullscreenPopState, true);

    return () => {
      window.removeEventListener("popstate", handleFullscreenPopState, true);
    };
  }, [fullscreenOpen, leaveNativeFullscreen, resetFullscreenZoom]);

  useEffect(() => {
    if (!fullscreenOpen) return;

    const handleNativeFullscreenChange = () => {
      if (nativeFullscreenClosingRef.current) return;
      if (!nativeFullscreenRequestedRef.current) return;
      if (getNativeFullscreenElement()) return;

      nativeFullscreenRequestedRef.current = false;
      unlockScreenOrientation();

      if (fullscreenHistoryPushedRef.current) {
        try {
          window.history.back();
          return;
        } catch {}
      }

      fullscreenHistoryPushedRef.current = false;
      markSceneFullscreenBackConsumed();
      resetFullscreenZoom();
      setFullscreenOpen(false);
    };

    document.addEventListener("fullscreenchange", handleNativeFullscreenChange);
    document.addEventListener("webkitfullscreenchange", handleNativeFullscreenChange);

    return () => {
      document.removeEventListener("fullscreenchange", handleNativeFullscreenChange);
      document.removeEventListener("webkitfullscreenchange", handleNativeFullscreenChange);
    };
  }, [fullscreenOpen, resetFullscreenZoom]);

  useEffect(() => {
    if (!fullscreenOpen) return;

    const kakaoInApp = isKakaoInAppBrowser();

    const updateFullscreenViewportSize = () => {
      const visualViewport = window.visualViewport;
      // 카카오 인앱은 주소창이 나타나거나 사라질 때 visualViewport 값이 흔들리면서
      // 가로모드 드래그 기준과 회전 박스 크기가 바뀐다.
      // 그래서 카카오 인앱에서는 주소창 영향을 덜 받는 layout viewport 값을 기준으로 고정한다.
      const width = Math.round(kakaoInApp ? window.innerWidth || 0 : visualViewport?.width || window.innerWidth || 0);
      const height = Math.round(kakaoInApp ? window.innerHeight || 0 : visualViewport?.height || window.innerHeight || 0);

      setFullscreenViewportSize((prev) => {
        if (prev.width === width && prev.height === height) return prev;
        return { width, height };
      });
    };

    updateFullscreenViewportSize();

    window.addEventListener("resize", updateFullscreenViewportSize);
    window.addEventListener("orientationchange", updateFullscreenViewportSize);

    if (!kakaoInApp) {
      window.visualViewport?.addEventListener("resize", updateFullscreenViewportSize);
      window.visualViewport?.addEventListener("scroll", updateFullscreenViewportSize);
    }

    return () => {
      window.removeEventListener("resize", updateFullscreenViewportSize);
      window.removeEventListener("orientationchange", updateFullscreenViewportSize);

      if (!kakaoInApp) {
        window.visualViewport?.removeEventListener("resize", updateFullscreenViewportSize);
        window.visualViewport?.removeEventListener("scroll", updateFullscreenViewportSize);
      }
    };
  }, [fullscreenOpen]);

  const toggleFullscreenViewMode = useCallback(() => {
    const nextMode = fullscreenViewMode === "portrait" ? "landscape" : "portrait";
    resetFullscreenZoom();
    setFullscreenViewMode(nextMode);

    if (nextMode === "landscape") {
      void enterNativeFullscreen("landscape", { lockOrientation: true });
      return;
    }

    if (!isKakaoInAppBrowser()) {
      void lockScreenOrientation("portrait");
    }
  }, [enterNativeFullscreen, fullscreenViewMode, resetFullscreenZoom]);

  const handleFullscreenTouchStart = useCallback((event: TouchEvent<HTMLDivElement>) => {
    if (!fullscreenOpen) return;

    if (event.touches.length >= 2) {
      event.preventDefault();
      event.stopPropagation();

      const midpoint = getTouchMidpoint(event.touches);
      fullscreenPinchStartRef.current = {
        distance: Math.max(getTouchDistance(event.touches), 1),
        midX: midpoint.x,
        midY: midpoint.y,
        zoom: fullscreenZoom,
        panX: fullscreenPan.x,
        panY: fullscreenPan.y,
      };
      fullscreenPanStartRef.current = null;
      return;
    }

    if (event.touches.length === 1 && fullscreenZoom > 1.02) {
      event.stopPropagation();
      const touch = event.touches[0];
      fullscreenPanStartRef.current = {
        x: touch.clientX,
        y: touch.clientY,
        panX: fullscreenPan.x,
        panY: fullscreenPan.y,
      };
    }
  }, [fullscreenOpen, fullscreenPan.x, fullscreenPan.y, fullscreenZoom]);

  const mapFullscreenGestureDelta = useCallback((deltaX: number, deltaY: number) => {
    // CSS 가로모드는 프레임 자체가 rotate(90deg) 된 상태라서,
    // 손가락 이동량을 그대로 x/y에 넣으면 오른쪽 드래그가 아래 이동으로 보인다.
    // 카카오 인앱은 주소창 상태에 따라 width/height 판정이 흔들리므로
    // 뷰포트 비율이 아니라 "실제로 CSS 회전을 쓰는 상태인지"로만 판단한다.
    const cssRotatedLandscape =
      fullscreenViewMode === "landscape" &&
      (isKakaoInAppBrowser() ||
        (fullscreenViewportSize.width > 0 &&
          fullscreenViewportSize.height > 0 &&
          fullscreenViewportSize.width < fullscreenViewportSize.height));

    if (!cssRotatedLandscape) {
      return { x: deltaX, y: deltaY };
    }

    return { x: deltaY, y: -deltaX };
  }, [fullscreenViewMode, fullscreenViewportSize.height, fullscreenViewportSize.width]);

  const handleFullscreenTouchMove = useCallback((event: TouchEvent<HTMLDivElement>) => {
    if (!fullscreenOpen) return;

    const pinchStart = fullscreenPinchStartRef.current;
    if (event.touches.length >= 2 && pinchStart) {
      event.preventDefault();
      event.stopPropagation();

      const distance = Math.max(getTouchDistance(event.touches), 1);
      const midpoint = getTouchMidpoint(event.touches);
      const nextZoom = clampNumber(pinchStart.zoom * (distance / pinchStart.distance), 1, 4);
      const delta = mapFullscreenGestureDelta(midpoint.x - pinchStart.midX, midpoint.y - pinchStart.midY);

      if (nextZoom <= 1.01) {
        setFullscreenZoom(1);
        setFullscreenPan({ x: 0, y: 0 });
        return;
      }

      setFullscreenZoom(nextZoom);
      setFullscreenPan({
        x: pinchStart.panX + delta.x,
        y: pinchStart.panY + delta.y,
      });
      return;
    }

    const panStart = fullscreenPanStartRef.current;
    if (event.touches.length === 1 && panStart && fullscreenZoom > 1.02) {
      event.preventDefault();
      event.stopPropagation();

      const touch = event.touches[0];
      const delta = mapFullscreenGestureDelta(touch.clientX - panStart.x, touch.clientY - panStart.y);
      setFullscreenPan({
        x: panStart.panX + delta.x,
        y: panStart.panY + delta.y,
      });
    }
  }, [fullscreenOpen, fullscreenZoom, mapFullscreenGestureDelta]);

  const handleFullscreenTouchEnd = useCallback((event: TouchEvent<HTMLDivElement>) => {
    if (event.touches.length >= 2) return;

    fullscreenPinchStartRef.current = null;

    if (event.touches.length === 1 && fullscreenZoom > 1.02) {
      const touch = event.touches[0];
      fullscreenPanStartRef.current = {
        x: touch.clientX,
        y: touch.clientY,
        panX: fullscreenPan.x,
        panY: fullscreenPan.y,
      };
      return;
    }

    fullscreenPanStartRef.current = null;
  }, [fullscreenPan.x, fullscreenPan.y, fullscreenZoom]);

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

  const fullscreenLandscapeLayout = useMemo(() => {
    const viewportWidth = fullscreenViewportSize.width || 0;
    const viewportHeight = fullscreenViewportSize.height || 0;
    const availableWidth = Math.max(viewportWidth - 2, 0);
    const availableHeight = Math.max(viewportHeight - 2, 0);

    if (!availableWidth || !availableHeight || !aspectRatioValue) {
      return { frameWidth: 0, frameHeight: 0, fitWidth: 0, fitHeight: 0 };
    }

    // 카카오 인앱용 가로모드는 실제 화면을 돌리는 것이 아니라
    // 이미지 박스 전체를 rotate(90deg) 하는 방식이다.
    // 그래서 회전 전 width는 회전 후 화면의 height 안에 들어가야 하고,
    // 회전 전 height는 회전 후 화면의 width 안에 들어가야 한다.
    // 이 계산만 사용하면 비율은 유지되고, 확대는 사용자가 핀치줌으로만 한다.
    const fitWidth = Math.min(availableHeight, availableWidth * aspectRatioValue);
    const fitHeight = fitWidth / aspectRatioValue;

    return {
      frameWidth: fitWidth,
      frameHeight: fitHeight,
      fitWidth,
      fitHeight,
    };
  }, [aspectRatioValue, fullscreenViewportSize.height, fullscreenViewportSize.width]);

  const kakaoFullscreen = isKakaoInAppBrowser();

  const fullscreenModalStyle = useMemo(() => {
    const viewportWidth = fullscreenViewportSize.width || 0;
    const viewportHeight = fullscreenViewportSize.height || 0;
    const { frameWidth, frameHeight, fitWidth, fitHeight } = fullscreenLandscapeLayout;

    return {
      "--scene-aspect-value": String(aspectRatioValue),
      "--scene-fullscreen-vw": viewportWidth ? `${viewportWidth}px` : "100vw",
      "--scene-fullscreen-vh": viewportHeight ? `${viewportHeight}px` : "100vh",
      "--scene-landscape-frame-width": frameWidth ? `${frameWidth}px` : "calc(max(100vw, 100vh) - 2px)",
      "--scene-landscape-frame-height": frameHeight ? `${frameHeight}px` : "calc(min(100vw, 100vh) - 2px)",
      "--scene-landscape-fit-width": fitWidth ? `${fitWidth}px` : "100%",
      "--scene-landscape-fit-height": fitHeight ? `${fitHeight}px` : "auto",
    } as CSSProperties;
  }, [aspectRatioValue, fullscreenLandscapeLayout, fullscreenViewportSize.height, fullscreenViewportSize.width]);

  const fullscreenViewportFrameStyle = (fullscreenViewMode === "landscape" && fullscreenLandscapeLayout.frameWidth && fullscreenLandscapeLayout.frameHeight
    ? {
        width: `${fullscreenLandscapeLayout.frameWidth}px`,
        height: `${fullscreenLandscapeLayout.frameHeight}px`,
        maxWidth: `${fullscreenLandscapeLayout.frameWidth}px`,
        maxHeight: `${fullscreenLandscapeLayout.frameHeight}px`,
      }
    : undefined) as CSSProperties | undefined;

  const fullscreenViewportStyle = {
    aspectRatio: previewAspectRatio,
    ...(fullscreenViewMode === "landscape" && fullscreenLandscapeLayout.fitWidth && fullscreenLandscapeLayout.fitHeight
      ? {
          width: `${fullscreenLandscapeLayout.fitWidth}px`,
          height: `${fullscreenLandscapeLayout.fitHeight}px`,
          maxWidth: `${fullscreenLandscapeLayout.frameWidth}px`,
          maxHeight: `${fullscreenLandscapeLayout.frameHeight}px`,
        }
      : {}),
  } as CSSProperties;

  const fullscreenZoomLayerStyle = {
    transform: fullscreenZoom > 1.01
      ? `translate3d(${fullscreenPan.x}px, ${fullscreenPan.y}px, 0) scale(${fullscreenZoom})`
      : "translate3d(0, 0, 0) scale(1)",
  } as CSSProperties;

  const canOpenFullscreen = enableFullscreen && previewHasRealSpace;

  const openFullscreen = useCallback(() => {
    if (!canOpenFullscreen) return;

    setFullscreenViewMode("portrait");
    resetFullscreenZoom();
    // 처음 크게 보기는 세로 전체보기 상태로만 연다.
    // 가로 회전은 사용자가 "가로모드로 보기"를 눌렀을 때만 적용한다.
    void enterNativeFullscreen("portrait", { lockOrientation: false });

    const egoseWindow = getEgoseSceneFullscreenWindow();
    if (egoseWindow) {
      egoseWindow.__egoseSceneFullscreenOpen = true;
      egoseWindow.__egoseSceneFullscreenBackConsumed = false;
    }

    try {
      const currentState = window.history.state;
      const safeState = currentState && typeof currentState === "object" ? currentState : {};
      window.history.pushState(
        {
          ...safeState,
          __egoseSceneFullscreen: true,
        },
        "",
        window.location.href
      );
      fullscreenHistoryPushedRef.current = true;
    } catch {
      fullscreenHistoryPushedRef.current = false;
    }

    setFullscreenOpen(true);
  }, [canOpenFullscreen, enterNativeFullscreen, resetFullscreenZoom]);

  useEffect(() => {
    if (fullscreenOpenSignal <= 0) return;
    openFullscreen();
  }, [fullscreenOpenSignal, openFullscreen]);

  const fullscreenModal = canOpenFullscreen && fullscreenOpen ? (
    <div
      className={`sceneFullscreenModal sceneFullscreenModal${fullscreenViewMode === "landscape" ? "Landscape" : "Portrait"} ${kakaoFullscreen ? "sceneFullscreenModalKakao" : ""}`.trim()}
      style={fullscreenModalStyle}
      role="dialog"
      aria-modal="true"
      aria-label={fullscreenTitle}
      onPointerDown={(event) => {
        event.stopPropagation();
      }}
      onClick={(event) => {
        event.stopPropagation();
        closeFullscreen();
      }}
    >
      <div
        className="sceneFullscreenTop"
        onPointerDown={(event) => event.stopPropagation()}
        onClick={(event) => event.stopPropagation()}
      >
        <div>
          <strong>{fullscreenTitle}</strong>
          <span>가로모드는 화면을 눕힌 것처럼 이미지를 더 크게 보여줍니다.</span>
        </div>
        <button
          type="button"
          className="sceneFullscreenCloseButton"
          onClick={(event) => {
            event.stopPropagation();
            closeFullscreen();
          }}
        >
          닫기
        </button>
      </div>

      <div
        className="sceneFullscreenCanvas"
        onPointerDown={(event) => event.stopPropagation()}
        onClick={(event) => event.stopPropagation()}
        onTouchStart={handleFullscreenTouchStart}
        onTouchMove={handleFullscreenTouchMove}
        onTouchEnd={handleFullscreenTouchEnd}
        onTouchCancel={handleFullscreenTouchEnd}
      >
        <div className="sceneFullscreenViewportFrame" style={fullscreenViewportFrameStyle}>
          <div
            className={`sceneFullscreenZoomLayer ${fullscreenZoom > 1.01 ? "sceneFullscreenZoomLayerZoomed" : ""}`.trim()}
            style={fullscreenZoomLayerStyle}
          >
            <div className="previewViewport sceneFullscreenViewport" style={fullscreenViewportStyle}>
              {renderSceneStage(true)}
            </div>
          </div>
        </div>

        <button
          type="button"
          className="sceneFullscreenSwitchButton"
          onClick={(event) => {
            event.stopPropagation();
            toggleFullscreenViewMode();
          }}
        >
          {fullscreenViewMode === "portrait" ? "가로모드로 보기" : "세로모드로 보기"}
        </button>
      </div>
    </div>
  ) : null;

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

        {canOpenFullscreen && showFullscreenButton ? (
          <button
            type="button"
            className="sceneExpandButton"
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              openFullscreen();
            }}
          >
            ⛶ 크게 보기
          </button>
        ) : null}
      </div>

      {fullscreenModal && typeof document !== "undefined" ? createPortal(fullscreenModal, document.body) : null}
    </>
  );
}
