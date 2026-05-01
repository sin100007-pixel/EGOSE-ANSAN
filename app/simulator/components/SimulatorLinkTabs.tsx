"use client";

type SimulatorLinkTabsProps = {
  active: "new" | "manage" | "presets" | "settings";
};

const COLORS = {
  cream: "#EEE0C5",
  creamText: "#7A5A34",
  line: "rgba(238,224,197,0.16)",
  soft: "rgba(255,255,255,0.70)",
};

export default function SimulatorLinkTabs({ active }: SimulatorLinkTabsProps) {
  return (
    <nav className="linkTabs" aria-label="시뮬레이션 링크 메뉴">
      <a href="/simulator/links/new" className={active === "new" ? "active" : ""}>
        링크 생성
      </a>
      <a href="/simulator/presets" className={active === "presets" ? "active" : ""}>
        프리셋
      </a>
      <a href="/simulator/links/manage" className={active === "manage" ? "active" : ""}>
        링크 관리
      </a>
      <a href="/simulator/settings" className={active === "settings" ? "active" : ""}>
        소개 설정
      </a>

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

        .linkTabs a {
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
        }

        .linkTabs a.active {
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

          .linkTabs a {
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
