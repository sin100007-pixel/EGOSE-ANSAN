"use client";

import { useEffect, useRef, useState } from "react";

type SimulatorPageVideoGuideKey = "linkBuilder" | "linkManager" | "presets" | "settings";

type SimulatorPageVideoGuideInfo = {
  key: SimulatorPageVideoGuideKey;
  title: string;
  description: string;
  src: string;
};

const GUIDE_VIDEO_BASE_URL =
  process.env.NEXT_PUBLIC_SIMULATOR_GUIDE_VIDEO_BASE_URL?.replace(/\/+$/, "") ?? "";

const getGuideVideoUrl = (fileName: string) => {
  if (!GUIDE_VIDEO_BASE_URL) return "";
  return `${GUIDE_VIDEO_BASE_URL}/${fileName}`;
};

const GUIDE_VIDEOS: Record<SimulatorPageVideoGuideKey, SimulatorPageVideoGuideInfo> = {
  linkBuilder: {
    key: "linkBuilder",
    title: "링크 생성 동영상",
    description: "고객에게 보낼 시뮬레이션 링크를 만드는 방법을 영상으로 안내합니다.",
    src: getGuideVideoUrl("link-builder-guide.mp4"),
  },
  linkManager: {
    key: "linkManager",
    title: "링크 관리 동영상",
    description: "보낸 시뮬레이션 링크를 확인하고 관리하는 방법을 영상으로 안내합니다.",
    src: getGuideVideoUrl("link-manager-guide.mp4"),
  },
  presets: {
    key: "presets",
    title: "프리셋 동영상",
    description: "고객에게 보여줄 추천 필름 묶음을 프리셋으로 저장하는 방법을 영상으로 안내합니다.",
    src: getGuideVideoUrl("preset-guide.mp4"),
  },
  settings: {
    key: "settings",
    title: "소개 설정 동영상",
    description: "고객 링크 첫 화면에 보일 소개 정보를 설정하는 방법을 영상으로 안내합니다.",
    src: getGuideVideoUrl("settings-guide.mp4"),
  },
};

type SimulatorPageVideoGuideProps = {
  guideKey: SimulatorPageVideoGuideKey;
};

export default function SimulatorPageVideoGuide({ guideKey }: SimulatorPageVideoGuideProps) {
  const [opened, setOpened] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const guide = GUIDE_VIDEOS[guideKey];
  const hasVideoUrl = guide.src.trim().length > 0;

  const closeGuide = () => {
    videoRef.current?.pause();
    setOpened(false);
  };

  useEffect(() => {
    if (!opened) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeGuide();
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [opened]);

  return (
    <>
      <button
        type="button"
        className="simPageVideoGuideButton"
        aria-label={`${guide.title} 보기`}
        title={`${guide.title} 보기`}
        onClick={() => setOpened(true)}
      >
        <img src="/simulator-guide-videos/video-guide-button.png" alt="" className="simPageVideoGuideButtonIcon" />
      </button>

      {opened ? (
        <div
          className="simPageVideoGuideBackdrop"
          role="dialog"
          aria-modal="true"
          aria-labelledby={`sim-page-video-guide-title-${guide.key}`}
          onClick={(event) => {
            if (event.currentTarget === event.target) closeGuide();
          }}
        >
          <div className="simPageVideoGuideCard">
            <div className="simPageVideoGuideHeader">
              <div>
                <p className="simPageVideoGuideEyebrow">동영상 사용법</p>
                <h2 id={`sim-page-video-guide-title-${guide.key}`} className="simPageVideoGuideTitle">
                  {guide.title}
                </h2>
              </div>
              <button type="button" className="simPageVideoGuideClose" onClick={closeGuide} aria-label="동영상 닫기">
                ×
              </button>
            </div>

            {hasVideoUrl ? (
              <video
                ref={videoRef}
                className="simPageVideoGuideVideo"
                controls
                autoPlay
                playsInline
                preload="metadata"
                key={guide.src}
              >
                <source src={guide.src} type="video/mp4" />
                이 브라우저에서는 동영상을 재생할 수 없습니다.
              </video>
            ) : (
              <div className="simPageVideoGuideMissing" role="status">
                Vercel 환경변수에 NEXT_PUBLIC_SIMULATOR_GUIDE_VIDEO_BASE_URL을 추가하면 동영상이 재생됩니다.
              </div>
            )}

            <p className="simPageVideoGuideDescription">{guide.description}</p>
          </div>
        </div>
      ) : null}

      <style jsx>{`
        :global(.heroGuideRow) {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-wrap: wrap;
          margin-bottom: 12px;
        }

        :global(.heroGuideRow .stepBadge),
        :global(.heroGuideRow .stepPill) {
          margin-bottom: 0;
        }

        :global(.settingsHeroGuideRow) {
          margin-bottom: 0;
        }

        .simPageVideoGuideButton {
          position: relative;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          flex: 0 0 auto;
          padding: 0;
          border: 0;
          background: transparent;
          box-shadow: none;
          cursor: pointer;
          overflow: visible;
          -webkit-tap-highlight-color: transparent;
          touch-action: manipulation;
          transition: transform 120ms ease;
        }

        .simPageVideoGuideButton:hover {
          transform: translateY(-1px);
        }

        .simPageVideoGuideButton:active {
          transform: scale(0.97);
        }

        .simPageVideoGuideButtonIcon {
          display: block;
          width: 108px;
          max-width: 28vw;
          min-width: 88px;
          height: auto;
          pointer-events: none;
          filter: drop-shadow(0 6px 12px rgba(0, 0, 0, 0.28));
        }

        .simPageVideoGuideBackdrop {
          position: fixed;
          inset: 0;
          z-index: 3200;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 18px;
          box-sizing: border-box;
          background: rgba(3, 2, 13, 0.72);
          backdrop-filter: blur(8px);
        }

        .simPageVideoGuideCard {
          width: min(100%, 460px);
          max-height: calc(100dvh - 36px);
          overflow: auto;
          border-radius: 26px;
          background: linear-gradient(180deg, rgba(24, 21, 68, 0.98) 0%, rgba(11, 9, 35, 0.98) 100%);
          border: 1px solid rgba(255, 255, 255, 0.16);
          box-shadow: 0 24px 70px rgba(0, 0, 0, 0.45);
          padding: 14px;
          box-sizing: border-box;
          color: #ffffff;
        }

        .simPageVideoGuideHeader {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 12px;
          margin-bottom: 12px;
        }

        .simPageVideoGuideEyebrow {
          margin: 0 0 4px;
          color: rgba(255, 255, 255, 0.62);
          font-size: 12px;
          font-weight: 900;
          letter-spacing: -0.02em;
        }

        .simPageVideoGuideTitle {
          margin: 0;
          color: #ffffff;
          font-size: 20px;
          line-height: 1.2;
          font-weight: 950;
          letter-spacing: -0.04em;
        }

        .simPageVideoGuideClose {
          flex: 0 0 auto;
          width: 38px;
          height: 38px;
          border-radius: 50%;
          border: 1px solid rgba(255, 255, 255, 0.18);
          background: rgba(255, 255, 255, 0.08);
          color: #ffffff;
          font-size: 28px;
          line-height: 1;
          cursor: pointer;
        }

        .simPageVideoGuideVideo {
          display: block;
          width: 100%;
          max-height: min(72dvh, 760px);
          border-radius: 18px;
          background: #000000;
          box-shadow: 0 14px 34px rgba(0, 0, 0, 0.3);
        }

        .simPageVideoGuideMissing {
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: 180px;
          border-radius: 18px;
          border: 1px dashed rgba(255, 255, 255, 0.28);
          background: rgba(255, 255, 255, 0.07);
          color: rgba(255, 255, 255, 0.82);
          padding: 18px;
          text-align: center;
          font-size: 14px;
          line-height: 1.55;
          font-weight: 800;
          letter-spacing: -0.03em;
          box-sizing: border-box;
        }

        .simPageVideoGuideDescription {
          margin: 12px 2px 2px;
          color: rgba(255, 255, 255, 0.72);
          font-size: 13px;
          line-height: 1.5;
          font-weight: 700;
          letter-spacing: -0.02em;
        }

        @media (max-width: 640px) {
          .simPageVideoGuideButtonIcon {
            width: 96px;
            min-width: 80px;
            max-width: 32vw;
          }

          .simPageVideoGuideBackdrop {
            padding: 12px;
            align-items: center;
          }

          .simPageVideoGuideCard {
            border-radius: 22px;
            max-height: calc(100dvh - 24px);
          }

          .simPageVideoGuideTitle {
            font-size: 18px;
          }
        }
      `}</style>
    </>
  );
}
