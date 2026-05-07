import { useCallback, useEffect, useRef } from "react";
import type { MaskZoneDefinition } from "../lib/client-utils";

type MaskCanvasEntry = {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  width: number;
  height: number;
};

const MASK_ALPHA_THRESHOLD = 16;

function shouldUseAnonymousCors(src: string) {
  if (typeof window === "undefined") return false;
  if (!/^https?:\/\//i.test(src)) return false;

  try {
    return new URL(src).origin !== window.location.origin;
  } catch {
    return false;
  }
}

function createMaskCanvas(src: string): Promise<MaskCanvasEntry | null> {
  return new Promise((resolve) => {
    if (typeof window === "undefined") {
      resolve(null);
      return;
    }

    const image = new Image();

    if (shouldUseAnonymousCors(src)) {
      image.crossOrigin = "anonymous";
    }

    image.onload = () => {
      const width = image.naturalWidth || image.width;
      const height = image.naturalHeight || image.height;

      if (!width || !height) {
        resolve(null);
        return;
      }

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      if (!ctx) {
        resolve(null);
        return;
      }

      try {
        ctx.drawImage(image, 0, 0, width, height);
        resolve({ canvas, ctx, width, height });
      } catch {
        resolve(null);
      }
    };

    image.onerror = () => resolve(null);
    image.src = src;
  });
}

function getAlphaAt(entry: MaskCanvasEntry, xRatio: number, yRatio: number) {
  const x = Math.max(0, Math.min(entry.width - 1, Math.floor(xRatio * entry.width)));
  const y = Math.max(0, Math.min(entry.height - 1, Math.floor(yRatio * entry.height)));

  try {
    return entry.ctx.getImageData(x, y, 1, 1).data[3] || 0;
  } catch {
    return 0;
  }
}

export function useMaskZonePicker(maskZones: MaskZoneDefinition[]) {
  const canvasesRef = useRef<Map<string, MaskCanvasEntry>>(new Map());

  useEffect(() => {
    let cancelled = false;
    const nextCanvases = new Map<string, MaskCanvasEntry>();

    Promise.all(
      maskZones.map(async (zone) => {
        const entry = await createMaskCanvas(zone.mask_url);
        return { zoneKey: zone.key, entry };
      })
    ).then((results) => {
      if (cancelled) return;

      results.forEach(({ zoneKey, entry }) => {
        if (entry) nextCanvases.set(zoneKey, entry);
      });

      canvasesRef.current = nextCanvases;
    });

    return () => {
      cancelled = true;
    };
  }, [maskZones]);

  const findZoneKeyAtPointer = useCallback(
    (clientX: number, clientY: number, target: HTMLElement) => {
      const rect = target.getBoundingClientRect();

      if (!rect.width || !rect.height) return "";

      const xRatio = (clientX - rect.left) / rect.width;
      const yRatio = (clientY - rect.top) / rect.height;

      if (xRatio < 0 || xRatio > 1 || yRatio < 0 || yRatio > 1) return "";

      for (let index = maskZones.length - 1; index >= 0; index -= 1) {
        const zone = maskZones[index];
        const entry = canvasesRef.current.get(zone.key);

        if (!entry) continue;

        const alpha = getAlphaAt(entry, xRatio, yRatio);
        if (alpha > MASK_ALPHA_THRESHOLD) {
          return zone.key;
        }
      }

      return "";
    },
    [maskZones]
  );

  return { findZoneKeyAtPointer };
}
