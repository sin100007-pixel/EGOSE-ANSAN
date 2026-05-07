"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type SimulatorLinkTabsProps = {
  active: "new" | "manage" | "presets" | "settings";
};

const COLORS = {
  cream: "#EEE0C5",
  creamText: "#7A5A34",
  line: "rgba(238,224,197,0.16)",
  soft: "rgba(255,255,255,0.70)",
};

const TAB_ITEMS: Array<{
  key: SimulatorLinkTabsProps["active"];
  href: string;
  label: string;
}> = [
  { key: "new", href: "/simulator/links/new", label: "링크 생성" },
  { key: "presets", href: "/simulator/presets", label: "프리셋" },
  { key: "manage", href: "/simulator/links/manage", label: "링크 관리" },
  { key: "settings", href: "/simulator/settings", label: "소개 설정" },
];

export default function SimulatorLinkTabs({ active }: SimulatorLinkTabsProps) {
  const router = useRouter();
  const [movingTo, setMovingTo] = useState("");

  const prefetchTabs = () => {
    TAB_ITEMS.forEach((item) => {
      if (item.key !== active) {
        router.prefetch(item.href);
      }
    });
  };

  useEffect(() => {
    setMovingTo("");

    prefetchTabs();

    const firstIdle = window.setTimeout(prefetchTabs, 180);
    const secondIdle = window.setTimeout(prefetchTabs, 800);

    return () => {
      window.clearTimeout(firstIdle);
      window.clearTimeout(secondIdle);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, router]);

  return (
    <nav className="linkTabs" aria-label="시뮬레이션 링크 메뉴">
      {TAB_ITEMS.map((item) => {
        const isActive = active === item.key;
        const isMoving = movingTo === item.key;

        return (
          <Link
            key={item.key}
            href={item.href}
            prefetch
            className={`${isActive ? "active" : ""} ${isMoving ? "moving" : ""}`.trim()}
            aria-current={isActive ? "page" : undefined}
            onMouseEnter={() => router.prefetch(item.href)}
            onFocus={() => router.prefetch(item.href)}
            onTouchStart={() => router.prefetch(item.href)}
            onClick={(event) => {
              if (isActive) {
                event.preventDefault();
                return;
              }

              setMovingTo(item.key);
              router.prefetch(item.href);
            }}
          >
            {item.label}
          </Link>
        );
      })}

      <style jsx>{`
        .linkTabs {
          position: fixed;
          left: 50%;
          bottom: calc(12px + env(safe-area-inset-bottom));
          transform: translateX(-50%);
          z-index: 160;
          width: min(520px, calc(100vw - 20px));
          max-width: calc(100vw - 20px);
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 8px;
          padding: 8px;
          border-radius: 22px;
          background: rgba(7, 5, 58, 0.94);
          border: 1px solid ${COLORS.line};
          box-shadow: 0 20px 48px rgba(0, 0, 0, 0.36);
          backdrop-filter: blur(14px);
          box-sizing: border-box;
          overflow: hidden;
        }

        .linkTabs :global(a) {
          text-decoration: none;
          border: 1px solid transparent;
          border-radius: 16px;
          background: rgba(255, 255, 255, 0.05);
          color: ${COLORS.soft};
          min-width: 0;
          padding: 13px 8px;
          font-size: 14px;
          font-weight: 900;
          text-align: center;
          touch-action: manipulation;
          -webkit-tap-highlight-color: transparent;
          transition:
            transform 120ms ease,
            background 120ms ease,
            color 120ms ease,
            border-color 120ms ease,
            opacity 120ms ease;
        }

        .linkTabs :global(a:active),
        .linkTabs :global(a.moving) {
          transform: translateY(1px) scale(0.98);
          opacity: 0.88;
        }

        .linkTabs :global(a.active) {
          border-color: rgba(238, 224, 197, 0.58);
          background: ${COLORS.cream};
          color: ${COLORS.creamText};
        }

        @media (max-width: 640px) {
          .linkTabs {
            bottom: calc(10px + env(safe-area-inset-bottom));
            width: calc(100vw - 14px);
            max-width: calc(100vw - 14px);
            border-radius: 20px;
            padding: 6px;
            gap: 5px;
          }

          .linkTabs :global(a) {
            border-radius: 15px;
            padding: 11px 4px;
            font-size: 12px;
            white-space: nowrap;
          }
        }
      `}</style>
    </nav>
  );
}
