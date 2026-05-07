"use client";

import { useEffect, useState, type CSSProperties, type ReactNode } from "react";

type IntroPhoto = {
  id?: string | number | null;
  image_url: string;
  title?: string | null;
  description?: string | null;
};

type SimulatorIntroOverviewProps = {
  contractorName: string;
  logoUrl?: string | null;
  greeting?: string | null;
  phone?: string | null;
  phoneHref?: string | null;
  kakaoHref?: string | null;
  showKakao?: boolean;
  photos?: IntroPhoto[];
  customerName?: string | null;
  expiresAt?: string | null;
  brandColor?: string | null;
  showHero?: boolean;
  showStartButton?: boolean;
  showBottomNav?: boolean;
  startButtonLabel?: string;
  onStart?: () => void;
};

const COLORS = {
  bg: "#05023B",
  panel: "rgba(12,10,72,0.72)",
  panelStrong: "rgba(10,8,72,0.94)",
  cream: "#EEE0C5",
  creamText: "#7A5A34",
  line: "rgba(238,224,197,0.16)",
  soft: "rgba(255,255,255,0.70)",
  white: "#FFFFFF",
};

function formatIntroDateTime(value?: string | null) {
  if (!value) return "";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleString("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function PhoneIcon() {
  return (
    <svg viewBox="0 0 24 24" focusable="false">
      <path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1C10.61 21 3 13.39 3 4c0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.24.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2Z" />
    </svg>
  );
}

function KakaoIcon() {
  return (
    <svg viewBox="0 0 24 24" focusable="false">
      <path d="M12 4C6.48 4 2 7.55 2 11.93c0 2.84 1.88 5.33 4.7 6.73l-.74 2.72c-.08.29.24.52.49.36l3.3-2.18c.72.12 1.47.19 2.25.19 5.52 0 10-3.55 10-7.93C22 7.55 17.52 4 12 4Z" />
    </svg>
  );
}

function ContactButton({
  href,
  label,
  icon,
  ariaLabel,
}: {
  href?: string | null;
  label: string;
  icon: ReactNode;
  ariaLabel: string;
}) {
  const content = (
    <>
      <span className="introContactIcon" aria-hidden="true">
        {icon}
      </span>
      <span className="introContactLabel">{label}</span>
    </>
  );

  if (href) {
    return (
      <a
        href={href}
        target={href.startsWith("http") ? "_blank" : undefined}
        rel={href.startsWith("http") ? "noopener noreferrer" : undefined}
        className="introContactButton"
        aria-label={ariaLabel}
      >
        {content}
      </a>
    );
  }

  return (
    <div className="introContactButton" aria-label={ariaLabel}>
      {content}
    </div>
  );
}

export default function SimulatorIntroOverview({
  contractorName,
  logoUrl,
  greeting,
  phone,
  phoneHref,
  kakaoHref,
  showKakao,
  photos = [],
  customerName,
  expiresAt,
  brandColor,
  showHero = true,
  showStartButton = false,
  showBottomNav = false,
  startButtonLabel = "시뮬레이션 시작",
  onStart,
}: SimulatorIntroOverviewProps) {
  const [selectedPhoto, setSelectedPhoto] = useState<IntroPhoto | null>(null);

  const safeContractorName = contractorName || "시공자";
  const safeGreeting =
    greeting || "시공 전 원하는 필름을 미리 적용해보시고 편하게 문의해주세요.";
  const visiblePhotos = photos.filter((photo) => photo.image_url);
  const shouldShowKakao = showKakao ?? Boolean(kakaoHref);
  const formattedExpiresAt = formatIntroDateTime(expiresAt);
  const hasLinkInfo = Boolean(customerName || formattedExpiresAt);
  const rootStyle = {
    "--intro-brand-color": brandColor || COLORS.cream,
  } as CSSProperties;

  useEffect(() => {
    if (!selectedPhoto) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setSelectedPhoto(null);
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [selectedPhoto]);

  return (
    <div className="introOverview" style={rootStyle}>
      {showHero ? (
        <section className="introHeroCard">
          <div className="stepBadge">step1 소개</div>
          <h1 className="introTitle">필름 시뮬레이터</h1>
          <p className="introHeroText">
            시공자 소개와 대표 시공사진을 확인한 뒤 시뮬레이션을 시작하세요.
          </p>

          {hasLinkInfo ? (
            <div className="linkCard">
              {customerName ? <div>고객명: {customerName}</div> : null}
              {formattedExpiresAt ? <div>시뮬레이션 만료: {formattedExpiresAt}</div> : null}
            </div>
          ) : null}
        </section>
      ) : null}

      <section className="introCard">
        <div className="introTop">
          <div className="logoBox">
            {logoUrl ? (
              <img src={logoUrl} alt={`${safeContractorName} 로고`} />
            ) : (
              <span>{safeContractorName.slice(0, 1)}</span>
            )}
          </div>

          <div className="textBox">
            <p>{safeGreeting}</p>

            {phone || shouldShowKakao ? (
              <div className="contactRow">
                {phone ? (
                  <ContactButton
                    href={phoneHref}
                    label={phone}
                    icon={<PhoneIcon />}
                    ariaLabel={`전화 ${phone}`}
                  />
                ) : null}
                {shouldShowKakao ? (
                  <ContactButton
                    href={kakaoHref}
                    label="카카오 문의"
                    icon={<KakaoIcon />}
                    ariaLabel="카카오 문의"
                  />
                ) : null}
              </div>
            ) : null}

            {showStartButton ? (
              <button type="button" onClick={onStart} className="startButton">
                {startButtonLabel}
              </button>
            ) : null}
          </div>
        </div>
      </section>

      {visiblePhotos.length > 0 ? (
        <section className="portfolioBlock">
          <div className="portfolioHeaderRow">
            <div>
              <div className="sectionLabel">대표 시공사진</div>
              <h3>실제 시공 사례를 확인해보세요.</h3>
            </div>
            <span>{visiblePhotos.length}장</span>
          </div>

          <div className="portfolioPhotoGrid">
            {visiblePhotos.map((photo, index) => (
              <figure
                key={photo.id || `${photo.image_url}-${index}`}
                className="portfolioPhotoCard"
              >
                <button
                  type="button"
                  className="portfolioPhotoButton"
                  onClick={() => setSelectedPhoto(photo)}
                  aria-label={`${photo.title || "대표 시공사진"} 크게 보기`}
                >
                  <img
                    src={photo.image_url}
                    alt={photo.title || "대표 시공사진"}
                    loading="lazy"
                  />
                  {photo.title || photo.description ? (
                    <figcaption>
                      {photo.title ? <strong>{photo.title}</strong> : null}
                      {photo.description ? <span>{photo.description}</span> : null}
                    </figcaption>
                  ) : null}
                </button>
              </figure>
            ))}
          </div>
        </section>
      ) : null}

      {selectedPhoto ? (
        <div
          className="photoModalBackdrop"
          role="dialog"
          aria-modal="true"
          aria-label="대표 시공사진 크게 보기"
          onClick={() => setSelectedPhoto(null)}
        >
          <div
            className="photoModalCard"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              className="photoModalClose"
              onClick={() => setSelectedPhoto(null)}
              aria-label="닫기"
            >
              ×
            </button>

            <div className="photoModalImageWrap">
              <img
                src={selectedPhoto.image_url}
                alt={selectedPhoto.title || "대표 시공사진"}
                className="photoModalImage"
              />
            </div>

            {selectedPhoto.title || selectedPhoto.description ? (
              <div className="photoModalCaption">
                {selectedPhoto.title ? <strong>{selectedPhoto.title}</strong> : null}
                {selectedPhoto.description ? <span>{selectedPhoto.description}</span> : null}
              </div>
            ) : null}
          </div>
        </div>
      ) : null}

      {showBottomNav ? (
        <nav className="previewStepNav" aria-label="시뮬레이터 단계 미리보기">
          <button type="button" className="previewStepButton previewStepButtonActive">
            <span>1</span>소개
          </button>
          <button type="button" className="previewStepButton">
            <span>2</span>공간선택
          </button>
          <button type="button" className="previewStepButton">
            <span>3</span>색상적용
          </button>
          <button type="button" className="previewStepButton">
            <span>4</span>결정확정
          </button>
        </nav>
      ) : null}

      <style jsx>{`
        .introOverview {
          display: flex;
          flex-direction: column;
          gap: 14px;
          color: ${COLORS.white};
          margin-top: -24px;
        }

        .introHeroCard,
        .introCard,
        .portfolioBlock {
          border: 1px solid ${COLORS.line};
          box-shadow: 0 18px 48px rgba(0, 0, 0, 0.22);
          background: linear-gradient(
            180deg,
            rgba(255, 255, 255, 0.075),
            rgba(255, 255, 255, 0.035)
          );
          border-radius: 30px;
        }

        .introHeroCard {
          padding: 22px 18px;
        }

        .stepBadge {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          border-radius: 999px;
          padding: 7px 11px;
          background: rgba(238, 224, 197, 0.1);
          color: ${COLORS.cream};
          font-size: 13px;
          font-weight: 900;
          margin-bottom: 9px;
        }

        .introTitle {
          margin: 0;
          color: ${COLORS.white};
          font-size: clamp(28px, 5vw, 46px);
          line-height: 1.08;
          letter-spacing: -0.04em;
          word-break: keep-all;
        }

        .introHeroText {
          margin: 12px 0 0;
          color: ${COLORS.soft};
          font-size: 15px;
          line-height: 1.7;
          word-break: keep-all;
        }

        .linkCard {
          margin-top: 18px;
          border-radius: 22px;
          padding: 14px 16px;
          background: rgba(238, 224, 197, 0.1);
          border: 1px solid ${COLORS.line};
          color: ${COLORS.white};
          font-size: 14px;
          line-height: 1.65;
          font-weight: 800;
        }

        .introCard {
          padding: 18px;
        }

        .introTop {
          display: flex;
          flex-direction: column;
          gap: 16px;
          align-items: stretch;
        }

        .logoBox {
          width: min(340px, 100%);
          min-height: 0;
          overflow: hidden;
          display: flex;
          align-items: center;
          justify-content: center;
          align-self: center;
          background: transparent;
          border: 0;
          border-radius: 0;
          color: ${COLORS.cream};
          font-size: 72px;
          font-weight: 1000;
        }

        .logoBox img {
          width: 100%;
          max-width: 340px;
          height: auto;
          max-height: 136px;
          object-fit: contain;
          object-position: center center;
          display: block;
          transform: none;
        }

        .textBox p {
          margin: 0;
          color: ${COLORS.soft};
          font-size: 15px;
          line-height: 1.72;
          white-space: pre-line;
          word-break: keep-all;
        }

        .contactRow {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 8px;
          margin-top: 16px;
          min-width: 0;
        }

        :global(.introContactButton) {
          width: 100%;
          max-width: 100%;
          min-width: 0;
          min-height: 40px;
          border-radius: 999px;
          padding: 0 10px;
          box-sizing: border-box;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          background: rgba(238, 224, 197, 0.2);
          border: 0;
          box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.08);
          color: ${COLORS.cream};
          text-decoration: none;
          font-size: 12px;
          font-weight: 1000;
          letter-spacing: -0.02em;
          line-height: 1;
          white-space: nowrap;
          word-break: keep-all;
          overflow: hidden;
          appearance: none;
          -webkit-appearance: none;
        }

        :global(.introContactButton:link),
        :global(.introContactButton:visited),
        :global(.introContactButton:hover),
        :global(.introContactButton:active) {
          color: ${COLORS.cream};
          text-decoration: none;
        }

        :global(.introContactIcon) {
          width: 18px;
          height: 18px;
          min-width: 18px;
          min-height: 18px;
          border-radius: 999px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          flex: 0 0 auto;
          background: rgba(238, 224, 197, 0.18);
          color: ${COLORS.cream};
        }

        :global(.introContactIcon svg) {
          width: 12px;
          height: 12px;
          display: block;
          fill: currentColor;
        }

        :global(.introContactLabel) {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-width: 0;
          color: inherit;
        }

        .startButton {
          width: 100%;
          min-height: 52px;
          margin-top: 12px;
          border: 0;
          border-radius: 999px;
          background: ${COLORS.cream};
          color: ${COLORS.creamText};
          font-size: 16px;
          font-weight: 1000;
          cursor: pointer;
          box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.55),
            0 14px 30px rgba(0, 0, 0, 0.22);
        }

        .portfolioBlock {
          padding: 14px;
        }

        .portfolioHeaderRow {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 10px;
          margin-bottom: 12px;
        }

        .sectionLabel {
          color: ${COLORS.cream};
          font-size: 13px;
          font-weight: 900;
          margin-bottom: 6px;
        }

        .portfolioHeaderRow h3 {
          margin: 0;
          color: ${COLORS.white};
          font-size: 20px;
          line-height: 1.32;
          letter-spacing: -0.03em;
          word-break: keep-all;
        }

        .portfolioHeaderRow > span {
          flex-shrink: 0;
          border-radius: 999px;
          padding: 7px 10px;
          background: rgba(238, 224, 197, 0.1);
          color: ${COLORS.cream};
          font-size: 12px;
          font-weight: 900;
        }

        .portfolioPhotoGrid {
          display: flex;
          gap: 12px;
          overflow-x: auto;
          overflow-y: hidden;
          padding: 0 2px 8px;
          scroll-snap-type: x mandatory;
          -webkit-overflow-scrolling: touch;
          overscroll-behavior-x: contain;
        }

        .portfolioPhotoGrid::-webkit-scrollbar {
          height: 6px;
        }

        .portfolioPhotoGrid::-webkit-scrollbar-thumb {
          border-radius: 999px;
          background: rgba(238, 224, 197, 0.24);
        }

        .portfolioPhotoGrid::-webkit-scrollbar-track {
          background: transparent;
        }

        .portfolioPhotoCard {
          position: relative;
          flex: 0 0 min(82%, 330px);
          min-height: 230px;
          margin: 0;
          border-radius: 20px;
          overflow: hidden;
          background: rgba(238, 224, 197, 0.08);
          border: 1px solid ${COLORS.line};
          scroll-snap-align: start;
        }

        .portfolioPhotoCard:first-child {
          min-height: 230px;
        }

        .portfolioPhotoButton {
          position: relative;
          display: block;
          width: 100%;
          height: 100%;
          min-height: inherit;
          padding: 0;
          border: 0;
          background: transparent;
          cursor: pointer;
          text-align: left;
        }

        .portfolioPhotoButton img {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
          transition: transform 0.2s ease;
        }

        .portfolioPhotoButton:active img {
          transform: scale(1.01);
        }

        .portfolioPhotoCard figcaption {
          position: absolute;
          left: 10px;
          right: 10px;
          bottom: 10px;
          border-radius: 14px;
          padding: 9px 10px;
          background: rgba(5, 2, 59, 0.76);
          backdrop-filter: blur(8px);
          display: grid;
          gap: 3px;
          pointer-events: none;
        }

        .portfolioPhotoCard strong,
        .portfolioPhotoCard span {
          display: block;
        }

        .portfolioPhotoCard strong {
          color: ${COLORS.cream};
          font-size: 13px;
          font-weight: 900;
        }

        .portfolioPhotoCard span {
          color: ${COLORS.soft};
          font-size: 12px;
          line-height: 1.45;
          font-weight: 500;
        }

        .photoModalBackdrop {
          position: fixed;
          inset: 0;
          z-index: 9999;
          background: rgba(3, 2, 28, 0.86);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
          backdrop-filter: blur(8px);
        }

        .photoModalCard {
          position: relative;
          width: min(920px, 100%);
          max-height: 90vh;
          border-radius: 22px;
          overflow: hidden;
          border: 1px solid rgba(238, 224, 197, 0.2);
          background: rgba(10, 8, 72, 0.96);
          box-shadow: 0 28px 80px rgba(0, 0, 0, 0.45);
          display: flex;
          flex-direction: column;
        }

        .photoModalClose {
          position: absolute;
          top: 10px;
          right: 10px;
          z-index: 2;
          width: 38px;
          height: 38px;
          border: 0;
          border-radius: 999px;
          background: rgba(5, 2, 59, 0.72);
          color: ${COLORS.cream};
          font-size: 26px;
          line-height: 1;
          cursor: pointer;
        }

        .photoModalImageWrap {
          width: 100%;
          background: rgba(0, 0, 0, 0.18);
        }

        .photoModalImage {
          display: block;
          width: 100%;
          max-height: 72vh;
          object-fit: contain;
          background: #111;
        }

        .photoModalCaption {
          padding: 16px 18px 18px;
          display: grid;
          gap: 6px;
        }

        .photoModalCaption strong {
          color: ${COLORS.cream};
          font-size: 16px;
          font-weight: 900;
          line-height: 1.4;
        }

        .photoModalCaption span {
          color: ${COLORS.soft};
          font-size: 14px;
          line-height: 1.6;
          font-weight: 500;
        }

        .previewStepNav {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 6px;
          border-radius: 22px;
          padding: 6px;
          background: rgba(8, 6, 62, 0.96);
          border: 1px solid ${COLORS.line};
          box-shadow: 0 18px 48px rgba(0, 0, 0, 0.22);
        }

        .previewStepButton {
          min-height: 44px;
          border: 0;
          border-radius: 16px;
          background: rgba(255, 255, 255, 0.05);
          color: ${COLORS.soft};
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          font-size: 12px;
          font-weight: 900;
        }

        .previewStepButton span {
          width: 20px;
          height: 20px;
          border-radius: 999px;
          background: rgba(238, 224, 197, 0.18);
          color: ${COLORS.cream};
          display: inline-flex;
          align-items: center;
          justify-content: center;
          font-size: 11px;
        }

        .previewStepButtonActive {
          background: rgba(238, 224, 197, 0.14);
          color: ${COLORS.cream};
          box-shadow: inset 0 0 0 1px rgba(238, 224, 197, 0.24);
        }

        @media (max-width: 820px) {
          .introOverview {
            gap: 10px;
          }

          .introHeroCard,
          .introCard,
          .portfolioBlock {
            border-radius: 24px;
          }

          .introHeroCard,
          .introCard {
            padding: 16px 14px;
          }

          .introTitle {
            font-size: 28px;
            line-height: 1.08;
          }

          .introHeroText,
          .textBox p {
            font-size: 14px;
            line-height: 1.62;
          }

          .logoBox {
            width: min(300px, 100%);
            font-size: 42px;
          }

          .logoBox img {
            max-width: 300px;
            max-height: 120px;
          }

          .contactRow {
            gap: 8px;
          }

          :global(.introContactButton) {
            min-height: 40px;
            padding: 0 10px;
            font-size: 12px;
            gap: 6px;
          }

          :global(.introContactIcon) {
            width: 18px;
            height: 18px;
            min-width: 18px;
            min-height: 18px;
          }

          .portfolioPhotoGrid {
            display: flex;
            grid-template-columns: unset;
            overflow-x: auto;
          }

          .portfolioPhotoCard,
          .portfolioPhotoCard:first-child {
            flex: 0 0 86%;
            min-height: 210px;
          }

          .photoModalBackdrop {
            padding: 14px;
          }

          .photoModalCard {
            width: 100%;
            max-height: 88vh;
            border-radius: 18px;
          }

          .photoModalImage {
            max-height: 64vh;
          }
        }

        @media (max-width: 420px) {
          .contactRow {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }

          :global(.introContactButton) {
            min-width: 0;
            min-height: 38px;
            padding: 0 9px;
            font-size: 11px;
            gap: 5px;
          }

          :global(.introContactIcon) {
            width: 17px;
            height: 17px;
            min-width: 17px;
            min-height: 17px;
          }

          :global(.introContactIcon svg) {
            width: 11px;
            height: 11px;
          }

          .previewStepNav {
            gap: 4px;
          }

          .previewStepButton {
            min-height: 40px;
            font-size: 11px;
          }

          .previewStepButton span {
            width: 18px;
            height: 18px;
            font-size: 10px;
          }

          .portfolioPhotoCard,
          .portfolioPhotoCard:first-child {
            flex-basis: 88%;
          }

          .photoModalClose {
            top: 8px;
            right: 8px;
            width: 34px;
            height: 34px;
            font-size: 24px;
          }

          .photoModalCaption {
            padding: 14px 14px 16px;
          }

          .photoModalCaption strong {
            font-size: 15px;
          }

          .photoModalCaption span {
            font-size: 13px;
          }
        }
      `}</style>
    </div>
  );
}