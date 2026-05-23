type SimulatorAdminRouteLoadingProps = {
  title?: string;
};

const COLORS = {
  bg: "#05023B",
  panel: "rgba(12,10,72,0.78)",
  cream: "#EEE0C5",
  line: "rgba(238,224,197,0.16)",
  soft: "rgba(255,255,255,0.66)",
};

export default function SimulatorAdminRouteLoading({
  title = "화면을 준비하고 있습니다",
}: SimulatorAdminRouteLoadingProps) {
  return (
    <main className="simAdminRouteLoading" aria-busy="true">
      <section className="simAdminRouteLoading__card">
        <div className="simAdminRouteLoading__badge">시뮬봇 관리</div>
        <h1 className="simAdminRouteLoading__title">{title}</h1>
        <p className="simAdminRouteLoading__text">권한과 필요한 정보를 확인하는 중입니다.</p>
        <div className="simAdminRouteLoading__skeleton simAdminRouteLoading__skeletonHero" />
        <div className="simAdminRouteLoading__skeletonGrid">
          <div className="simAdminRouteLoading__skeleton" />
          <div className="simAdminRouteLoading__skeleton" />
          <div className="simAdminRouteLoading__skeleton" />
        </div>
      </section>

      <div className="simAdminRouteLoading__tabs" aria-hidden="true">
        <span />
        <span />
        <span />
        <span />
      </div>

      <style>{`
        .simAdminRouteLoading {
          min-height: 100dvh;
          padding: 22px 16px 112px;
          box-sizing: border-box;
          color: ${COLORS.cream};
          background:
            radial-gradient(circle at 20% 0%, rgba(238, 224, 197, 0.12), transparent 32%),
            ${COLORS.bg};
          display: flex;
          justify-content: center;
        }

        .simAdminRouteLoading__card {
          width: min(720px, 100%);
          align-self: flex-start;
          margin-top: 8px;
          padding: 22px;
          border-radius: 28px;
          background: ${COLORS.panel};
          border: 1px solid ${COLORS.line};
          box-shadow: 0 24px 58px rgba(0, 0, 0, 0.28);
        }

        .simAdminRouteLoading__badge {
          display: inline-flex;
          align-items: center;
          min-height: 30px;
          padding: 0 12px;
          border-radius: 999px;
          background: rgba(238, 224, 197, 0.14);
          border: 1px solid rgba(238, 224, 197, 0.2);
          color: ${COLORS.cream};
          font-size: 13px;
          font-weight: 900;
        }

        .simAdminRouteLoading__title {
          margin: 16px 0 8px;
          font-size: clamp(22px, 6vw, 34px);
          line-height: 1.14;
          letter-spacing: -0.04em;
        }

        .simAdminRouteLoading__text {
          margin: 0 0 18px;
          color: ${COLORS.soft};
          font-size: 14px;
          line-height: 1.6;
        }

        .simAdminRouteLoading__skeletonGrid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 10px;
          margin-top: 12px;
        }

        .simAdminRouteLoading__skeleton {
          height: 82px;
          border-radius: 20px;
          background: linear-gradient(
            90deg,
            rgba(255, 255, 255, 0.05),
            rgba(255, 255, 255, 0.13),
            rgba(255, 255, 255, 0.05)
          );
          background-size: 220% 100%;
          animation: simAdminRouteLoadingShimmer 1.1s ease-in-out infinite;
        }

        .simAdminRouteLoading__skeletonHero {
          height: 132px;
        }

        .simAdminRouteLoading__tabs {
          position: fixed;
          left: 50%;
          bottom: calc(12px + env(safe-area-inset-bottom));
          transform: translateX(-50%);
          width: min(520px, calc(100vw - 20px));
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 8px;
          padding: 8px;
          border-radius: 22px;
          background: rgba(7, 5, 58, 0.94);
          border: 1px solid ${COLORS.line};
          box-shadow: 0 20px 48px rgba(0, 0, 0, 0.36);
          box-sizing: border-box;
        }

        .simAdminRouteLoading__tabs span {
          min-height: 44px;
          border-radius: 16px;
          background: rgba(255, 255, 255, 0.08);
        }

        @keyframes simAdminRouteLoadingShimmer {
          0% {
            background-position: 0% 0;
          }
          100% {
            background-position: -220% 0;
          }
        }

        @media (max-width: 520px) {
          .simAdminRouteLoading {
            padding: 14px 12px 106px;
          }

          .simAdminRouteLoading__card {
            padding: 18px;
            border-radius: 24px;
          }

          .simAdminRouteLoading__skeletonGrid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </main>
  );
}
