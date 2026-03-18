"use client";

import { useEffect, useMemo, useState } from "react";

type Petal = {
  id: number;
  left: number;
  size: number;
  duration: number;
  delay: number;
  rotate: number;
  opacity: number;
};

export default function CherryBlossomPetals() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const petals = useMemo<Petal[]>(() => {
    return Array.from({ length: 24 }).map((_, i) => ({
      id: i,
      left: Math.random() * 100,
      size: 10 + Math.random() * 12,
      duration: 10 + Math.random() * 8,
      delay: Math.random() * 10,
      rotate: -180 + Math.random() * 360,
      opacity: 0.35 + Math.random() * 0.3,
    }));
  }, []);

  if (!mounted) return null;

  return (
    <>
      <style>{`
        @keyframes blossomFall {
          0% {
            transform: translate3d(0, -12vh, 0) rotate(0deg);
          }
          20% {
            transform: translate3d(-18px, 20vh, 0) rotate(70deg);
          }
          40% {
            transform: translate3d(16px, 40vh, 0) rotate(130deg);
          }
          60% {
            transform: translate3d(-22px, 62vh, 0) rotate(210deg);
          }
          80% {
            transform: translate3d(20px, 84vh, 0) rotate(280deg);
          }
          100% {
            transform: translate3d(-12px, 112vh, 0) rotate(340deg);
          }
        }

        @keyframes blossomSway {
          0% {
            margin-left: 0;
          }
          25% {
            margin-left: -12px;
          }
          50% {
            margin-left: 14px;
          }
          75% {
            margin-left: -18px;
          }
          100% {
            margin-left: 10px;
          }
        }
      `}</style>

      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          inset: 0,
          overflow: "hidden",
          pointerEvents: "none",
          zIndex: 1,
        }}
      >
        {petals.map((petal) => (
          <div
            key={petal.id}
            style={{
              position: "absolute",
              top: "-14vh",
              left: `${petal.left}%`,
              width: petal.size,
              height: Math.round(petal.size * 0.72),
              opacity: petal.opacity,
              animation: `blossomFall ${petal.duration}s linear ${petal.delay}s infinite, blossomSway 4.2s ease-in-out ${petal.delay}s infinite`,
              filter: "drop-shadow(0 0 3px rgba(255, 214, 230, 0.18))",
            }}
          >
            <div
              style={{
                width: "100%",
                height: "100%",
                borderRadius: "70% 30% 65% 35% / 60% 40% 60% 40%",
                background:
                  "radial-gradient(circle at 35% 35%, rgba(255,245,248,0.95) 0%, rgba(255,220,232,0.95) 45%, rgba(255,182,206,0.88) 100%)",
                transform: `rotate(${petal.rotate}deg)`,
              }}
            />
          </div>
        ))}
      </div>
    </>
  );
}

