"use client";

import { useEffect, useRef } from "react";

type Props = {
  count?: number;        // 눈송이 개수
  minSize?: number;      // 최소 크기(px)
  maxSize?: number;      // 최대 크기(px)
  minSpeed?: number;     // 최소 속도
  maxSpeed?: number;     // 최대 속도
  opacity?: number;      // 전체 투명도(0~1)
  zIndex?: number;       // 레이어 순서
};

type Flake = {
  x: number;
  y: number;
  r: number;
  vy: number;
  vx: number;
  wobble: number;
};

export default function Snowfall({
  count = 80,
  minSize = 1,
  maxSize = 4,
  minSpeed = 0.6,
  maxSpeed = 2.2,
  opacity = 0.9,
  zIndex = 50,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const flakesRef = useRef<Flake[]>([]);
  const dprRef = useRef(1);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const rand = (a: number, b: number) => a + Math.random() * (b - a);

    const buildFlakes = (w: number, h: number) => {
      flakesRef.current = Array.from({ length: count }, () => ({
        x: rand(0, w),
        y: rand(-h, h),
        r: rand(minSize, maxSize),
        vy: rand(minSpeed, maxSpeed),
        vx: rand(-0.25, 0.25),
        wobble: rand(0, Math.PI * 2),
      }));
    };

    const resize = () => {
      const dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
      dprRef.current = dpr;

      const w = window.innerWidth;
      const h = window.innerHeight;

      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;

      buildFlakes(w, h);
    };

    const step = () => {
      const dpr = dprRef.current;
      const w = canvas.width / dpr;
      const h = canvas.height / dpr;

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.save();
      ctx.globalAlpha = opacity;
      ctx.fillStyle = "#ffffff";

      for (const f of flakesRef.current) {
        f.wobble += 0.02;
        f.x += f.vx + Math.sin(f.wobble) * 0.35;
        f.y += f.vy;

        if (f.y > h + 10) {
          f.y = -10;
          f.x = Math.random() * w;
        }
        if (f.x < -10) f.x = w + 10;
        if (f.x > w + 10) f.x = -10;

        ctx.beginPath();
        ctx.arc(f.x * dpr, f.y * dpr, f.r * dpr, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();
      rafRef.current = requestAnimationFrame(step);
    };

    resize();
    step();

    window.addEventListener("resize", resize);
    return () => {
      window.removeEventListener("resize", resize);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [count, minSize, maxSize, minSpeed, maxSpeed, opacity]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      style={{
        position: "fixed",
        inset: 0,
        pointerEvents: "none", // 버튼 클릭/스크롤 방해 X
        zIndex,
      }}
    />
  );
}
