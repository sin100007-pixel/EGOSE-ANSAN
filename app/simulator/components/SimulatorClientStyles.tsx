"use client";

type SimulatorClientColors = {
  bg: string;
  panel: string;
  panelStrong: string;
  cream: string;
  creamText: string;
  line: string;
  soft: string;
  white: string;
};

type SimulatorClientStylesProps = {
  colors: SimulatorClientColors;
};

export default function SimulatorClientStyles({ colors: COLORS }: SimulatorClientStylesProps) {
  return (
    <style jsx global>{`
        .pageWrap {
          width: 100%;
          min-height: 100vh;
          padding-bottom: 92px;
          box-sizing: border-box;
        }


        .dashboardMoveOverlay {
          position: fixed;
          inset: 0;
          z-index: 9999;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(7, 6, 27, 0.30);
          backdrop-filter: blur(2px);
          pointer-events: none;
        }

        .dashboardMoveToast {
          padding: 14px 18px;
          border-radius: 999px;
          background: rgba(10, 8, 72, 0.94);
          color: #fff;
          border: 1px solid rgba(255,255,255,0.18);
          box-shadow: 0 14px 34px rgba(0,0,0,0.28);
          font-size: 14px;
          font-weight: 900;
          letter-spacing: -0.02em;
        }

        .filmApplyOverlay {
          position: fixed;
          inset: 0;
          z-index: 10000;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 18px;
          background: rgba(5, 2, 35, 0.38);
          backdrop-filter: blur(3px);
        }

        .filmApplyToast {
          width: min(280px, 100%);
          border-radius: 24px;
          padding: 22px 18px 18px;
          background: rgba(10, 8, 72, 0.96);
          border: 1px solid rgba(238,224,197,0.28);
          box-shadow: 0 22px 58px rgba(0,0,0,0.42);
          color: ${COLORS.white};
          text-align: center;
        }

        .filmApplySpinner {
          width: 34px;
          height: 34px;
          border-radius: 999px;
          border: 3px solid rgba(238,224,197,0.28);
          border-top-color: ${COLORS.cream};
          display: inline-block;
          margin-bottom: 12px;
          animation: filmApplySpin 0.8s linear infinite;
        }

        .filmApplyToast strong {
          display: block;
          color: ${COLORS.cream};
          font-size: 18px;
          font-weight: 1000;
          letter-spacing: -0.03em;
        }

        .filmApplyToast p {
          margin: 7px 0 0;
          color: ${COLORS.soft};
          font-size: 13px;
          line-height: 1.45;
          word-break: keep-all;
        }

        @keyframes filmApplySpin {
          to {
            transform: rotate(360deg);
          }
        }

        .customerIntroSkeleton {
          width: min(720px, 100%);
          margin: 0 auto;
          display: grid;
          gap: 16px;
          padding: 4px 0 24px;
        }

        .introSkeletonHero,
        .introSkeletonProfile,
        .introSkeletonPortfolio {
          position: relative;
          overflow: hidden;
          border: 1px solid ${COLORS.line};
          border-radius: 30px;
          background: linear-gradient(180deg, rgba(255, 255, 255, 0.08), rgba(255, 255, 255, 0.035));
          box-shadow: 0 18px 48px rgba(0, 0, 0, 0.22);
          padding: 24px;
        }

        .introSkeletonProfile {
          display: grid;
          grid-template-columns: 112px minmax(0, 1fr);
          gap: 16px;
          align-items: center;
        }

        .introSkeletonPortfolio {
          display: grid;
          gap: 14px;
        }

        .introSkeletonPill,
        .introSkeletonTitle,
        .introSkeletonText,
        .introSkeletonLogo,
        .introSkeletonButton,
        .introSkeletonPhoto {
          position: relative;
          overflow: hidden;
          background: rgba(255, 255, 255, 0.09);
        }

        .introSkeletonPill::after,
        .introSkeletonTitle::after,
        .introSkeletonText::after,
        .introSkeletonLogo::after,
        .introSkeletonButton::after,
        .introSkeletonPhoto::after,
        .introSkeletonHero::after,
        .introSkeletonProfile::after,
        .introSkeletonPortfolio::after {
          content: "";
          position: absolute;
          inset: 0;
          transform: translateX(-100%);
          background: linear-gradient(
            90deg,
            transparent 0%,
            rgba(255, 255, 255, 0.08) 35%,
            rgba(255, 255, 255, 0.17) 50%,
            transparent 100%
          );
          animation: introSkeletonShimmer 1.35s infinite;
        }

        .introSkeletonPill {
          width: 132px;
          height: 36px;
          border-radius: 999px;
          background: rgba(238, 224, 197, 0.15);
          margin-bottom: 18px;
        }

        .introSkeletonTitle {
          height: 38px;
          border-radius: 999px;
          margin-top: 10px;
        }

        .introSkeletonWide {
          width: 76%;
        }

        .introSkeletonMid {
          width: 52%;
        }

        .introSkeletonText {
          height: 18px;
          border-radius: 999px;
          margin-top: 14px;
          background: rgba(255, 255, 255, 0.075);
        }

        .introSkeletonTextLong {
          width: 86%;
        }

        .introSkeletonTextMid {
          width: 64%;
        }

        .introSkeletonName {
          width: 160px;
          height: 24px;
          margin-top: 0;
          background: rgba(238, 224, 197, 0.12);
        }

        .introSkeletonSectionTitle {
          width: 180px;
          height: 24px;
          margin-top: 0;
          background: rgba(238, 224, 197, 0.12);
        }

        .introSkeletonLogo {
          width: 112px;
          height: 112px;
          border-radius: 28px;
          background: rgba(238, 224, 197, 0.13);
        }

        .introSkeletonButtons {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px;
          margin-top: 18px;
        }

        .introSkeletonButton {
          height: 48px;
          border-radius: 16px;
          background: rgba(238, 224, 197, 0.16);
        }

        .introSkeletonPhotoGrid {
          display: grid;
          grid-template-columns: 1.4fr 1fr;
          gap: 10px;
        }

        .introSkeletonPhoto {
          min-height: 140px;
          border-radius: 22px;
          background: rgba(255, 255, 255, 0.08);
        }

        .introSkeletonPhotoLarge {
          grid-row: span 2;
          min-height: 292px;
        }

        @keyframes introSkeletonShimmer {
          100% {
            transform: translateX(100%);
          }
        }

        .spaceLoadingSkeleton {
          border: 1px solid ${COLORS.line};
          border-radius: 28px;
          padding: 20px;
          background: ${COLORS.panel};
          box-shadow: 0 18px 48px rgba(0, 0, 0, 0.22);
          overflow: hidden;
        }

        .spaceSkeletonHeader {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 16px;
          margin-bottom: 18px;
        }

        .spaceSkeletonPill,
        .spaceSkeletonTitle,
        .spaceSkeletonText,
        .spaceSkeletonCount,
        .spaceSkeletonCard,
        .spaceSkeletonThumb,
        .spaceSkeletonName,
        .spaceSkeletonDesc {
          position: relative;
          overflow: hidden;
          background: rgba(255, 255, 255, 0.08);
        }

        .spaceSkeletonPill::after,
        .spaceSkeletonTitle::after,
        .spaceSkeletonText::after,
        .spaceSkeletonCount::after,
        .spaceSkeletonCard::after,
        .spaceSkeletonThumb::after,
        .spaceSkeletonName::after,
        .spaceSkeletonDesc::after {
          content: "";
          position: absolute;
          inset: 0;
          transform: translateX(-100%);
          background: linear-gradient(
            90deg,
            transparent 0%,
            rgba(255, 255, 255, 0.08) 35%,
            rgba(255, 255, 255, 0.17) 50%,
            transparent 100%
          );
          animation: spaceSkeletonShimmer 1.35s infinite;
        }

        .spaceSkeletonPill {
          width: 132px;
          height: 34px;
          border-radius: 999px;
          background: rgba(238, 224, 197, 0.15);
        }

        .spaceSkeletonTitle {
          width: 220px;
          max-width: 70vw;
          height: 34px;
          border-radius: 999px;
          margin-top: 14px;
          background: rgba(255, 255, 255, 0.11);
        }

        .spaceSkeletonText {
          width: 320px;
          max-width: 74vw;
          height: 16px;
          border-radius: 999px;
          margin-top: 13px;
        }

        .spaceSkeletonCount {
          flex: 0 0 auto;
          width: 82px;
          height: 38px;
          border-radius: 999px;
          background: rgba(238, 224, 197, 0.13);
        }

        .spaceSkeletonGrid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 14px;
        }

        .spaceSkeletonCard {
          border: 1px solid ${COLORS.line};
          border-radius: 24px;
          padding: 12px;
          background: rgba(255, 255, 255, 0.045);
        }

        .spaceSkeletonThumb {
          width: 100%;
          aspect-ratio: 4 / 3;
          border-radius: 18px;
          background: rgba(255, 255, 255, 0.09);
        }

        .spaceSkeletonName {
          width: 48%;
          height: 18px;
          border-radius: 999px;
          margin-top: 12px;
          background: rgba(238, 224, 197, 0.12);
        }

        .spaceSkeletonDesc {
          width: 72%;
          height: 13px;
          border-radius: 999px;
          margin-top: 9px;
        }

        @keyframes spaceSkeletonShimmer {
          100% {
            transform: translateX(100%);
          }
        }

        .pageInner {
          width: min(1120px, 100%);
          margin: 0 auto;
          padding: 24px 16px 48px;
          box-sizing: border-box;
        }

        .pageInner.pageInnerCustomerIntroWithGuide {
          padding-top: calc(env(safe-area-inset-top, 0px) + 104px);
        }


        .guideToggleFloatingButton {
          position: fixed;
          top: calc(env(safe-area-inset-top, 0px) + 10px);
          right: 10px;
          z-index: 80;
          width: 88px;
          height: 88px;
          padding: 0;
          margin: 0;
          border: 0;
          background: transparent;
          box-shadow: none;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          justify-content: center;
        }

        .guideToggleFloatingImage {
          width: 100%;
          height: 100%;
          display: block;
          object-fit: contain;
        }

        .guideToggleFloatingButton:focus-visible {
          outline: 2px solid ${COLORS.cream};
          outline-offset: 3px;
          border-radius: 18px;
        }

        .backButton {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          border: 1px solid ${COLORS.line};
          border-radius: 999px;
          padding: 11px 15px;
          background: ${COLORS.panelStrong};
          color: ${COLORS.cream};
          box-shadow: 0 14px 34px rgba(0, 0, 0, 0.28);
          cursor: pointer;
          font-size: 14px;
          font-weight: 900;
          margin: 16px 0 0 16px;
          position: sticky;
          top: 14px;
          z-index: 50;
        }

        .heroCard,
        .contractorIntroCard,
        .spaceSelectCard,
        .applyCard,
        .decisionCard {
          border: 1px solid ${COLORS.line};
          box-shadow: 0 18px 48px rgba(0, 0, 0, 0.22);
          background: ${COLORS.panel};
        }

        .heroCard {
          border-radius: 30px;
          padding: 22px 18px;
          background: linear-gradient(180deg, rgba(255, 255, 255, 0.08), rgba(255, 255, 255, 0.03));
          margin-bottom: 18px;
        }

        .heroTopRow {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 16px;
          flex-wrap: wrap;
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

        .pageTitle {
          margin: 0;
          font-size: clamp(28px, 5vw, 46px);
          line-height: 1.08;
          letter-spacing: -0.04em;
          word-break: keep-all;
        }

        .heroText {
          margin: 12px 0 0;
          color: ${COLORS.soft};
          font-size: 15px;
          line-height: 1.7;
          word-break: keep-all;
        }

        .linkCard {
         display: inline-flex;
          align-items: center;
         align-self: flex-start;
          min-width: 0;
          max-width: min(100%, 320px);
         border-radius: 20px;
         padding: 10px 14px;
          background: rgba(238, 224, 197, 0.1);
         border: 1px solid ${COLORS.line};
          }

          .linkCardCompact {
          min-height: auto;
          }

          .linkCardText {
         color: ${COLORS.white};
         font-size: 14px;
          line-height: 1.45;
         font-weight: 800;
          word-break: keep-all;
        }

        .contractorIntroCard,
        .spaceSelectCard,
        .applyCard,
        .decisionCard {
          border-radius: 30px;
          padding: 18px;
        }

        .contractorIntroCard {
          border: 1px solid ${COLORS.line};
          box-shadow: 0 18px 48px rgba(0, 0, 0, 0.22);
          background: linear-gradient(180deg, rgba(255, 255, 255, 0.075), rgba(255, 255, 255, 0.035));
        }

        .contractorIntroTop {
          display: flex;
          flex-direction: column;
          gap: 16px;
          align-items: stretch;
        }

        .contractorLogoBox {
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

        .contractorLogoBox img {
          width: 100%;
          max-width: 340px;
          height: auto;
          max-height: 136px;
          object-fit: contain;
          object-position: center center;
          display: block;
          transform: none;
        }

        .contractorIntroTextBox h2 {
          margin: 0;
          color: ${COLORS.white};
          font-size: clamp(25px, 4vw, 38px);
          line-height: 1.16;
          letter-spacing: -0.04em;
          word-break: keep-all;
        }

        .contractorIntroTextBox p {
          margin: 12px 0 0;
          color: ${COLORS.soft};
          font-size: 15px;
          line-height: 1.72;
          white-space: pre-line;
          word-break: keep-all;
        }

        .contractorContactRow {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 10px;
          margin-top: 16px;
        }

        .contractorContactButton {
          min-height: 46px;
          border-radius: 999px;
          padding: 0 15px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          background: rgba(238, 224, 197, 0.1);
          border: 1px solid rgba(238, 224, 197, 0.2);
          box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.12), 0 12px 24px rgba(0, 0, 0, 0.18);
          color: ${COLORS.cream};
          text-decoration: none;
          font-size: 14px;
          font-weight: 1000;
          white-space: nowrap;
          word-break: keep-all;
        }

        .contractorContactIcon {
          width: 22px;
          height: 22px;
          border-radius: 999px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          flex: 0 0 auto;
          background: rgba(238, 224, 197, 0.16);
          color: ${COLORS.cream};
        }

        .contractorContactIcon svg {
          width: 14px;
          height: 14px;
          display: block;
          fill: currentColor;
        }

        .contractorContactIcon.kakao svg {
          width: 15px;
          height: 15px;
        }

        .portfolioPreviewBlock {
          margin-top: 18px;
          border-radius: 24px;
          padding: 14px;
          background: rgba(255, 255, 255, 0.045);
          border: 1px solid ${COLORS.line};
        }

        .portfolioHeaderRow {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 10px;
          margin-bottom: 12px;
        }

        .portfolioHeaderRow h3 {
          margin: 0;
          color: ${COLORS.white};
          font-size: 20px;
          letter-spacing: -0.03em;
        }

        .portfolioHeaderRow span {
          flex-shrink: 0;
          border-radius: 999px;
          padding: 7px 10px;
          background: rgba(238, 224, 197, 0.1);
          color: ${COLORS.cream};
          font-size: 12px;
          font-weight: 900;
        }

        .portfolioPhotoGrid {
          display: grid;
          grid-template-columns: 1.2fr 1fr 1fr;
          gap: 10px;
        }

        .portfolioPhotoCard {
          position: relative;
          min-height: 180px;
          margin: 0;
          border-radius: 20px;
          overflow: hidden;
          background: rgba(238, 224, 197, 0.08);
          border: 1px solid ${COLORS.line};
        }

        .portfolioPhotoCard:first-child {
          min-height: 260px;
        }

        .portfolioPhotoCard img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
          position: absolute;
          inset: 0;
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
        }

        .portfolioPhotoCard figcaption strong {
          color: ${COLORS.cream};
          font-size: 13px;
          font-weight: 1000;
        }

        .portfolioPhotoCard figcaption span {
          color: ${COLORS.white};
          font-size: 12px;
          line-height: 1.35;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }

        .introStartButton {
          width: 100%;
          min-height: 54px;
          border: none;
          border-radius: 999px;
          margin-top: 12px;
          background: ${COLORS.cream};
          color: ${COLORS.creamText};
          box-shadow: 0 14px 30px rgba(0, 0, 0, 0.22);
          font-size: 17px;
          font-weight: 1000;
          cursor: pointer;
        }

        .sectionHeader,
        .applyTopRow {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 12px;
          margin-bottom: 14px;
        }

        .sectionLabel {
          color: ${COLORS.cream};
          font-size: 13px;
          font-weight: 900;
          margin-bottom: 6px;
        }

        .spaceSectionHeaderCompact {
          align-items: center;
        }

        .spaceGuideText {
          margin: 7px 0 0;
          color: ${COLORS.soft};
          font-size: 13px;
          line-height: 1.45;
          word-break: keep-all;
        }

        .sectionTitle,
        .spaceTitle {
          margin: 0;
          font-size: clamp(24px, 4vw, 34px);
          letter-spacing: -0.03em;
          word-break: keep-all;
        }

        .spaceCount,
        .changeSpaceButton {
          flex-shrink: 0;
          border-radius: 999px;
          padding: 10px 13px;
          background: rgba(238, 224, 197, 0.1);
          color: ${COLORS.cream};
          border: 1px solid ${COLORS.line};
          font-size: 13px;
          font-weight: 900;
        }

        .changeSpaceButton {
          cursor: pointer;
        }

        .spaceGrid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(170px, 1fr));
          gap: 12px;
        }

        .spaceCard {
          display: flex;
          flex-direction: column;
          height: 100%;
          border: 1px solid ${COLORS.line};
          border-radius: 22px;
          background: rgba(255, 255, 255, 0.045);
          padding: 8px;
          color: ${COLORS.white};
          text-align: left;
          cursor: pointer;
          overflow: hidden;
          transition: transform 0.16s ease, border-color 0.16s ease, background 0.16s ease;
        }

        .spaceCard:active {
          transform: scale(0.985);
        }

        .spaceCardActive {
          border-color: rgba(238, 224, 197, 0.52);
          background: rgba(238, 224, 197, 0.09);
        }

        .spaceThumb {
          position: relative;
          width: 100%;
          aspect-ratio: 1536 / 1024;
          flex: 0 0 auto;
          border-radius: 16px;
          overflow: hidden;
          background: rgba(255, 255, 255, 0.06);
          border: 1px solid ${COLORS.line};
          isolation: isolate;
        }

        .spaceThumbImage {
          display: block;
          width: 100%;
          height: 100%;
          object-fit: contain;
          object-position: center;
        }

        .spaceThumbEmpty {
          height: 100%;
          display: grid;
          place-items: center;
          color: ${COLORS.soft};
          font-size: 13px;
          font-weight: 800;
        }

        .spaceInfo {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
          padding: 10px 2px 2px;
          min-width: 0;
          min-height: 34px;
        }

        .spaceName {
          min-width: 0;
          color: ${COLORS.cream};
          font-size: 15px;
          font-weight: 900;
          margin-bottom: 0;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .spaceDesc {
          color: ${COLORS.soft};
          font-size: 12px;
          line-height: 1.5;
          word-break: keep-all;
        }

        .spaceGoBadge {
          flex-shrink: 0;
          border-radius: 999px;
          padding: 5px 8px;
          background: rgba(238, 224, 197, 0.12);
          color: ${COLORS.cream};
          font-size: 11px;
          font-weight: 900;
        }

        .previewViewport {
          position: relative;
          overflow: hidden;
          border-radius: 26px;
          border: 1px solid ${COLORS.line};
          background: rgba(255, 255, 255, 0.04);
          min-height: 260px;
          width: 100%;
          isolation: isolate;
        }

        .sceneStage {
          position: absolute;
          inset: 0;
          overflow: hidden;
          border-radius: 26px;
          background: transparent;
        }

        .maskedTransparencyLayer,
        .maskedFilmLayer {
          position: absolute;
          inset: 0;
          pointer-events: none;

          -webkit-mask-repeat: no-repeat;
          -webkit-mask-position: center;
          -webkit-mask-size: 100% 100%;

          mask-repeat: no-repeat;
          mask-position: center;
          mask-size: 100% 100%;
        }

        .maskedTransparencyLayer {
          z-index: 2;
          background-color: rgba(255, 255, 255, 0.94);
          background-image:
            linear-gradient(45deg, rgba(175, 181, 202, 0.9) 25%, transparent 25%),
            linear-gradient(-45deg, rgba(175, 181, 202, 0.9) 25%, transparent 25%),
            linear-gradient(45deg, transparent 75%, rgba(175, 181, 202, 0.9) 75%),
            linear-gradient(-45deg, transparent 75%, rgba(175, 181, 202, 0.9) 75%);
          background-size: 12px 12px;
          background-position: 0 0, 0 6px, 6px -6px, -6px 0px;
          box-shadow: inset 0 0 0 1px rgba(255,255,255,0.35);
        }

        .maskedFilmLayer {
          z-index: 3;
          background-position: center;
          background-repeat: repeat;
        }

        .sceneBaseImage,
        .sceneOverlayImage {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          object-fit: fill;
          object-position: center;
          pointer-events: none;
          display: block;
        }

        .sceneBaseImage {
          z-index: 1;
        }

        .sceneOverlayImage {
          z-index: 10;
        }

        .sceneExpandButton {
          position: absolute;
          right: 12px;
          bottom: 12px;
          z-index: 40;
          border: 1px solid rgba(238, 224, 197, 0.55);
          border-radius: 999px;
          padding: 9px 12px;
          background: rgba(5, 2, 59, 0.82);
          color: ${COLORS.cream};
          box-shadow: 0 12px 28px rgba(0, 0, 0, 0.32);
          backdrop-filter: blur(8px);
          font-size: 13px;
          font-weight: 1000;
          line-height: 1;
          cursor: pointer;
        }

        .sceneFullscreenModal {
          position: fixed;
          inset: 0;
          z-index: 30000;
          display: flex;
          flex-direction: column;
          gap: 12px;
          padding: calc(env(safe-area-inset-top, 0px) + 14px) 14px calc(env(safe-area-inset-bottom, 0px) + 14px);
          background:
            radial-gradient(circle at 50% 0%, rgba(49, 41, 130, 0.38), transparent 42%),
            rgba(5, 2, 35, 0.96);
          backdrop-filter: blur(10px);
        }

        .sceneFullscreenTop {
          flex: 0 0 auto;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          color: ${COLORS.white};
        }

        .sceneFullscreenTop strong {
          display: block;
          color: ${COLORS.cream};
          font-size: 17px;
          font-weight: 1000;
          line-height: 1.25;
        }

        .sceneFullscreenTop span {
          display: block;
          margin-top: 4px;
          color: ${COLORS.soft};
          font-size: 12px;
          font-weight: 800;
          line-height: 1.35;
          word-break: keep-all;
        }

        .sceneFullscreenCloseButton {
          flex: 0 0 auto;
          border: 1px solid rgba(238, 224, 197, 0.5);
          border-radius: 999px;
          padding: 10px 14px;
          background: rgba(238, 224, 197, 0.14);
          color: ${COLORS.cream};
          font-size: 13px;
          font-weight: 1000;
          cursor: pointer;
        }

        .sceneFullscreenCanvas {
          position: relative;
          flex: 1 1 auto;
          min-height: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 0 0 58px;
          overflow: hidden;
        }

        .sceneFullscreenViewportFrame {
          width: 100%;
          height: 100%;
          min-width: 0;
          min-height: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          transform-origin: center center;
          transition: transform 180ms ease, width 180ms ease, height 180ms ease;
        }

        .sceneFullscreenSwitchButton {
          position: absolute;
          right: max(4px, env(safe-area-inset-right, 0px));
          bottom: max(0px, env(safe-area-inset-bottom, 0px));
          z-index: 50;
          border: 1px solid rgba(238, 224, 197, 0.55);
          border-radius: 999px;
          padding: 11px 14px;
          background: rgba(5, 2, 59, 0.9);
          color: ${COLORS.cream};
          box-shadow: 0 14px 30px rgba(0, 0, 0, 0.34);
          backdrop-filter: blur(8px);
          font-size: 13px;
          font-weight: 1000;
          line-height: 1;
          cursor: pointer;
          white-space: nowrap;
        }

        .sceneFullscreenViewport {
          width: min(
            calc(var(--scene-fullscreen-vw, 100vw) - 28px),
            calc((var(--scene-fullscreen-vh, 100vh) - 116px) * var(--scene-aspect-value, 1.333))
          );
          max-width: calc(var(--scene-fullscreen-vw, 100vw) - 28px);
          max-height: calc(var(--scene-fullscreen-vh, 100vh) - 116px);
          min-height: 0;
          border-radius: 24px;
          border-color: rgba(238, 224, 197, 0.42);
          background: rgba(0, 0, 0, 0.28);
          box-shadow: 0 26px 70px rgba(0, 0, 0, 0.54);
        }

        .sceneFullscreenViewport .sceneStage {
          border-radius: 24px;
        }

        .sceneFullscreenModalPortrait .sceneFullscreenViewportFrame {
          transform: none !important;
        }

        .sceneFullscreenModalLandscape {
          padding: 0;
          gap: 0;
        }

        .sceneFullscreenModalLandscape .sceneFullscreenTop {
          position: absolute;
          top: calc(env(safe-area-inset-top, 0px) + 10px);
          left: 14px;
          right: 14px;
          z-index: 70;
          pointer-events: none;
        }

        .sceneFullscreenModalLandscape .sceneFullscreenTop > div {
          min-width: 0;
        }

        .sceneFullscreenModalLandscape .sceneFullscreenTop strong {
          max-width: calc(100vw - 112px);
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          font-size: 15px;
        }

        .sceneFullscreenModalLandscape .sceneFullscreenTop span {
          display: none;
        }

        .sceneFullscreenModalLandscape .sceneFullscreenCloseButton {
          pointer-events: auto;
          padding: 8px 12px;
          font-size: 12px;
        }

        .sceneFullscreenModalLandscape .sceneFullscreenCanvas {
          position: fixed;
          inset: 0;
          z-index: 20;
          padding: 0;
        }

        .sceneFullscreenModalLandscape .sceneFullscreenViewportFrame {
          width: calc(var(--scene-fullscreen-vh, 100vh) - 4px);
          height: calc(var(--scene-fullscreen-vw, 100vw) - 4px);
          max-width: calc(var(--scene-fullscreen-vh, 100vh) - 4px);
          max-height: calc(var(--scene-fullscreen-vw, 100vw) - 4px);
          transform: rotate(90deg) !important;
        }

        .sceneFullscreenModalLandscape .sceneFullscreenViewport {
          width: min(
            100%,
            calc((var(--scene-fullscreen-vw, 100vw) - 4px) * var(--scene-aspect-value, 1.333))
          );
          max-width: 100%;
          max-height: calc(var(--scene-fullscreen-vw, 100vw) - 4px);
          border-radius: 18px;
        }

        .sceneFullscreenModalLandscape .sceneFullscreenViewport .sceneStage {
          border-radius: 18px;
        }

        .sceneFullscreenModalLandscape .sceneFullscreenSwitchButton {
          right: max(12px, env(safe-area-inset-right, 0px));
          bottom: max(12px, env(safe-area-inset-bottom, 0px));
          z-index: 80;
        }

        .emptyPreviewWrap {
          position: absolute;
          inset: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 22px;
        }

        .emptyPreviewBox {
          width: min(440px, 100%);
          border-radius: 24px;
          padding: 18px;
          background: rgba(238, 224, 197, 0.1);
          border: 1px solid ${COLORS.line};
          box-shadow: 0 18px 42px rgba(0, 0, 0, 0.24);
          min-height: 220px;
          display: flex;
          align-items: flex-end;
        }

        .emptyPreviewInner {
          border-radius: 18px;
          padding: 14px 16px;
          background: rgba(5, 2, 59, 0.82);
          color: ${COLORS.white};
          backdrop-filter: blur(8px);
        }

        .zoneApplyGrid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 10px;
          margin-top: 14px;
        }

        .zoneApplyButton {
          border: 1px solid ${COLORS.line};
          border-radius: 20px;
          padding: 13px 12px;
          background: rgba(255, 255, 255, 0.05);
          color: ${COLORS.white};
          cursor: pointer;
          display: grid;
          gap: 6px;
          text-align: left;
          min-height: 76px;
        }

        .zoneApplyButtonActive {
          border-color: rgba(238, 224, 197, 0.62);
          background: rgba(238, 224, 197, 0.14);
        }

        .zoneApplyButton span {
          color: ${COLORS.cream};
          font-size: 14px;
          font-weight: 900;
        }

        .zoneApplyButton strong {
          color: ${COLORS.soft};
          font-size: 12px;
          line-height: 1.35;
          font-weight: 800;
          overflow: hidden;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
        }

        .zoneApplyButton strong.zoneFilmPrompt {
          color: #ff4d4d;
          font-weight: 1000;
        }

        .applyActionRow {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
          margin-top: 12px;
        }

        .smallActionButton {
          border-radius: 12px;
          border: 1px solid ${COLORS.line};
          background: rgba(255, 255, 255, 0.06);
          color: ${COLORS.white};
          font-size: 13px;
          font-weight: 800;
          padding: 9px 12px;
          cursor: pointer;
        }

        .applyWarningText {
          margin: 12px 2px 8px;
          color: #ff4d4d;
          font-size: 13px;
          font-weight: 900;
          line-height: 1.45;
          word-break: keep-all;
        }

        .applyDecisionRow {
          margin-top: 8px;
        }

        .decisionNextButton {
          width: 100%;
          border: none;
          border-radius: 16px;
          padding: 15px 16px;
          background: ${COLORS.cream};
          color: ${COLORS.bg};
          font-size: 16px;
          font-weight: 1000;
          letter-spacing: -0.02em;
          cursor: pointer;
          box-shadow: 0 14px 30px rgba(0, 0, 0, 0.24);
        }

        .decisionNextButton:disabled {
          opacity: 0.45;
          cursor: not-allowed;
          box-shadow: none;
        }

        .decisionSummary {
          border-radius: 22px;
          padding: 14px;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid ${COLORS.line};
          margin-top: 12px;
        }

        .decisionSpaceName {
          color: ${COLORS.cream};
          font-size: 18px;
          font-weight: 900;
          margin-bottom: 10px;
        }

        .decisionZoneList {
          display: grid;
          gap: 8px;
        }

        .decisionZoneItem {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          border-radius: 15px;
          padding: 11px 12px;
          background: rgba(255, 255, 255, 0.045);
          border: 1px solid ${COLORS.line};
        }

        .decisionZoneItem span {
          color: ${COLORS.soft};
          font-size: 13px;
          font-weight: 900;
          white-space: nowrap;
        }

        .decisionZoneItem strong {
          color: ${COLORS.white};
          font-size: 13px;
          line-height: 1.35;
          text-align: right;
          word-break: keep-all;
        }

        .decisionActionGrid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 10px;
          margin-top: 12px;
        }

        .decisionActionCard {
          border-radius: 22px;
          padding: 14px;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid ${COLORS.line};
        }

        .decisionActionIcon {
          display: inline-grid;
          place-items: center;
          width: 30px;
          height: 30px;
          border-radius: 999px;
          background: rgba(238, 224, 197, 0.14);
          color: ${COLORS.cream};
          font-size: 13px;
          font-weight: 900;
          margin-bottom: 10px;
        }

        .decisionActionCard h3 {
          margin: 0 0 8px;
          color: ${COLORS.cream};
          font-size: 17px;
          letter-spacing: -0.03em;
        }

        .decisionActionCard p {
          margin: 0 0 12px;
          color: ${COLORS.soft};
          font-size: 13px;
          line-height: 1.65;
          word-break: keep-all;
        }

        .primaryDecisionButton {
          width: 100%;
          min-height: 44px;
          border: none;
          border-radius: 15px;
          background: ${COLORS.cream};
          color: ${COLORS.creamText};
          font-size: 14px;
          font-weight: 900;
          text-decoration: none;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          box-sizing: border-box;
        }

        .decisionMessage {
          margin-top: 9px;
          color: ${COLORS.cream};
          font-size: 12px;
          line-height: 1.45;
        }

        .decisionFabricWarning {
          margin-top: 10px;
          border-radius: 15px;
          padding: 11px 12px;
          background: rgba(255, 207, 102, 0.11);
          border: 1px solid rgba(255, 207, 102, 0.24);
          color: #ffe1a3;
          font-size: 12px;
          line-height: 1.55;
          word-break: keep-all;
        }

        .primaryDecisionButton:disabled {
          opacity: 0.6;
          cursor: wait;
        }

        .decisionExportStage {
          position: fixed;
          left: -10000px;
          top: 0;
          width: 1080px;
          pointer-events: none;
          opacity: 1;
          z-index: -1;
        }

        .decisionExportCard {
          width: 1080px;
          padding: 40px;
          border-radius: 32px;
          background:
            radial-gradient(circle at top left, rgba(255, 255, 255, 0.12), transparent 34%),
            ${COLORS.bg};
          color: ${COLORS.white};
          box-sizing: border-box;
        }

        .decisionExportHeader {
          margin-bottom: 24px;
        }

        .decisionExportBadge {
          display: inline-flex;
          align-items: center;
          min-height: 34px;
          border-radius: 999px;
          padding: 0 14px;
          background: rgba(238, 224, 197, 0.12);
          border: 1px solid rgba(238, 224, 197, 0.18);
          color: ${COLORS.cream};
          font-size: 16px;
          font-weight: 900;
          margin-bottom: 14px;
        }

        .decisionExportHeader h2 {
          margin: 0;
          color: ${COLORS.white};
          font-size: 42px;
          line-height: 1.18;
          letter-spacing: -0.04em;
        }

        .decisionExportHeader p {
          margin: 10px 0 0;
          color: ${COLORS.soft};
          font-size: 20px;
        }

        .decisionExportPreview {
          margin-bottom: 20px;
        }

        .decisionExportViewport {
          border-radius: 28px;
          overflow: hidden;
          border: 1px solid rgba(255, 255, 255, 0.12);
          background: rgba(255, 255, 255, 0.06);
        }

        .decisionExportList {
          display: grid;
          gap: 10px;
        }

        .decisionExportCardFavorites {
          padding-bottom: 46px;
        }

        .decisionExportFavoriteList {
          display: grid;
          gap: 22px;
        }

        .decisionExportFavoriteCard {
          display: grid;
          grid-template-columns: 360px minmax(0, 1fr);
          gap: 24px;
          border-radius: 28px;
          padding: 22px;
          background: rgba(255, 255, 255, 0.055);
          border: 1px solid rgba(255, 255, 255, 0.13);
        }

        .decisionExportFavoritePreview {
          min-width: 0;
        }

        .decisionExportFavoriteViewport {
          border-radius: 24px;
          overflow: hidden;
          border: 1px solid rgba(255, 255, 255, 0.12);
          background: rgba(255, 255, 255, 0.06);
        }

        .decisionExportFavoriteInfo {
          min-width: 0;
          display: grid;
          align-content: start;
          gap: 12px;
        }

        .decisionExportFavoriteNumber {
          display: inline-flex;
          width: fit-content;
          min-height: 32px;
          align-items: center;
          border-radius: 999px;
          padding: 0 13px;
          background: rgba(238, 224, 197, 0.12);
          border: 1px solid rgba(238, 224, 197, 0.18);
          color: ${COLORS.cream};
          font-size: 15px;
          font-weight: 1000;
        }

        .decisionExportFavoriteInfo h3 {
          margin: 0;
          color: ${COLORS.white};
          font-size: 32px;
          line-height: 1.2;
          letter-spacing: -0.04em;
        }

        .decisionExportFavoriteRows {
          gap: 8px;
        }

        .decisionExportRow {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          border-radius: 18px;
          padding: 14px 16px;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid ${COLORS.line};
        }

        .decisionExportRow span {
          color: ${COLORS.soft};
          font-size: 18px;
          font-weight: 900;
          white-space: nowrap;
        }

        .decisionExportRow strong {
          color: ${COLORS.white};
          font-size: 20px;
          line-height: 1.4;
          text-align: right;
          word-break: keep-all;
        }

        .decisionExportWarning {
          margin-top: 18px;
          border-radius: 20px;
          padding: 16px 18px;
          background: rgba(255, 207, 102, 0.12);
          border: 1px solid rgba(255, 207, 102, 0.24);
          color: #ffe1a3;
          font-size: 18px;
          font-weight: 700;
          line-height: 1.6;
          word-break: keep-all;
        }

        .storeInfoBox {
          display: grid;
          gap: 4px;
          border-radius: 15px;
          padding: 11px;
          background: rgba(238, 224, 197, 0.09);
          border: 1px solid rgba(238, 224, 197, 0.18);
        }

        .storeInfoBox strong {
          color: ${COLORS.cream};
          font-size: 13px;
        }

        .storeInfoBox span {
          color: ${COLORS.white};
          font-size: 12px;
          line-height: 1.45;
        }

        .bottomStepNav {
          position: fixed;
          left: 50%;
          bottom: 16px;
          transform: translateX(-50%);
          z-index: 60;
          width: min(420px, calc(100% - 28px));
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 7px;
          padding: 8px;
          border-radius: 22px;
          background: rgba(7, 5, 58, 0.88);
          border: 1px solid ${COLORS.line};
          box-shadow: 0 20px 48px rgba(0, 0, 0, 0.36);
          backdrop-filter: blur(14px);
        }

        .bottomStepNavFour {
          grid-template-columns: repeat(4, minmax(0, 1fr));
          width: min(500px, calc(100% - 28px));
        }

        .bottomStepNav button {
          border: 1px solid transparent;
          border-radius: 16px;
          background: rgba(255, 255, 255, 0.05);
          color: ${COLORS.soft};
          padding: 12px 8px;
          font-size: 13px;
          font-weight: 900;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 5px;
          min-width: 0;
          white-space: nowrap;
          word-break: keep-all;
          line-height: 1;
        }

        .bottomStepNav button span {
          display: inline-grid;
          place-items: center;
          width: 18px;
          height: 18px;
          flex: 0 0 18px;
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.08);
          font-size: 11px;
        }

        .bottomStepNav .bottomStepButtonActive {
          border-color: rgba(238, 224, 197, 0.58);
          background: rgba(238, 224, 197, 0.16);
          color: ${COLORS.cream};
        }

        .customerGuideOverlay {
          position: fixed;
          inset: 0;
          z-index: 10010;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 18px;
          background: rgba(2, 1, 25, 0.64);
          backdrop-filter: blur(6px);
        }

        .customerGuideModal {
          width: min(430px, 100%);
          border-radius: 28px;
          padding: 20px;
          background: linear-gradient(180deg, rgba(14, 12, 82, 0.98) 0%, rgba(6, 4, 55, 0.99) 100%);
          border: 1px solid rgba(238, 224, 197, 0.22);
          box-shadow: 0 24px 70px rgba(0, 0, 0, 0.46);
          color: #fff;
          box-sizing: border-box;
        }

        .customerGuideTopRow {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          margin-bottom: 14px;
        }

        .customerGuideBadge {
          display: inline-flex;
          align-items: center;
          min-height: 32px;
          padding: 0 12px;
          border-radius: 999px;
          background: rgba(238, 224, 197, 0.12);
          color: ${COLORS.cream};
          font-size: 12px;
          font-weight: 900;
          letter-spacing: -0.02em;
          word-break: keep-all;
        }

        .customerGuideClose {
          width: 36px;
          height: 36px;
          flex: 0 0 36px;
          border-radius: 999px;
          border: 1px solid rgba(238, 224, 197, 0.18);
          background: rgba(255, 255, 255, 0.06);
          color: #fff;
          font-size: 22px;
          line-height: 1;
          cursor: pointer;
        }

        .customerGuideTitle {
          margin: 0 0 12px;
          color: #fff;
          font-size: 23px;
          line-height: 1.28;
          letter-spacing: -0.05em;
          font-weight: 950;
          word-break: keep-all;
        }

        .customerGuideBody {
          display: grid;
          gap: 14px;
          margin-bottom: 18px;
          color: rgba(255, 255, 255, 0.78);
          font-size: 15px;
          line-height: 1.68;
          letter-spacing: -0.03em;
          word-break: keep-all;
        }

        .customerGuideSection {
          display: grid;
          gap: 6px;
        }

        .customerGuideSectionTitle {
          color: ${COLORS.cream};
          font-size: 15px;
          font-weight: 900;
          letter-spacing: -0.03em;
        }

        .customerGuideSectionLines {
          display: grid;
          gap: 4px;
        }

        .customerGuideBody p {
          margin: 0;
        }
        .customerGuideActions {
          display: grid;
          grid-template-columns: minmax(0, 1fr) auto;
          gap: 10px;
          align-items: stretch;
        }

        .customerGuideActionsSingle {
          grid-template-columns: 1fr;
        }

        .customerGuidePromptModal {
          text-align: center;
        }

        .customerGuidePromptImageWrap {
          display: flex;
          justify-content: center;
          align-items: center;
          margin: -8px 0 2px;
        }

        .customerGuidePromptImage {
          width: 116px;
          height: auto;
          display: block;
        }

        .customerGuidePromptBadge {
          margin: 0 auto 12px;
        }

        .customerGuidePromptTitle {
          margin-bottom: 10px;
        }

        .customerGuidePromptText {
          margin: 0 auto;
          color: rgba(255, 255, 255, 0.78);
          font-size: 14px;
          line-height: 1.62;
          letter-spacing: -0.03em;
          word-break: keep-all;
        }

        .customerGuidePromptActions {
          display: grid;
          grid-template-columns: 0.92fr 1.08fr;
          gap: 9px;
          margin-top: 20px;
        }

        .customerGuidePromptGhostButton {
          width: 100%;
          min-height: 52px;
          border-radius: 18px;
          border: 1px solid rgba(238, 224, 197, 0.24);
          background: rgba(255, 255, 255, 0.06);
          color: rgba(255, 255, 255, 0.9);
          font-size: 15px;
          font-weight: 900;
          letter-spacing: -0.03em;
          cursor: pointer;
        }


        .customerGuideCheckerInline {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          vertical-align: middle;
          color: ${COLORS.cream};
          font-weight: 800;
        }

        .customerGuideInlineAction {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-height: 38px;
          margin: 0 4px;
          padding: 0 16px;
          border-radius: 999px;
          vertical-align: middle;
          white-space: nowrap;
          font-size: 14px;
          font-weight: 950;
          letter-spacing: -0.03em;
          line-height: 1;
          box-sizing: border-box;
        }

        .customerGuideInlineActionStart {
          background: ${COLORS.cream};
          color: ${COLORS.creamText};
          box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.55),
            0 8px 20px rgba(0, 0, 0, 0.18);
        }

        .customerGuideInlineActionDecision {
          min-height: 42px;
          padding: 0 18px;
          background: ${COLORS.cream};
          color: ${COLORS.bg};
          border-radius: 16px;
          box-shadow: 0 10px 24px rgba(0, 0, 0, 0.2);
        }

        .customerGuideCheckerDot {
          width: 22px;
          height: 22px;
          display: inline-block;
          flex: 0 0 auto;
          border-radius: 6px;
          border: 1px solid rgba(238, 224, 197, 0.82);
          background-color: rgba(255, 255, 255, 0.94);
          background-image:
            linear-gradient(45deg, rgba(175, 181, 202, 0.92) 25%, transparent 25%),
            linear-gradient(-45deg, rgba(175, 181, 202, 0.92) 25%, transparent 25%),
            linear-gradient(45deg, transparent 75%, rgba(175, 181, 202, 0.92) 75%),
            linear-gradient(-45deg, transparent 75%, rgba(175, 181, 202, 0.92) 75%);
          background-size: 12px 12px;
          background-position: 0 0, 0 6px, 6px -6px, -6px 0px;
          box-shadow:
            inset 0 0 0 1px rgba(255, 255, 255, 0.34),
            0 4px 10px rgba(0, 0, 0, 0.18);
        }

        .customerGuidePrimaryButton {
          width: 100%;
          min-height: 52px;
          border: 0;
          border-radius: 18px;
          background: ${COLORS.cream};
          color: ${COLORS.creamText};
          font-size: 16px;
          font-weight: 950;
          letter-spacing: -0.03em;
          cursor: pointer;
          box-shadow: 0 14px 30px rgba(0, 0, 0, 0.22);
        }

        .customerGuideSecondaryButton {
          width: auto;
          min-width: 74px;
          height: 52px;
          min-height: 52px;
          padding: 0 10px;
          border-radius: 999px;
          border: 1px solid rgba(238, 224, 197, 0.24);
          background: rgba(255, 255, 255, 0.06);
          color: rgba(255, 255, 255, 0.88);
          font-size: 12px;
          font-weight: 850;
          letter-spacing: -0.03em;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          text-align: center;
          box-sizing: border-box;
        }

        .customerGuideSecondaryButtonLabel {
          display: inline-flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          line-height: 1.02;
          gap: 2px;
          white-space: nowrap;
        }

        .customerGuideNoticeModal {
          width: min(420px, 100%);
        }

        .customerGuideNoticeBody {
          gap: 12px;
        }

        .customerGuideNoticeImageWrap {
          display: flex;
          justify-content: center;
          align-items: center;
          margin: 2px 0 4px;
        }

        .customerGuideNoticeImage {
          width: 112px;
          height: auto;
        }

        .customerGuideNoticeText {
          text-align: center;
        }

        @media (orientation: landscape) and (max-height: 520px) {
          .sceneFullscreenModal {
            gap: 8px;
            padding: calc(env(safe-area-inset-top, 0px) + 8px) 10px calc(env(safe-area-inset-bottom, 0px) + 8px);
          }

          .sceneFullscreenTop strong {
            font-size: 15px;
          }

          .sceneFullscreenTop span {
            display: none;
          }

          .sceneFullscreenCloseButton {
            padding: 8px 12px;
            font-size: 12px;
          }

          .sceneFullscreenCanvas {
            padding-bottom: 48px;
          }

          .sceneFullscreenSwitchButton {
            padding: 9px 12px;
            font-size: 12px;
          }

          .sceneFullscreenModalLandscape .sceneFullscreenViewportFrame {
            width: calc(var(--scene-fullscreen-vw, 100vw) - 8px);
            height: calc(var(--scene-fullscreen-vh, 100vh) - 8px);
            max-width: calc(var(--scene-fullscreen-vw, 100vw) - 8px);
            max-height: calc(var(--scene-fullscreen-vh, 100vh) - 8px);
            transform: none !important;
          }

          .sceneFullscreenModalLandscape .sceneFullscreenViewport {
            width: min(
              100%,
              calc((var(--scene-fullscreen-vh, 100vh) - 8px) * var(--scene-aspect-value, 1.333))
            );
            max-width: 100%;
            max-height: calc(var(--scene-fullscreen-vh, 100vh) - 8px);
          }

          .sceneFullscreenViewport {
            width: min(
              calc(var(--scene-fullscreen-vw, 100vw) - 20px),
              calc((var(--scene-fullscreen-vh, 100vh) - 64px) * var(--scene-aspect-value, 1.333))
            );
            max-width: calc(var(--scene-fullscreen-vw, 100vw) - 20px);
            max-height: calc(var(--scene-fullscreen-vh, 100vh) - 64px);
            border-radius: 18px;
          }

          .sceneFullscreenViewport .sceneStage {
            border-radius: 18px;
          }
        }

        @media (max-width: 520px) {
          .customerGuideInlineAction {
            min-height: 34px;
            padding: 0 14px;
            font-size: 13px;
          }

          .customerGuideInlineActionDecision {
            min-height: 38px;
            padding: 0 14px;
            border-radius: 14px;
          }

          .customerGuideActions {
            gap: 8px;
          }

          .customerGuideActionsSingle {
            grid-template-columns: 1fr;
          }

          .customerGuidePromptActions {
            grid-template-columns: 1fr;
          }

          .customerGuidePromptImage {
            width: 104px;
          }

          .customerGuideSecondaryButton {
            min-width: 68px;
            height: 52px;
            min-height: 52px;
            padding: 0 8px;
            font-size: 11px;
          }

          .customerGuideSecondaryButtonLabel {
            gap: 1px;
          }

          .customerGuideNoticeImage {
            width: 96px;
          }
        }

        .sheetOverlay {
          position: fixed;
          inset: 0;
          z-index: 80;
          background: rgba(0, 0, 0, 0.46);
          display: flex;
          align-items: flex-end;
          justify-content: center;
          padding: 6px 10px 10px;
        }

        .filmSheet {
          width: min(760px, 100%);
          height: min(92vh, 880px);
          max-height: min(92vh, 880px);
          overflow: hidden;
          border-radius: 28px;
          background: rgba(8, 5, 62, 0.98);
          border: 1px solid rgba(238, 224, 197, 0.22);
          box-shadow: 0 -20px 70px rgba(0, 0, 0, 0.45);
          padding: 12px;
          display: flex;
          flex-direction: column;
        }

        .sheetHandle {
          width: 44px;
          height: 5px;
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.28);
          margin: 0 auto 8px;
        }

        .sheetHeader {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 12px;
          margin-bottom: 12px;
        }

        .sheetHeader h3 {
          margin: 0;
          font-size: 20px;
          letter-spacing: -0.03em;
        }

        .sheetHeader p {
          margin: 4px 0 0;
          color: ${COLORS.soft};
          font-size: 12px;
          line-height: 1.35;
        }

        .sheetCloseButton {
          flex-shrink: 0;
          border: 1px solid ${COLORS.line};
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.06);
          color: ${COLORS.white};
          padding: 9px 12px;
          font-size: 13px;
          font-weight: 900;
          cursor: pointer;
        }

        .palettePanel {
          border-radius: 18px;
          padding: 9px;
          background: rgba(255, 255, 255, 0.045);
          border: 1px solid ${COLORS.line};
          margin-bottom: 9px;
          display: grid;
          gap: 8px;
        }

        .paletteGroup {
          display: grid;
          gap: 6px;
        }

        .paletteHeaderRow {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
        }

        .paletteHeaderRow span {
          color: ${COLORS.cream};
          font-size: 12px;
          font-weight: 900;
        }

        .paletteHeaderRow em {
          color: ${COLORS.soft};
          font-size: 11px;
          font-style: normal;
          font-weight: 800;
        }

        .paletteChipRow,
        .paletteColorRow {
          display: flex;
          gap: 6px;
          overflow-x: auto;
          padding-bottom: 1px;
          -webkit-overflow-scrolling: touch;
        }

        .paletteChip,
        .paletteColorChip,
        .paletteResetButton {
          flex: 0 0 auto;
          border: 1px solid ${COLORS.line};
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.06);
          color: ${COLORS.white};
          font-size: 12px;
          font-weight: 900;
          cursor: pointer;
          white-space: nowrap;
        }

        .paletteChip {
          padding: 7px 10px;
        }

        .paletteChipActive,
        .paletteColorChipActive {
          border-color: rgba(238, 224, 197, 0.92);
          background: ${COLORS.cream};
          color: ${COLORS.bg};
          box-shadow: 0 0 0 2px rgba(238, 224, 197, 0.22), 0 8px 16px rgba(0, 0, 0, 0.22);
        }

        .paletteResetButton {
          padding: 6px 9px;
          color: ${COLORS.cream};
        }

        .paletteColorChip {
          position: relative;
          min-height: 32px;
          padding: 5px 8px 5px 6px;
          display: inline-flex;
          align-items: center;
          gap: 6px;
          transition: transform 0.14s ease, box-shadow 0.14s ease, background 0.14s ease, border-color 0.14s ease;
        }

        .paletteColorChip i {
          width: 16px;
          height: 16px;
          border-radius: 999px;
          border: 1px solid rgba(255, 255, 255, 0.35);
          box-shadow: inset 0 0 0 1px rgba(0, 0, 0, 0.08);
        }

        .paletteColorChipActive {
          transform: translateY(-1px);
        }

        .paletteColorChipActive i {
          border: 2px solid ${COLORS.bg};
          box-shadow: 0 0 0 2px rgba(255, 255, 255, 0.92), inset 0 0 0 1px rgba(0, 0, 0, 0.10);
        }

        .paletteColorCheck {
          position: absolute;
          right: -4px;
          top: -5px;
          width: 18px;
          height: 18px;
          border-radius: 999px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          background: ${COLORS.bg};
          border: 1px solid rgba(238, 224, 197, 0.95);
          color: ${COLORS.cream};
          font-size: 12px;
          font-weight: 1000;
          line-height: 1;
        }

        .paletteColorChipIconOnly {
          width: 34px;
          padding: 5px;
          justify-content: center;
        }

        .paletteColorChipIconOnly i {
          width: 20px;
          height: 20px;
        }

        .sheetSearchForm {
          display: flex;
          gap: 7px;
          margin-bottom: 9px;
        }

        .searchInput {
          min-width: 0;
          flex: 1;
          border-radius: 13px;
          border: 1px solid ${COLORS.line};
          background: rgba(255, 255, 255, 0.06);
          color: ${COLORS.white};
          padding: 8px 10px;
          font-size: 14px;
          outline: none;
        }

        .searchInput::placeholder {
          color: rgba(255, 255, 255, 0.42);
        }

        .searchButton {
          border: none;
          border-radius: 13px;
          padding: 0 13px;
          background: ${COLORS.cream};
          color: ${COLORS.creamText};
          font-size: 13px;
          font-weight: 900;
          cursor: pointer;
          white-space: nowrap;
          min-height: 36px;
        }

        .sheetLoadingText {
          color: ${COLORS.cream};
          font-size: 13px;
          font-weight: 900;
          margin: 0 0 10px;
        }

        .sheetFilmSkeletonItem,
        .sheetFilmSkeletonThumb,
        .sheetFilmSkeletonLine {
          position: relative;
          overflow: hidden;
        }

        .sheetFilmSkeletonItem::after,
        .sheetFilmSkeletonThumb::after,
        .sheetFilmSkeletonLine::after {
          content: "";
          position: absolute;
          inset: 0;
          transform: translateX(-100%);
          background: linear-gradient(
            90deg,
            transparent 0%,
            rgba(255, 255, 255, 0.08) 35%,
            rgba(255, 255, 255, 0.16) 50%,
            transparent 100%
          );
          animation: sheetShimmer 1.25s infinite;
        }

        .sheetFilmSkeletonItem {
          border: 1px solid ${COLORS.line};
          border-radius: 18px;
          background: rgba(255, 255, 255, 0.045);
          padding: 8px;
        }

        .sheetFilmSkeletonThumb {
          width: 100%;
          aspect-ratio: 1 / 1;
          border-radius: 14px;
          background: rgba(255, 255, 255, 0.09);
        }

        .sheetFilmSkeletonLine {
          height: 12px;
          margin-top: 8px;
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.09);
        }

        .sheetFilmSkeletonLine.short {
          width: 62%;
          height: 10px;
        }

        @keyframes sheetShimmer {
          100% {
            transform: translateX(100%);
          }
        }

        .sheetFilmGrid {
          flex: 1;
          min-height: 0;
          overflow-y: auto;
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          align-content: start;
          align-items: start;
          grid-auto-rows: max-content;
          gap: 10px;
          padding: 2px 2px 8px;
        }

        .sheetRecommendedTitle {
          grid-column: 1 / -1;
          width: fit-content;
          max-width: 100%;
          border-radius: 999px;
          border: 1px solid rgba(238, 224, 197, 0.38);
          background: rgba(238, 224, 197, 0.13);
          color: #eee0c5;
          padding: 8px 13px;
          font-size: 14px;
          font-weight: 1000;
          letter-spacing: -0.01em;
          box-shadow: 0 10px 22px rgba(0, 0, 0, 0.16);
        }

        .sheetFilmItem {
          position: relative;
          display: flex;
          flex-direction: column;
          gap: 8px;
          border: 1px solid ${COLORS.line};
          border-radius: 18px;
          background: rgba(255, 255, 255, 0.045);
          color: ${COLORS.white};
          padding: 8px;
          text-align: left;
          align-self: start;
          height: auto;
        }

        .sheetFilmItemActive {
          border-color: rgba(238, 224, 197, 0.6);
          background: rgba(238, 224, 197, 0.14);
        }

        .sheetFilmSelectButton {
          appearance: none;
          width: 100%;
          border: 0;
          background: transparent;
          padding: 0;
          text-align: left;
          color: inherit;
          cursor: pointer;
        }

        .sheetFilmSelectButton:disabled {
          opacity: 0.72;
          cursor: wait;
        }

        .sheetFilmThumb {
          width: 100%;
          aspect-ratio: 1 / 1;
          border-radius: 13px;
          overflow: hidden;
          border: 1px solid ${COLORS.line};
          background: rgba(255, 255, 255, 0.06);
          margin-bottom: 8px;
        }

        .sheetFilmThumb img {
          width: 100%;
          height: 100%;
          display: block;
          object-fit: cover;
        }

        .sheetFilmName {
          color: ${COLORS.cream};
          font-size: 12px;
          line-height: 1.28;
          font-weight: 900;
          min-height: 31px;
          overflow: hidden;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          word-break: keep-all;
        }

        .sheetFilmActionRow {
          margin-top: auto;
        }

        .sheetFilmSampleButton {
          width: 100%;
          min-height: 32px;
          border-radius: 11px;
          border: 1px solid rgba(238, 224, 197, 0.24);
          background: rgba(238, 224, 197, 0.10);
          color: ${COLORS.cream};
          font-size: 11px;
          font-weight: 900;
          letter-spacing: -0.02em;
          cursor: pointer;
        }

        .sheetFilmSampleButtonActive {
          background: rgba(238, 224, 197, 0.18);
          border-color: rgba(238, 224, 197, 0.42);
        }

        .sheetFilmSampleButton:disabled {
          color: rgba(255, 255, 255, 0.42);
          background: rgba(255, 255, 255, 0.05);
          border-color: rgba(255, 255, 255, 0.08);
          cursor: default;
        }

        .sheetSampleBubbleBackdrop {
          position: fixed;
          inset: 0;
          z-index: 10020;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
          background: rgba(5, 2, 35, 0.34);
          backdrop-filter: blur(3px);
        }

        .sheetSampleBubble {
          width: min(320px, calc(100vw - 40px));
          max-height: calc(100dvh - 36px);
          overflow-y: auto;
          overscroll-behavior: contain;
          border-radius: 24px;
          border: 1px solid rgba(238, 224, 197, 0.18);
          background: linear-gradient(180deg, rgba(14, 12, 82, 0.98) 0%, rgba(8, 6, 64, 0.98) 100%);
          box-shadow: 0 18px 48px rgba(0, 0, 0, 0.34);
          padding: 18px;
          position: relative;
        }

        .sheetSampleBubbleClose {
          position: absolute;
          top: 14px;
          right: 14px;
          border: 0;
          background: rgba(255, 255, 255, 0.08);
          color: ${COLORS.white};
          border-radius: 999px;
          min-width: 54px;
          min-height: 32px;
          font-size: 12px;
          font-weight: 800;
          cursor: pointer;
        }

        .sheetSampleBubbleLabel {
          color: rgba(238, 224, 197, 0.82);
          font-size: 11px;
          font-weight: 800;
          margin-bottom: 6px;
        }

        .sheetSampleBubbleTitle {
          color: ${COLORS.cream};
          font-size: 16px;
          line-height: 1.35;
          font-weight: 900;
          padding-right: 60px;
        }

        .sheetSampleBubbleCode {
          color: ${COLORS.soft};
          font-size: 12px;
          line-height: 1.35;
          margin-top: 4px;
          margin-bottom: 12px;
        }

        .sheetSampleBubbleImageWrap {
          width: 100%;
          height: min(58dvh, 520px);
          border-radius: 18px;
          overflow: hidden;
          border: 1px solid rgba(238, 224, 197, 0.18);
          background: rgba(255, 255, 255, 0.04);
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .sheetSampleBubbleImageWrap img {
          width: 100%;
          height: 100%;
          display: block;
          object-fit: contain;
        }

        .sheetSampleBubbleText {
          margin: 10px 2px 0;
          color: ${COLORS.soft};
          font-size: 12px;
          line-height: 1.5;
        }

        .emptyFilmBox {
          border-radius: 18px;
          padding: 18px;
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid ${COLORS.line};
          color: ${COLORS.soft};
          font-size: 14px;
          line-height: 1.7;
        }


        .simulatorExitConfirmOverlay {
          position: fixed;
          inset: 0;
          z-index: 1300;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 24px;
          background: rgba(3, 2, 24, 0.62);
          backdrop-filter: blur(10px);
        }

        .simulatorExitConfirmModal {
          width: min(360px, calc(100vw - 40px));
          border-radius: 26px;
          padding: 24px 20px 18px;
          border: 1px solid rgba(238, 224, 197, 0.34);
          background:
            radial-gradient(circle at top, rgba(238, 224, 197, 0.22), transparent 44%),
            rgba(12, 8, 54, 0.96);
          color: ${COLORS.white};
          text-align: center;
          box-shadow: 0 24px 80px rgba(0, 0, 0, 0.42);
        }

        .simulatorExitConfirmEmoji {
          width: 54px;
          height: 54px;
          margin: 0 auto 12px;
          display: grid;
          place-items: center;
          border-radius: 999px;
          background: rgba(238, 224, 197, 0.14);
          font-size: 30px;
        }

        .simulatorExitConfirmTitle {
          margin: 0;
          font-size: 19px;
          line-height: 1.25;
          letter-spacing: -0.055em;
          color: ${COLORS.cream};
          font-weight: 1000;
          white-space: nowrap;
          word-break: keep-all;
        }

        .simulatorExitConfirmTypewriter {
          min-height: 22px;
          margin: 10px 0 18px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 2px;
          color: rgba(255, 255, 255, 0.78);
          font-size: 14px;
          line-height: 1.45;
          font-weight: 800;
          letter-spacing: -0.03em;
          white-space: nowrap;
          word-break: keep-all;
          font-variant-numeric: tabular-nums;
        }

        .simulatorExitConfirmCursor {
          width: 2px;
          height: 16px;
          border-radius: 999px;
          background: rgba(238, 224, 197, 0.9);
          display: inline-block;
          animation: simulatorExitConfirmCursorBlink 0.72s steps(2, start) infinite;
        }

        @keyframes simulatorExitConfirmCursorBlink {
          0%, 45% {
            opacity: 1;
          }
          46%, 100% {
            opacity: 0;
          }
        }

        .simulatorExitConfirmActions {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px;
        }

        .simulatorExitConfirmCancel,
        .simulatorExitConfirmLeave {
          min-height: 46px;
          border: 0;
          border-radius: 16px;
          font-weight: 900;
          font-size: 14px;
          cursor: pointer;
          -webkit-tap-highlight-color: transparent;
        }

        .simulatorExitConfirmCancel {
          background: ${COLORS.cream};
          color: ${COLORS.creamText};
          box-shadow: 0 10px 26px rgba(238, 224, 197, 0.18);
        }

        .simulatorExitConfirmLeave {
          background: rgba(255, 255, 255, 0.10);
          color: rgba(255, 255, 255, 0.82);
          border: 1px solid rgba(255, 255, 255, 0.14);
        }

        @media (max-width: 390px) {
          .simulatorExitConfirmTitle {
            font-size: 17px;
            letter-spacing: -0.065em;
          }

          .simulatorExitConfirmTypewriter {
            font-size: 13px;
          }
        }

        @media (max-width: 640px) {
          .contractorIntroTop {
            gap: 14px;
          }

          .contractorLogoBox {
            width: min(320px, 100%);
            min-height: 0;
            border-radius: 0;
            overflow: hidden;
          }

          .contractorLogoBox img {
            max-width: 320px;
            max-height: 128px;
            transform: none;
          }

          .contractorContactRow {
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 8px;
          }

          .contractorContactButton {
            min-height: 44px;
            padding: 0 10px;
            font-size: 13px;
            gap: 6px;
          }

          .contractorContactIcon {
            width: 20px;
            height: 20px;
          }

          .portfolioPhotoGrid {
            grid-template-columns: 1fr;
          }

          .portfolioPhotoCard,
          .portfolioPhotoCard:first-child {
            min-height: 210px;
          }

          .bottomStepNavFour {
            width: min(500px, calc(100% - 10px));
            gap: 4px;
            padding: 6px;
          }

          .customerIntroSkeleton {
            gap: 10px;
            padding: 0 0 18px;
          }

          .introSkeletonHero,
          .introSkeletonProfile,
          .introSkeletonPortfolio {
            border-radius: 22px;
            padding: 16px;
          }

          .introSkeletonProfile {
            grid-template-columns: 72px minmax(0, 1fr);
            gap: 12px;
          }

          .introSkeletonLogo {
            width: 72px;
            height: 72px;
            border-radius: 20px;
          }

          .introSkeletonTitle {
            height: 30px;
          }

          .introSkeletonText {
            height: 14px;
            margin-top: 11px;
          }

          .introSkeletonButtons {
            grid-template-columns: 1fr;
            gap: 8px;
            margin-top: 14px;
          }

          .introSkeletonButton {
            height: 42px;
          }

          .introSkeletonPhotoGrid {
            grid-template-columns: 1fr;
          }

          .introSkeletonPhotoLarge,
          .introSkeletonPhoto {
            min-height: 178px;
            grid-row: auto;
          }

          .spaceLoadingSkeleton {
            border-radius: 22px;
            padding: 14px;
          }

          .spaceSkeletonHeader {
            gap: 10px;
            margin-bottom: 14px;
          }

          .spaceSkeletonPill {
            width: 112px;
            height: 30px;
          }

          .spaceSkeletonTitle {
            width: 180px;
            height: 30px;
            margin-top: 12px;
          }

          .spaceSkeletonText {
            width: 240px;
            height: 14px;
            margin-top: 10px;
          }

          .spaceSkeletonCount {
            display: none;
          }

          .spaceSkeletonGrid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 9px;
          }

          .spaceSkeletonCard {
            border-radius: 20px;
            padding: 10px;
          }

          .spaceSkeletonThumb {
            border-radius: 14px;
            aspect-ratio: 3 / 2;
          }

          .pageWrap {
            padding-bottom: 86px;
          }

          .pageInner {
            padding: 8px 10px 24px;
          }

          .pageInner.pageInnerCustomerIntroWithGuide {
            padding-top: calc(env(safe-area-inset-top, 0px) + 94px);
          }

          .backButton {
            margin: 8px 0 8px 10px;
            padding: 9px 13px;
            font-size: 13px;
            top: 8px;
          }

          .heroCard {
            border-radius: 22px;
            padding: 12px;
            margin-bottom: 10px;
          }

          .stepBadge {
            font-size: 12px;
            padding: 6px 10px;
            margin-bottom: 8px;
          }

          .pageTitle {
            font-size: 25px;
          }

          .heroText {
            font-size: 13px;
            line-height: 1.55;
            margin-top: 8px;
          }

          .linkCard {
           width: auto;
            min-width: 0;
            max-width: 100%;
            padding: 10px 14px;
            border-radius: 18px;
          }

           .linkCardText {
            font-size: 13px;
            line-height: 1.4;
          }

          .spaceSelectCard,
          .applyCard,
          .decisionCard {
            border-radius: 22px;
            padding: 12px;
          }

          .sectionHeader,
          .applyTopRow {
            margin-bottom: 10px;
          }

          .sectionTitle,
          .spaceTitle {
            font-size: 21px;
          }

          .spaceGuideText {
            font-size: 12px;
            margin-top: 5px;
          }

          .spaceCount,
          .changeSpaceButton {
            font-size: 12px;
            padding: 8px 10px;
          }

          .spaceGrid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 9px;
          }

          .spaceCard {
            border-radius: 18px;
            padding: 7px;
          }

          .spaceThumb {
            border-radius: 14px;
          }

          .spaceInfo {
            gap: 6px;
            padding: 8px 1px 1px;
          }

          .spaceName {
            font-size: 14px;
          }

          .spaceGoBadge {
            padding: 4px 7px;
            font-size: 10px;
          }

          .previewViewport {
            border-radius: 20px;
            min-height: 0;
          }

          .sceneStage {
            border-radius: 20px;
          }

          .zoneApplyGrid {
            gap: 7px;
            margin-top: 10px;
          }

          .zoneApplyButton {
            border-radius: 16px;
            padding: 10px 7px;
            min-height: 64px;
            text-align: center;
          }

          .zoneApplyButton span {
            font-size: 13px;
          }

          .zoneApplyButton strong {
            font-size: 10.5px;
            -webkit-line-clamp: 2;
          }

          .applyActionRow {
            gap: 7px;
            overflow-x: auto;
            flex-wrap: nowrap;
          }

          .applyActionRow .smallActionButton {
            white-space: nowrap;
            font-size: 12px;
            padding: 8px 10px;
          }

          .applyWarningText {
            margin: 10px 2px 7px;
            font-size: 12px;
            line-height: 1.45;
          }

          .applyDecisionRow {
            margin-top: 7px;
          }

          .decisionNextButton {
            border-radius: 14px;
            padding: 13px 14px;
            font-size: 15px;
          }

          .decisionSummary {
            border-radius: 18px;
            padding: 11px;
            margin-top: 10px;
          }

          .decisionSpaceName {
            font-size: 16px;
            margin-bottom: 8px;
          }

          .decisionZoneList {
            gap: 7px;
          }

          .decisionZoneItem {
            align-items: flex-start;
            border-radius: 14px;
            padding: 10px;
          }

          .decisionZoneItem span {
            font-size: 12px;
          }

          .decisionZoneItem strong {
            font-size: 12px;
            line-height: 1.35;
            max-width: 68%;
          }

          .decisionActionGrid {
            grid-template-columns: 1fr;
            gap: 10px;
            margin-top: 10px;
          }

          .decisionActionCard {
            position: relative;
            border-radius: 18px;
            padding: 13px 13px 13px 54px;
            min-height: 0;
          }

          .decisionActionIcon {
            position: absolute;
            left: 13px;
            top: 13px;
            width: 28px;
            height: 28px;
            margin-bottom: 0;
            font-size: 12px;
          }

          .decisionActionCard h3 {
            margin: 0 0 5px;
            font-size: 16px;
            line-height: 1.32;
          }

          .decisionActionCard p {
            margin: 0 0 10px;
            font-size: 12.5px;
            line-height: 1.55;
          }

          .primaryDecisionButton {
            width: 100%;
            min-height: 40px;
            border-radius: 14px;
            font-size: 13px;
            padding: 0 12px;
          }

          .decisionMessage {
            margin-top: 7px;
            font-size: 11.5px;
          }

          .decisionFabricWarning {
            margin-top: 8px;
            border-radius: 14px;
            padding: 10px;
            font-size: 11.5px;
          }

          .storeInfoBox {
            border-radius: 14px;
            padding: 10px;
            gap: 3px;
          }

        .storeInfoBox strong {
          color: ${COLORS.cream};
          font-size: 13px;
        }

        .storeInfoBox span {
          color: ${COLORS.white};
          font-size: 12px;
          line-height: 1.45;
        }

        .bottomStepNav {
            bottom: 10px;
            width: calc(100% - 22px);
            border-radius: 20px;
            padding: 7px;
          }

          .bottomStepNav button {
            border-radius: 15px;
            padding: 10px 4px;
            font-size: 11px;
            gap: 4px;
          }

          .bottomStepNav button span {
            width: 17px;
            height: 17px;
            flex-basis: 17px;
            font-size: 10px;
          }

          .sheetOverlay {
            padding: 8px;
          }

          .filmSheet {
            height: 94vh;
            max-height: 94vh;
            border-radius: 24px;
            padding: 10px;
          }

          .sheetHeader h3 {
            font-size: 19px;
          }

          .sheetHeader p {
            font-size: 12px;
          }

          .palettePanel {
            border-radius: 18px;
            padding: 9px;
            gap: 9px;
          }

          .paletteChip {
            padding: 7px 10px;
            font-size: 11.5px;
          }

          .paletteColorChip {
            min-height: 32px;
            font-size: 11.5px;
          }

          .sheetSearchForm {
            gap: 7px;
          }

          .searchInput {
            height: 42px;
            border-radius: 14px;
            padding: 9px 11px;
            font-size: 14px;
          }

          .searchButton {
            min-height: 42px;
            border-radius: 14px;
            padding: 0 13px;
          }

          .sheetFilmGrid {
            grid-template-columns: repeat(3, minmax(0, 1fr));
            gap: 8px;
          }

          .sheetFilmItem,
          .sheetFilmSkeletonItem {
            border-radius: 16px;
            padding: 7px;
          }

          .sheetFilmSkeletonThumb {
            border-radius: 12px;
          }

          .sheetFilmThumb {
            border-radius: 12px;
            margin-bottom: 6px;
          }

          .sheetFilmName {
            font-size: 11px;
            min-height: 29px;
          }

          .sheetFilmSampleButton {
            min-height: 30px;
            font-size: 10px;
          }

          .sheetSampleBubble {
            width: min(300px, calc(100vw - 28px));
            max-height: calc(100dvh - 24px);
            padding: 16px;
            border-radius: 20px;
          }

          .sheetSampleBubbleImageWrap {
            height: min(56dvh, 460px);
          }

          .sheetSampleBubbleTitle {
            font-size: 15px;
          }

          .sheetSampleBubbleText {
            font-size: 11px;
          }

        }


        .simulatorFavoriteToast {
          position: fixed;
          left: 50%;
          bottom: calc(100px + env(safe-area-inset-bottom, 0px));
          transform: translateX(-50%);
          z-index: 10020;
          width: min(360px, calc(100% - 32px));
          border-radius: 999px;
          padding: 13px 16px;
          background: rgba(10, 8, 72, 0.96);
          border: 1px solid rgba(238, 224, 197, 0.34);
          box-shadow: 0 18px 44px rgba(0, 0, 0, 0.34);
          color: ${COLORS.cream};
          font-size: 13px;
          font-weight: 1000;
          line-height: 1.35;
          text-align: center;
          word-break: keep-all;
          pointer-events: none;
        }

        .applyDecisionRowWithFavorite {
          display: grid;
          grid-template-columns: minmax(140px, 0.48fr) minmax(150px, 0.52fr);
          gap: 9px;
          align-items: stretch;
        }

        .favoriteSaveButton {
          width: 100%;
          border: 1px solid rgba(238, 224, 197, 0.46);
          border-radius: 16px;
          padding: 15px 12px;
          background: rgba(238, 224, 197, 0.13);
          color: ${COLORS.cream};
          font-size: 15px;
          font-weight: 1000;
          letter-spacing: -0.02em;
          cursor: pointer;
          box-shadow: 0 12px 26px rgba(0, 0, 0, 0.18);
          white-space: nowrap;
        }

        .favoriteSaveButton:disabled {
          opacity: 0.45;
          cursor: not-allowed;
          box-shadow: none;
        }

        .applySplitHelpAction {
          position: relative;
          display: flex;
          align-items: stretch;
          width: 100%;
          min-width: 0;
          min-height: 48px;
          border: 1px solid rgba(238, 224, 197, 0.46);
          border-radius: 16px;
          background: rgba(255, 255, 255, 0.055);
          box-shadow:
            inset 0 1px 0 rgba(255, 255, 255, 0.08),
            0 12px 26px rgba(0, 0, 0, 0.18);
          overflow: visible;
          isolation: isolate;
        }

        .applySplitHelpAction.isMainDisabled .applySplitMainButton {
          opacity: 0.45;
          cursor: not-allowed;
        }

        .applySplitMainButton,
        .applySplitHelpButton {
          appearance: none;
          -webkit-appearance: none;
          border: 0;
          font-weight: 1000;
        }

        .applySplitMainButton {
          flex: 1 1 auto;
          min-width: 0;
          min-height: 48px;
          border-radius: 15px 0 0 15px;
          padding: 14px 10px;
          background: transparent;
          color: ${COLORS.cream};
          font-size: 15px;
          letter-spacing: -0.02em;
          text-align: center;
          white-space: nowrap;
          cursor: pointer;
        }

        .applySplitMainButton:hover,
        .applySplitMainButton:focus-visible {
          background: rgba(238, 224, 197, 0.08);
          outline: none;
        }

        .applySplitHelpAction.isMainDisabled .applySplitMainButton:hover,
        .applySplitHelpAction.isMainDisabled .applySplitMainButton:focus-visible {
          background: transparent;
        }

        .applySplitHelpButton {
          flex: 0 0 46px;
          width: 46px;
          min-width: 46px;
          min-height: 48px;
          border-left: 1px solid rgba(238, 224, 197, 0.24);
          border-radius: 0 15px 15px 0;
          background: rgba(238, 224, 197, 0.15);
          color: ${COLORS.cream};
          box-shadow: inset 1px 0 0 rgba(0, 0, 0, 0.1);
          font-size: 15px;
          line-height: 1;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 0;
        }

        .applySplitHelpButton:hover,
        .applySplitHelpButton:focus-visible {
          background: ${COLORS.cream};
          color: ${COLORS.bg};
          outline: none;
        }

        .applyDecisionSplitAction {
          border-color: transparent;
          background: ${COLORS.cream};
          box-shadow: 0 14px 30px rgba(0, 0, 0, 0.24);
        }

        .applyDecisionSplitAction .applySplitMainButton,
        .applyDecisionSplitAction .applySplitHelpButton {
          color: ${COLORS.bg};
        }

        .applyDecisionSplitAction .applySplitHelpButton {
          border-left-color: rgba(5, 2, 59, 0.18);
          background: rgba(5, 2, 59, 0.08);
        }

        .applyDecisionSplitAction .applySplitMainButton:hover,
        .applyDecisionSplitAction .applySplitMainButton:focus-visible,
        .applyDecisionSplitAction .applySplitHelpButton:hover,
        .applyDecisionSplitAction .applySplitHelpButton:focus-visible {
          background: rgba(5, 2, 59, 0.12);
        }

        .applySplitHelpBubble {
          position: absolute;
          bottom: calc(100% + 10px);
          box-sizing: border-box;
          width: min(292px, calc(100vw - 24px));
          max-width: min(292px, calc(100vw - 24px));
          border-radius: 18px;
          border: 1px solid rgba(238, 224, 197, 0.34);
          background: linear-gradient(180deg, rgba(18, 16, 92, 0.99) 0%, rgba(9, 8, 70, 0.985) 100%);
          color: ${COLORS.white};
          box-shadow: 0 18px 40px rgba(0, 0, 0, 0.36);
          padding: 13px 14px;
          font-size: 12px;
          font-weight: 800;
          line-height: 1.55;
          letter-spacing: -0.02em;
          word-break: keep-all;
          overflow-wrap: anywhere;
          white-space: normal;
          text-align: left;
          z-index: 130;
        }

        .applySplitHelpBubble::before {
          content: "";
          position: absolute;
          bottom: -6px;
          width: 10px;
          height: 10px;
          transform: rotate(45deg);
          border-right: 1px solid rgba(238, 224, 197, 0.34);
          border-bottom: 1px solid rgba(238, 224, 197, 0.34);
          background: rgba(15, 13, 82, 0.99);
        }

        .simHelpBubbleHeader {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          margin-bottom: 8px;
          color: ${COLORS.cream};
          font-size: 12px;
          font-weight: 1000;
          letter-spacing: -0.02em;
        }

        .simHelpBubbleIcon {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 18px;
          height: 18px;
          border-radius: 999px;
          background: rgba(238, 224, 197, 0.18);
          border: 1px solid rgba(238, 224, 197, 0.32);
          color: ${COLORS.cream};
          font-size: 11px;
          line-height: 1;
          flex: 0 0 auto;
        }

        .simHelpBubbleTitle {
          color: ${COLORS.cream};
          font-weight: 1000;
        }

        .simHelpBubbleBody {
          display: block;
          color: ${COLORS.white};
          font-size: 12px;
          font-weight: 800;
          line-height: 1.6;
          word-break: keep-all;
          overflow-wrap: anywhere;
          white-space: normal;
        }

        .applySplitHelpAction-favorite .applySplitHelpBubble {
          left: 0;
        }

        .applySplitHelpAction-favorite .applySplitHelpBubble::before {
          left: 74px;
        }

        .applySplitHelpAction-decision .applySplitHelpBubble {
          right: 0;
        }

        .applySplitHelpAction-decision .applySplitHelpBubble::before {
          right: 18px;
        }

        .favoriteCandidateSection {
          border-radius: 22px;
          padding: 14px;
          background: rgba(255, 255, 255, 0.045);
          border: 1px solid ${COLORS.line};
          margin-top: 12px;
        }

        .favoriteCandidateHeader {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 12px;
        }

        .favoriteCandidateHeader h3 {
          margin: 0;
          color: ${COLORS.white};
          font-size: 18px;
          font-weight: 1000;
          letter-spacing: -0.03em;
        }

        .favoriteCandidateHeader > span {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-width: 48px;
          min-height: 32px;
          border-radius: 999px;
          background: rgba(238, 224, 197, 0.12);
          border: 1px solid rgba(238, 224, 197, 0.18);
          color: ${COLORS.cream};
          font-size: 12px;
          font-weight: 1000;
        }

        .favoriteCandidateList {
          display: grid;
          gap: 10px;
          margin-top: 12px;
        }

        .favoriteCandidateCard {
          display: grid;
          grid-template-columns: 118px minmax(0, 1fr);
          gap: 12px;
          border-radius: 18px;
          padding: 10px;
          background: rgba(255, 255, 255, 0.052);
          border: 1px solid rgba(255, 255, 255, 0.12);
          cursor: pointer;
          transition: border-color 0.16s ease, background 0.16s ease, box-shadow 0.16s ease, transform 0.16s ease;
        }

        .favoriteCandidateCard:hover {
          border-color: rgba(238, 224, 197, 0.30);
          background: rgba(255, 255, 255, 0.068);
        }

        .favoriteCandidateCard:active {
          transform: translateY(1px);
        }

        .favoriteCandidateCard:focus-visible {
          outline: 2px solid rgba(238, 224, 197, 0.68);
          outline-offset: 3px;
        }

        .favoriteCandidateCardSelected {
          border-color: rgba(238, 224, 197, 0.54);
          background:
            linear-gradient(180deg, rgba(238, 224, 197, 0.10), rgba(255, 255, 255, 0.052));
          box-shadow: 0 0 0 1px rgba(238, 224, 197, 0.16) inset;
        }

        .favoriteCandidateThumb {
          min-width: 0;
          align-self: flex-start;
        }

        .previewViewport.favoriteCandidateThumbViewport {
          min-height: 0;
          border-radius: 16px;
          background: rgba(255, 255, 255, 0.035);
        }

        .favoriteCandidateThumbViewport .sceneStage,
        .favoriteCandidateThumbViewport .emptyPreviewBox {
          border-radius: 16px;
        }

        .favoriteCandidateThumbViewport .emptyPreviewWrap {
          padding: 8px;
        }

        .favoriteCandidateThumbViewport .emptyPreviewBox {
          min-height: 0;
          padding: 8px;
        }

        .favoriteCandidateThumbViewport .emptyPreviewInner {
          display: none;
        }

        .favoriteCandidateBody {
          min-width: 0;
          display: grid;
          gap: 8px;
        }

        .favoriteCandidateTitleRow {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 8px;
        }

        .favoriteCandidateTitleRow strong {
          min-width: 0;
          color: ${COLORS.cream};
          font-size: 14px;
          font-weight: 1000;
          line-height: 1.25;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .favoriteCandidateTitleRow em {
          flex: 0 0 auto;
          color: ${COLORS.soft};
          font-size: 10.5px;
          font-style: normal;
          font-weight: 800;
          line-height: 1.25;
        }

        .favoriteCandidateMeta {
          flex: 0 0 auto;
          display: inline-flex;
          align-items: center;
          justify-content: flex-end;
          gap: 6px;
          min-width: 0;
        }

        .favoriteCandidateSelectedBadge {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-height: 24px;
          border-radius: 999px;
          padding: 0 9px;
          border: 1px solid rgba(238, 224, 197, 0.46);
          background: rgba(238, 224, 197, 0.18);
          color: ${COLORS.cream};
          font-size: 10.5px;
          font-weight: 1000;
          white-space: nowrap;
        }

        .favoriteCandidateFilmList {
          display: grid;
          gap: 5px;
        }

        .favoriteCandidateFilmItem {
          display: grid;
          grid-template-columns: 64px minmax(0, 1fr);
          gap: 6px;
          align-items: start;
        }

        .favoriteCandidateFilmItem span {
          color: ${COLORS.soft};
          font-size: 11px;
          font-weight: 900;
          line-height: 1.35;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .favoriteCandidateFilmItem b {
          min-width: 0;
          color: ${COLORS.white};
          font-size: 11px;
          font-weight: 900;
          line-height: 1.35;
          overflow: hidden;
          display: -webkit-box;
          -webkit-line-clamp: 1;
          -webkit-box-orient: vertical;
        }

        .favoriteCandidateActions {
          display: flex;
          gap: 7px;
          flex-wrap: wrap;
          margin-top: 1px;
        }

        .favoriteCandidateApplyButton,
        .favoriteCandidateDeleteButton {
          border-radius: 11px;
          min-height: 32px;
          padding: 0 10px;
          font-size: 11.5px;
          font-weight: 1000;
          cursor: pointer;
        }

        .favoriteCandidateApplyButton {
          border: 1px solid rgba(238, 224, 197, 0.36);
          background: rgba(238, 224, 197, 0.14);
          color: ${COLORS.cream};
        }

        .favoriteCandidateDeleteButton {
          border: 1px solid rgba(255, 255, 255, 0.12);
          background: rgba(255, 255, 255, 0.055);
          color: ${COLORS.soft};
        }

        .favoriteShareFooter {
          margin-top: 12px;
          display: grid;
          gap: 8px;
          border-radius: 17px;
          padding: 11px;
          background: rgba(7, 5, 58, 0.44);
          border: 1px solid rgba(238, 224, 197, 0.15);
        }

        .favoriteShareStatus {
          color: ${COLORS.soft};
          font-size: 12px;
          font-weight: 900;
          line-height: 1.45;
          word-break: keep-all;
        }

        .favoriteShareSplitAction {
          width: 100%;
          min-height: 44px;
          border-radius: 15px;
          box-shadow: none;
        }

        .favoriteShareMainButton {
          min-height: 44px;
          border-radius: 14px 0 0 14px;
          padding: 12px 10px;
          font-size: 14px;
          color: ${COLORS.creamText};
        }

        .favoriteShareHelpButton {
          flex-basis: 44px;
          width: 44px;
          min-width: 44px;
          min-height: 44px;
          border-radius: 0 14px 14px 0;
          color: ${COLORS.creamText};
        }

        .favoriteShareSplitAction .favoriteShareHelpBubble {
          right: 0;
          width: min(286px, calc(100vw - 54px));
          max-width: 286px;
        }

        .favoriteShareSplitAction .favoriteShareHelpBubble::before {
          right: 17px;
        }

        .favoriteShareMessage {
          margin-top: 0;
        }

        .favoriteEmptyBox {
          margin-top: 12px;
          border-radius: 16px;
          padding: 14px;
          background: rgba(238, 224, 197, 0.08);
          border: 1px dashed rgba(238, 224, 197, 0.24);
          color: ${COLORS.soft};
          font-size: 13px;
          font-weight: 800;
          line-height: 1.55;
          word-break: keep-all;
        }

        @media (max-width: 480px) {
          .simulatorFavoriteToast {
            bottom: calc(92px + env(safe-area-inset-bottom, 0px));
            font-size: 12px;
            padding: 12px 14px;
          }

          .applyDecisionRowWithFavorite {
            grid-template-columns: 132px minmax(0, 1fr);
            gap: 7px;
          }

          .favoriteSaveButton {
            border-radius: 14px;
            padding: 13px 8px;
            font-size: 13px;
          }

          .applySplitHelpAction {
            min-height: 44px;
            border-radius: 14px;
          }

          .applySplitMainButton {
            min-height: 44px;
            border-radius: 13px 0 0 13px;
            padding: 12px 7px;
            font-size: 13px;
          }

          .applySplitHelpButton {
            flex-basis: 38px;
            width: 38px;
            min-width: 38px;
            min-height: 44px;
            border-radius: 0 13px 13px 0;
            font-size: 13px;
          }

          .applySplitHelpBubble {
            width: min(280px, calc(100vw - 34px));
            max-width: min(280px, calc(100vw - 34px));
            padding: 12px 13px;
            font-size: 11px;
          }

          .simHelpBubbleHeader {
            font-size: 11px;
            gap: 6px;
            margin-bottom: 7px;
          }

          .simHelpBubbleIcon {
            width: 16px;
            height: 16px;
            font-size: 10px;
          }

          .simHelpBubbleBody {
            font-size: 11px;
            line-height: 1.58;
          }

          .applySplitHelpAction-favorite .applySplitHelpBubble::before {
            left: 60px;
          }

          .applySplitHelpAction-decision .applySplitHelpBubble::before {
            right: 14px;
          }

          .favoriteCandidateSection {
            border-radius: 18px;
            padding: 11px;
            margin-top: 10px;
          }

          .favoriteCandidateHeader h3 {
            font-size: 16px;
          }

          .favoriteCandidateCard {
            grid-template-columns: 92px minmax(0, 1fr);
            gap: 9px;
            border-radius: 16px;
            padding: 8px;
          }

          .favoriteCandidateFilmItem {
            grid-template-columns: 52px minmax(0, 1fr);
            gap: 5px;
          }

          .favoriteCandidateTitleRow strong {
            font-size: 13px;
          }

          .favoriteCandidateTitleRow em {
            display: none;
          }

          .favoriteCandidateFilmItem span,
          .favoriteCandidateFilmItem b {
            font-size: 10.5px;
          }

          .favoriteCandidateSelectedBadge {
            min-height: 22px;
            padding: 0 7px;
            font-size: 10px;
          }

          .favoriteShareFooter {
            border-radius: 15px;
            padding: 9px;
          }

          .favoriteShareSplitAction {
            min-height: 40px;
            border-radius: 14px;
          }

          .favoriteShareMainButton {
            min-height: 40px;
            border-radius: 13px 0 0 13px;
            padding: 11px 8px;
            font-size: 13px;
          }

          .favoriteShareHelpButton {
            flex-basis: 40px;
            width: 40px;
            min-width: 40px;
            min-height: 40px;
            border-radius: 0 13px 13px 0;
            font-size: 13px;
          }

          .favoriteShareSplitAction .favoriteShareHelpBubble {
            width: min(268px, calc(100vw - 44px));
            max-width: 268px;
          }

          .favoriteShareSplitAction .favoriteShareHelpBubble::before {
            right: 14px;
          }

          .favoriteCandidateApplyButton,
          .favoriteCandidateDeleteButton {
            min-height: 30px;
            padding: 0 8px;
            font-size: 11px;
          }
        }

        @media (min-width: 768px) {
          .pageInner.pageInnerCustomerIntroWithGuide {
            padding-top: calc(env(safe-area-inset-top, 0px) + 116px);
          }

          .guideToggleFloatingButton {
            top: calc(env(safe-area-inset-top, 0px) + 14px);
            right: 14px;
            width: 96px;
            height: 96px;
          }
        }
      `}</style>
  );
}
