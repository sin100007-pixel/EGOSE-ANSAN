// app/components/EgoseBannerCarousel.tsx
"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type Props = {
  /** 자동 넘김 간격(ms). 기본 5000 */
  intervalMs?: number;
  /** 배너 이미지 src 목록. 기본: /egose-banner.png, /egose-banner2.png */
  images?: { src: string; alt: string }[];
};

export default function EgoseBannerCarousel({
  intervalMs = 10000,
  images,
}: Props) {
  const slides = useMemo(
    () =>
      images ?? [
        { src: "/egose-banner.png", alt: "이고세 배너 1" },
        { src: "/egose-banner2.png", alt: "이고세 배너 2" },
      ],
    [images]
  );

  const [index, setIndex] = useState(0);

  const isPointerDownRef = useRef(false);
  const startXRef = useRef(0);
  const deltaXRef = useRef(0);
  const dragOffsetRef = useRef(0);

  const goTo = useCallback(
    (next: number) => {
      const len = slides.length;
      const safe = ((next % len) + len) % len;
      setIndex(safe);
    },
    [slides.length]
  );

  const next = useCallback(() => goTo(index + 1), [goTo, index]);
  const prev = useCallback(() => goTo(index - 1), [goTo, index]);

  useEffect(() => {
    if (slides.length <= 1) return;

    const id = window.setInterval(() => {
      setIndex((i) => (i + 1) % slides.length);
    }, intervalMs);

    return () => window.clearInterval(id);
  }, [intervalMs, slides.length]);

  const handlePointerDown = (e: React.PointerEvent) => {
    if (e.pointerType === "mouse" && e.button !== 0) return;

    isPointerDownRef.current = true;
    startXRef.current = e.clientX;
    deltaXRef.current = 0;
    dragOffsetRef.current = 0;

    try {
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    } catch {}
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isPointerDownRef.current) return;
    const dx = e.clientX - startXRef.current;
    deltaXRef.current = dx;
    dragOffsetRef.current = dx;
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (!isPointerDownRef.current) return;
    isPointerDownRef.current = false;

    const dx = deltaXRef.current;
    deltaXRef.current = 0;
    dragOffsetRef.current = 0;

    const threshold = 60;
    if (dx > threshold) prev();
    else if (dx < -threshold) next();

    try {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {}
  };

  const dragPx = isPointerDownRef.current ? dragOffsetRef.current : 0;

  return (
    <div style={{ width: "100%" }}>
      <div
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        style={{
          position: "relative",
          width: "100%",
          aspectRatio: "2048 / 412",
          borderRadius: 12,
          overflow: "hidden",
          marginBottom: 10,
          background: "rgba(255,255,255,0.04)",
          touchAction: "pan-y",
          userSelect: "none",
          WebkitTapHighlightColor: "transparent",
        }}
      >
        <div
          style={{
            display: "flex",
            height: "100%",
            width: `${slides.length * 100}%`,
            transform: `translateX(calc(${-index * (100 / slides.length)}% + ${dragPx}px))`,
            transition: isPointerDownRef.current ? "none" : "transform 350ms ease",
          }}
        >
          {slides.map((s, i) => (
            <div
              key={`${s.src}-${i}`}
              style={{ position: "relative", width: `${100 / slides.length}%` }}
            >
              <Image
                src={s.src}
                alt={s.alt}
                fill
                priority={i === 0}
                sizes="100vw"
                style={{ objectFit: "cover" }}
              />
            </div>
          ))}
        </div>
      </div>

      {slides.length > 1 && (
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            gap: 8,
            marginBottom: 20,
          }}
        >
          {slides.map((_, i) => {
            const active = i === index;
            return (
              <button
                key={i}
                type="button"
                onClick={() => goTo(i)}
                aria-label={`배너 ${i + 1} 보기`}
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: 999,
                  border: "1px solid rgba(255,255,255,0.8)",
                  background: active ? "rgba(255,255,255,0.95)" : "transparent",
                  padding: 0,
                  cursor: "pointer",
                }}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}