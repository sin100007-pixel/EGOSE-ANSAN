"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import guideOnImage from "../assets/guide-on.png";

export type SimulatorAdminTutorialStep = {
  id: string;
  title: string;
  description: ReactNode;
  target?: string;
  tip?: ReactNode;
  scrollBlock?: ScrollLogicalPosition;
  scrollOffset?: number;
  cardBottom?: number;
  cardBottomMobile?: number;
  cardPlacement?: "top" | "bottom";
  spotlightFullViewport?: boolean;
  allowTargetInteraction?: boolean;
};

type TutorialRect = {
  top: number;
  left: number;
  width: number;
  height: number;
};

type SimulatorAdminTutorialProps = {
  storageKey: string;
  steps: readonly SimulatorAdminTutorialStep[];
  buttonLabel?: string;
  autoOpen?: boolean;
  autoOpenDelay?: number;
  controlledOpen?: boolean;
  onControlledClose?: () => void;
  hideButton?: boolean;
  ariaLabel?: string;
  skipStorageMarkDone?: boolean;
  onStepChange?: (step: SimulatorAdminTutorialStep, index: number, isOpen: boolean) => void;
};

const STORAGE_PREFIX = "simulator-admin-tutorial";

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function getVisibleTargetBounds(useFullViewport = false) {
  const side = 8;
  const bottomReserve = useFullViewport
    ? side
    : Math.min(118, Math.max(84, window.innerHeight * 0.12));

  return {
    top: side,
    left: side,
    right: window.innerWidth - side,
    bottom: window.innerHeight - bottomReserve,
  };
}

export default function SimulatorAdminTutorial({
  storageKey,
  steps,
  buttonLabel = "도움말 보기",
  autoOpen = true,
  autoOpenDelay = 420,
  controlledOpen,
  onControlledClose,
  hideButton = false,
  ariaLabel = "시뮬봇 관리자 튜토리얼",
  skipStorageMarkDone = false,
  onStepChange,
}: SimulatorAdminTutorialProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [targetRect, setTargetRect] = useState<TutorialRect | null>(null);
  const [showStartPrompt, setShowStartPrompt] = useState(false);
  const [showSkipNotice, setShowSkipNotice] = useState(false);
  const isControlled = typeof controlledOpen === "boolean";
  const open = isControlled ? Boolean(controlledOpen) : internalOpen;

  const setOpenState = useCallback(
    (nextOpen: boolean) => {
      if (isControlled) {
        if (!nextOpen) {
          onControlledClose?.();
        }
        return;
      }

      setInternalOpen(nextOpen);
    },
    [isControlled, onControlledClose]
  );

  const storageName = `${STORAGE_PREFIX}:${storageKey}`;
  const safeSteps = useMemo(() => steps.filter((step) => step.title.trim()), [steps]);
  const currentStep = safeSteps[currentIndex] || safeSteps[0];
  const totalSteps = safeSteps.length;
  const guideName = useMemo(() => {
    const cleaned = buttonLabel
      .replace(/도움말/g, "")
      .replace(/보기/g, "")
      .replace(/사용설명/g, "")
      .trim();

    return cleaned || "시뮬봇";
  }, [buttonLabel]);
  const allowTargetInteraction = Boolean(currentStep?.allowTargetInteraction);

  const cardBottomDesktop = currentStep?.cardBottom ?? 86;
  const cardBottomMobile = currentStep?.cardBottomMobile ?? 78;
  const cardPlacement = currentStep?.cardPlacement ?? "bottom";

  const measureTarget = useCallback(() => {
    if (!open || !currentStep?.target) {
      setTargetRect(null);
      return;
    }

    const element = document.querySelector<HTMLElement>(
      `[data-sim-admin-guide="${currentStep.target}"]`
    );

    if (!element) {
      setTargetRect(null);
      return;
    }

    const rect = element.getBoundingClientRect();
    const padding = 10;
    const bounds = getVisibleTargetBounds(Boolean(currentStep?.spotlightFullViewport));

    const isOutsideViewport =
      rect.bottom <= bounds.top ||
      rect.top >= bounds.bottom ||
      rect.right <= bounds.left ||
      rect.left >= bounds.right;

    if (isOutsideViewport) {
      setTargetRect(null);
      return;
    }

    const top = clamp(rect.top - padding, bounds.top, bounds.bottom - 48);
    const left = clamp(rect.left - padding, bounds.left, bounds.right - 64);
    const right = clamp(rect.right + padding, left + 64, bounds.right);
    const bottom = clamp(rect.bottom + padding, top + 48, bounds.bottom);

    setTargetRect({
      top,
      left,
      width: right - left,
      height: bottom - top,
    });
  }, [currentStep?.spotlightFullViewport, currentStep?.target, open]);

  const markDone = useCallback(() => {
    try {
      window.localStorage.setItem(storageName, "done");
    } catch {
      // 저장이 막힌 브라우저에서는 현재 화면에서만 닫히게 둡니다.
    }
  }, [storageName]);

  const closeTutorial = useCallback(() => {
    if (!skipStorageMarkDone) {
      markDone();
    }
    setOpenState(false);
  }, [markDone, setOpenState, skipStorageMarkDone]);

  const openTutorial = useCallback(() => {
    if (safeSteps.length === 0) return;
    if (!skipStorageMarkDone) {
      markDone();
    }
    setShowStartPrompt(false);
    setShowSkipNotice(false);
    setCurrentIndex(0);
    setOpenState(true);
  }, [markDone, safeSteps.length, setOpenState, skipStorageMarkDone]);

  const startTutorialFromPrompt = useCallback(() => {
    openTutorial();
  }, [openTutorial]);

  const skipTutorialFromPrompt = useCallback(() => {
    markDone();
    setShowStartPrompt(false);
    setShowSkipNotice(true);
  }, [markDone]);

  const closeSkipNotice = useCallback(() => {
    setShowSkipNotice(false);
  }, []);

  const goNext = useCallback(() => {
    if (currentIndex >= totalSteps - 1) {
      closeTutorial();
      return;
    }

    setCurrentIndex((prev) => Math.min(prev + 1, totalSteps - 1));
  }, [closeTutorial, currentIndex, totalSteps]);

  useEffect(() => {
    if (!isControlled || !open) return;
    setCurrentIndex(0);
  }, [isControlled, open]);

  useEffect(() => {
    if (!onStepChange || !currentStep) return;

    onStepChange(currentStep, currentIndex, open);
  }, [currentIndex, currentStep, onStepChange, open]);

  const nudgeTargetIntoVisibleArea = useCallback(() => {
    if (!currentStep?.target) return;

    const element = document.querySelector<HTMLElement>(
      `[data-sim-admin-guide="${currentStep.target}"]`
    );

    if (!element) return;

    const rect = element.getBoundingClientRect();
    const bounds = getVisibleTargetBounds(Boolean(currentStep?.spotlightFullViewport));
    let scrollAmount = 0;

    if (rect.bottom > bounds.bottom) {
      scrollAmount = rect.bottom - bounds.bottom + 18;
    } else if (rect.top < bounds.top) {
      scrollAmount = rect.top - bounds.top - 18;
    }

    if (scrollAmount !== 0) {
      window.scrollBy({ top: scrollAmount, behavior: "smooth" });
    }
  }, [currentStep?.spotlightFullViewport, currentStep?.target]);

  const goPrev = useCallback(() => {
    setCurrentIndex((prev) => Math.max(prev - 1, 0));
  }, []);

  useEffect(() => {
    if (isControlled || !autoOpen || safeSteps.length === 0) return;

    let alreadyDone = false;

    try {
      alreadyDone = window.localStorage.getItem(storageName) === "done";
    } catch {
      alreadyDone = false;
    }

    if (alreadyDone) return;

    const timer = window.setTimeout(() => {
      let doneAfterDelay = false;

      try {
        doneAfterDelay = window.localStorage.getItem(storageName) === "done";
      } catch {
        doneAfterDelay = false;
      }

      if (!doneAfterDelay) {
        setShowStartPrompt(true);
      }
    }, autoOpenDelay);

    return () => {
      window.clearTimeout(timer);
    };
  }, [autoOpen, autoOpenDelay, isControlled, safeSteps.length, storageName]);

  useEffect(() => {
    if (!open || !currentStep?.target) {
      setTargetRect(null);
      return;
    }

    const element = document.querySelector<HTMLElement>(
      `[data-sim-admin-guide="${currentStep.target}"]`
    );

    if (element) {
      element.scrollIntoView({ block: currentStep.scrollBlock ?? "center", behavior: "smooth" });
    }

    let offsetTimer: number | null = null;
    if (currentStep.scrollOffset) {
      offsetTimer = window.setTimeout(() => {
        window.scrollBy({ top: currentStep.scrollOffset, behavior: "smooth" });
      }, 210);
    }

    const nudgeTimer = window.setTimeout(nudgeTargetIntoVisibleArea, 360);
    const firstTimer = window.setTimeout(measureTarget, 120);
    const secondTimer = window.setTimeout(measureTarget, 520);
    const thirdTimer = window.setTimeout(measureTarget, 820);

    return () => {
      if (offsetTimer) window.clearTimeout(offsetTimer);
      window.clearTimeout(nudgeTimer);
      window.clearTimeout(firstTimer);
      window.clearTimeout(secondTimer);
      window.clearTimeout(thirdTimer);
    };
  }, [currentIndex, currentStep?.scrollBlock, currentStep?.scrollOffset, currentStep?.target, measureTarget, nudgeTargetIntoVisibleArea, open]);

  useEffect(() => {
    if (!open) return;

    const handleChange = () => measureTarget();

    window.addEventListener("resize", handleChange);
    window.addEventListener("scroll", handleChange, true);

    return () => {
      window.removeEventListener("resize", handleChange);
      window.removeEventListener("scroll", handleChange, true);
    };
  }, [measureTarget, open]);

  if (safeSteps.length === 0) return null;

  return (
    <>
      {!hideButton ? (
        <button
          type="button"
          className="simAdminTutorialGuideButton"
          onClick={openTutorial}
          aria-label={`${guideName} 사용설명 열기`}
          title={`${guideName} 사용설명`}
        >
          <Image
            src={guideOnImage}
            alt=""
            width={120}
            height={120}
            className="simAdminTutorialGuideImage"
            priority={false}
          />
        </button>
      ) : null}

      {showStartPrompt && !open ? (
        <div className="simAdminTutorialPromptLayer" role="presentation">
          <section
            className="simAdminTutorialPromptCard"
            role="dialog"
            aria-modal="true"
            aria-labelledby="sim-admin-tutorial-prompt-title"
          >
            <div className="simAdminTutorialPromptIcon" aria-hidden="true">
              <Image
                src={guideOnImage}
                alt=""
                width={120}
                height={120}
                className="simAdminTutorialPromptImage"
                priority={false}
              />
            </div>
            <div className="simAdminTutorialPromptBadge">시뮬봇 사용설명</div>
            <h2 id="sim-admin-tutorial-prompt-title">
              {guideName} 사용설명을 들으시겠습니까?
            </h2>
            <p>
              처음 사용하는 화면이면 가이드를 보면서 어떤 버튼을 눌러야 하는지 차례대로 확인할 수 있습니다.
            </p>
            <div className="simAdminTutorialPromptActions">
              <button type="button" onClick={skipTutorialFromPrompt} className="ghost">
                필요없어요
              </button>
              <button type="button" onClick={startTutorialFromPrompt}>
                들을게요
              </button>
            </div>
          </section>
        </div>
      ) : null}

      {showSkipNotice && !open ? (
        <div className="simAdminTutorialPromptLayer" role="presentation">
          <section
            className="simAdminTutorialPromptCard simAdminTutorialNoticeCard"
            role="dialog"
            aria-modal="true"
            aria-labelledby="sim-admin-tutorial-notice-title"
          >
            <div className="simAdminTutorialPromptIcon" aria-hidden="true">
              <Image
                src={guideOnImage}
                alt=""
                width={120}
                height={120}
                className="simAdminTutorialPromptImage"
                priority={false}
              />
            </div>
            <h2 id="sim-admin-tutorial-notice-title">가이드 없이 시작할게요.</h2>
            <p>
              오른쪽 상단에 가이드 버튼이 있으니 사용설명이 필요하면 눌러주세요.
            </p>
            <div className="simAdminTutorialPromptActions single">
              <button type="button" onClick={closeSkipNotice}>
                알겠어요
              </button>
            </div>
          </section>
        </div>
      ) : null}

      {open && currentStep ? (
        <div
          className={`simAdminTutorialLayer ${allowTargetInteraction ? "isTargetInteractive" : ""}`}
          role="dialog"
          aria-modal="true"
          aria-label={ariaLabel}
        >
          <div className="simAdminTutorialDim" />

          {targetRect ? (
            <div
              className="simAdminTutorialSpotlight"
              style={{
                top: targetRect.top,
                left: targetRect.left,
                width: targetRect.width,
                height: targetRect.height,
              }}
            />
          ) : null}

          <section
            className={`simAdminTutorialCard ${cardPlacement === "top" ? "isTop" : "isBottom"}`}
            style={{
              ["--sim-admin-tutorial-bottom-desktop" as string]: `${cardBottomDesktop}px`,
              ["--sim-admin-tutorial-bottom-mobile" as string]: `${cardBottomMobile}px`,
            }}
          >
            <div className="simAdminTutorialTopRow">
              <span>
                {currentIndex + 1} / {totalSteps}
              </span>
              <button type="button" onClick={closeTutorial} aria-label="튜토리얼 닫기">
                닫기
              </button>
            </div>

            <h2>{currentStep.title}</h2>
            <p>{currentStep.description}</p>

            {currentStep.tip ? <div className="simAdminTutorialTip">{currentStep.tip}</div> : null}

            <div className="simAdminTutorialProgress" aria-hidden="true">
              {safeSteps.map((step, index) => (
                <span key={step.id} className={index <= currentIndex ? "active" : ""} />
              ))}
            </div>

            <div className="simAdminTutorialActions">
              <button type="button" onClick={goPrev} disabled={currentIndex === 0} className="ghost">
                이전
              </button>
              <button type="button" onClick={goNext}>
                {currentIndex >= totalSteps - 1 ? "완료" : "다음"}
              </button>
            </div>
          </section>
        </div>
      ) : null}

      <style jsx>{`
        .simAdminTutorialGuideButton {
          position: fixed;
          top: calc(env(safe-area-inset-top, 0px) + 10px);
          right: 10px;
          z-index: 100;
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
          touch-action: manipulation;
          -webkit-tap-highlight-color: transparent;
        }

        :global(.simAdminTutorialGuideImage) {
          width: 100%;
          height: 100%;
          display: block;
          object-fit: contain;
        }

        .simAdminTutorialGuideButton:focus-visible {
          outline: 2px solid #eee0c5;
          outline-offset: 3px;
          border-radius: 18px;
        }

        .simAdminTutorialPromptLayer {
          position: fixed;
          inset: 0;
          z-index: 10070;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 18px;
          background: rgba(1, 0, 25, 0.48);
          backdrop-filter: blur(4px);
          box-sizing: border-box;
        }

        .simAdminTutorialPromptCard {
          width: min(430px, calc(100vw - 32px));
          border-radius: 28px;
          border: 1px solid rgba(238, 224, 197, 0.28);
          background: linear-gradient(180deg, rgba(17, 12, 82, 0.98), rgba(9, 6, 62, 0.98));
          color: #fff;
          padding: 22px 18px 18px;
          box-sizing: border-box;
          text-align: center;
          box-shadow: 0 28px 78px rgba(0, 0, 0, 0.46);
        }

        .simAdminTutorialPromptIcon {
          width: 90px;
          height: 90px;
          margin: -6px auto 2px;
        }

        :global(.simAdminTutorialPromptImage) {
          width: 100%;
          height: 100%;
          display: block;
          object-fit: contain;
        }

        .simAdminTutorialPromptBadge {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-height: 28px;
          border-radius: 999px;
          padding: 0 11px;
          background: rgba(238, 224, 197, 0.13);
          color: #eee0c5;
          font-size: 12px;
          font-weight: 900;
          margin-bottom: 10px;
        }

        .simAdminTutorialPromptCard h2 {
          margin: 0;
          color: #eee0c5;
          font-size: 23px;
          line-height: 1.25;
          letter-spacing: -0.04em;
          word-break: keep-all;
        }

        .simAdminTutorialPromptCard p {
          margin: 12px auto 0;
          color: rgba(255, 255, 255, 0.82);
          font-size: 14px;
          line-height: 1.6;
          word-break: keep-all;
        }

        .simAdminTutorialPromptActions {
          display: grid;
          grid-template-columns: 0.9fr 1.1fr;
          gap: 8px;
          margin-top: 18px;
        }

        .simAdminTutorialPromptActions.single {
          grid-template-columns: 1fr;
        }

        .simAdminTutorialPromptActions button {
          border: 0;
          border-radius: 999px;
          min-height: 44px;
          padding: 0 16px;
          background: #eee0c5;
          color: #765630;
          font-size: 14px;
          font-weight: 900;
          cursor: pointer;
        }

        .simAdminTutorialPromptActions button.ghost {
          background: rgba(255, 255, 255, 0.08);
          color: #fff;
          border: 1px solid rgba(255, 255, 255, 0.13);
        }

        .simAdminTutorialNoticeCard .simAdminTutorialPromptIcon {
          margin-bottom: 8px;
        }

        .simAdminTutorialLayer {
          position: fixed;
          inset: 0;
          z-index: 10080;
          pointer-events: none;
        }

        .simAdminTutorialDim {
          position: absolute;
          inset: 0;
          background: rgba(1, 0, 25, 0.33);
          backdrop-filter: blur(0px);
          pointer-events: auto;
        }

        .simAdminTutorialLayer.isTargetInteractive .simAdminTutorialDim {
          pointer-events: none;
          background: rgba(1, 0, 25, 0.18);
        }

        .simAdminTutorialSpotlight {
          position: absolute;
          z-index: 1;
          border-radius: 24px;
          border: 3px solid #eee0c5;
          box-shadow:
            0 0 0 9999px rgba(1, 0, 25, 0.1),
            0 18px 48px rgba(0, 0, 0, 0.24),
            0 0 0 2px rgba(122, 86, 48, 0.42),
            0 0 34px rgba(238, 224, 197, 0.72);
          background: rgba(238, 224, 197, 0.08);
          pointer-events: none;
          transition: all 180ms ease;
        }

        .simAdminTutorialCard {
          position: fixed;
          z-index: 2;
          left: 50%;
          bottom: calc(var(--sim-admin-tutorial-bottom-desktop, 86px) + env(safe-area-inset-bottom));
          transform: translateX(-50%);
          width: min(430px, calc(100vw - 28px));
          border-radius: 26px;
          border: 1px solid rgba(238, 224, 197, 0.28);
          background: linear-gradient(180deg, rgba(17, 12, 82, 0.98), rgba(9, 6, 62, 0.98));
          color: #fff;
          padding: 18px;
          box-sizing: border-box;
          box-shadow: 0 26px 72px rgba(0, 0, 0, 0.42);
          pointer-events: auto;
          transition: bottom 220ms ease, top 220ms ease, transform 220ms ease;
        }

        .simAdminTutorialCard.isTop {
          top: calc(18px + env(safe-area-inset-top));
          bottom: auto;
        }

        .simAdminTutorialTopRow {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          margin-bottom: 10px;
        }

        .simAdminTutorialTopRow span {
          display: inline-flex;
          align-items: center;
          min-height: 28px;
          border-radius: 999px;
          padding: 0 10px;
          background: rgba(238, 224, 197, 0.13);
          color: #eee0c5;
          font-size: 12px;
          font-weight: 900;
        }

        .simAdminTutorialTopRow button,
        .simAdminTutorialActions button {
          border: 0;
          border-radius: 999px;
          min-height: 38px;
          padding: 0 14px;
          background: #eee0c5;
          color: #765630;
          font-size: 13px;
          font-weight: 900;
          cursor: pointer;
        }

        .simAdminTutorialTopRow button {
          background: rgba(255, 255, 255, 0.08);
          color: rgba(255, 255, 255, 0.82);
          border: 1px solid rgba(255, 255, 255, 0.12);
        }

        .simAdminTutorialCard h2 {
          margin: 0;
          color: #eee0c5;
          font-size: 22px;
          line-height: 1.22;
          letter-spacing: -0.04em;
        }

        .simAdminTutorialCard p {
          margin: 10px 0 0;
          color: rgba(255, 255, 255, 0.82);
          font-size: 14px;
          line-height: 1.62;
          word-break: keep-all;
        }

        .simAdminTutorialCard p :global(.simAdminTutorialEmphasis),
        .simAdminTutorialTip :global(.simAdminTutorialEmphasis) {
          color: #eee0c5;
          font-weight: 900;
        }

        .simAdminTutorialCard p :global(.simAdminTutorialStatusPill) {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-width: 32px;
          height: 22px;
          margin-right: 5px;
          border-radius: 999px;
          color: #fff;
          font-size: 11px;
          font-weight: 1000;
          line-height: 1;
          vertical-align: 1px;
          box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.18), 0 6px 14px rgba(0, 0, 0, 0.18);
        }

        .simAdminTutorialCard p :global(.simAdminTutorialStatusPillOn) {
          background: #e33434;
        }

        .simAdminTutorialCard p :global(.simAdminTutorialStatusPillOff) {
          background: #111;
        }

        .simAdminTutorialCard p :global(.simAdminTutorialCheckerIcon),
        .simAdminTutorialTip :global(.simAdminTutorialCheckerIcon) {
          display: inline-block;
          width: 16px;
          height: 16px;
          margin: 0 4px;
          border-radius: 999px;
          vertical-align: -3px;
          border: 1px solid rgba(255,255,255,0.55);
          background:
            conic-gradient(from 45deg, rgba(255,255,255,0.95) 0 25%, rgba(15,10,70,0.88) 0 50%, rgba(255,255,255,0.95) 0 75%, rgba(15,10,70,0.88) 0 100%);
          box-shadow: 0 0 0 1px rgba(238,224,197,0.18);
        }

        .simAdminTutorialCard p :global(.simAdminTutorialInlineButton),
        .simAdminTutorialTip :global(.simAdminTutorialInlineButton) {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-height: 24px;
          padding: 0 10px;
          margin: 0 3px;
          border-radius: 999px;
          font-size: 12px;
          font-weight: 1000;
          line-height: 1;
          vertical-align: 1px;
          white-space: nowrap;
          box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.18), 0 6px 14px rgba(0, 0, 0, 0.18);
        }

        .simAdminTutorialCard p :global(.simAdminTutorialInlineButtonShare),
        .simAdminTutorialCard p :global(.simAdminTutorialInlineButtonLoad),
        .simAdminTutorialTip :global(.simAdminTutorialInlineButtonShare),
        .simAdminTutorialTip :global(.simAdminTutorialInlineButtonLoad) {
          background: #eee0c5;
          color: #7a5a34;
        }

        .simAdminTutorialCard p :global(.simAdminTutorialInlineButtonDelete),
        .simAdminTutorialTip :global(.simAdminTutorialInlineButtonDelete) {
          background: rgba(255, 92, 92, 0.16);
          color: #ffd6d6;
          border: 1px solid rgba(255, 214, 214, 0.24);
        }

        .simAdminTutorialTip :global(.simAdminTutorialSamplePill) {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-height: 24px;
          border-radius: 999px;
          border: 1px solid rgba(238, 224, 197, 0.52);
          background: rgba(5, 2, 59, 0.72);
          color: #eee0c5;
          padding: 0 7px;
          margin: 0 3px;
          font-size: 10px;
          font-weight: 900;
          letter-spacing: -0.02em;
          line-height: 1;
          vertical-align: 1px;
          white-space: nowrap;
          box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.14), 0 6px 14px rgba(0, 0, 0, 0.18);
          backdrop-filter: blur(4px);
        }

        .simAdminTutorialCard p :global(.simAdminTutorialInlineButtonKakao),
        .simAdminTutorialTip :global(.simAdminTutorialInlineButtonKakao) {
          background: #fee500;
          color: #2f2500;
        }

        .simAdminTutorialTip {
          margin-top: 12px;
          border-radius: 16px;
          padding: 11px 12px;
          background: rgba(238, 224, 197, 0.1);
          border: 1px solid rgba(238, 224, 197, 0.14);
          color: #eee0c5;
          font-size: 13px;
          font-weight: 800;
          line-height: 1.5;
          word-break: keep-all;
        }

        .simAdminTutorialProgress {
          display: grid;
          grid-template-columns: repeat(${Math.max(totalSteps, 1)}, minmax(0, 1fr));
          gap: 5px;
          margin-top: 16px;
        }

        .simAdminTutorialProgress span {
          height: 5px;
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.12);
        }

        .simAdminTutorialProgress span.active {
          background: #eee0c5;
        }

        .simAdminTutorialActions {
          display: grid;
          grid-template-columns: 0.8fr 1.2fr;
          gap: 8px;
          margin-top: 16px;
        }

        .simAdminTutorialActions button.ghost {
          background: rgba(255, 255, 255, 0.08);
          color: #fff;
          border: 1px solid rgba(255, 255, 255, 0.13);
        }

        .simAdminTutorialActions button:disabled {
          opacity: 0.42;
          cursor: not-allowed;
        }

        @media (max-width: 640px) {
          .simAdminTutorialGuideButton {
            width: 78px;
            height: 78px;
            top: calc(env(safe-area-inset-top, 0px) + 8px);
            right: 8px;
          }

          .simAdminTutorialPromptCard {
            border-radius: 24px;
            padding: 20px 16px 16px;
          }

          .simAdminTutorialPromptIcon {
            width: 82px;
            height: 82px;
          }

          .simAdminTutorialPromptCard h2 {
            font-size: 21px;
          }

          .simAdminTutorialPromptCard p {
            font-size: 13px;
          }

          .simAdminTutorialCard {
            bottom: calc(var(--sim-admin-tutorial-bottom-mobile, 78px) + env(safe-area-inset-bottom));
            padding: 16px;
            border-radius: 22px;
          }

          .simAdminTutorialCard.isTop {
            top: calc(12px + env(safe-area-inset-top));
            bottom: auto;
          }

          .simAdminTutorialCard h2 {
            font-size: 20px;
          }

          .simAdminTutorialCard p {
            font-size: 13px;
          }
        }
      `}</style>
    </>
  );
}
