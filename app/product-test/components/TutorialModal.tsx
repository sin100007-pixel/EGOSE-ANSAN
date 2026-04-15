"use client";

import { BROWN, TEXT_SUB, THEME_COLOR } from "../constants";

type TutorialStep = {
  icon: string;
  title: string;
  description: string;
  tip: string;
  actionLabel: string | null;
  onAction: (() => void) | null;
};

type TutorialModalProps = {
  isOpen: boolean;
  tutorialStep: number;
  tutorialSteps: readonly TutorialStep[];
  onClose: () => void;
  onStepChange: (index: number) => void;
  onNext: () => void;
};

export default function TutorialModal({
  isOpen,
  tutorialStep,
  tutorialSteps,
  onClose,
  onStepChange,
  onNext,
}: TutorialModalProps) {
  if (!isOpen) return null;

  const currentTutorial = tutorialSteps[tutorialStep];
  if (!currentTutorial) return null;

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0, 0, 0, 0.72)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 18,
        zIndex: 9800,
        backdropFilter: "blur(6px)",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "min(560px, 100%)",
          borderRadius: 28,
          padding: "22px 20px 18px",
          background:
            "linear-gradient(180deg, rgba(12,10,72,0.98) 0%, rgba(5,2,59,0.99) 100%)",
          border: "1px solid rgba(238,224,197,0.16)",
          boxShadow: "0 24px 60px rgba(0,0,0,0.38)",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: 14,
            marginBottom: 16,
          }}
        >
          <div>
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                borderRadius: 999,
                padding: "7px 11px",
                background: "rgba(238,224,197,0.10)",
                color: THEME_COLOR,
                fontSize: 13,
                fontWeight: 800,
                marginBottom: 12,
              }}
            >
              <span>{currentTutorial.icon}</span>
              <span>필름봇 튜토리얼</span>
            </div>

            <div
              style={{
                color: "#fff",
                fontSize: 26,
                fontWeight: 900,
                lineHeight: 1.3,
                wordBreak: "keep-all",
                marginBottom: 10,
              }}
            >
              {currentTutorial.title}
            </div>

            <div
              style={{
                color: TEXT_SUB,
                fontSize: 15,
                lineHeight: 1.75,
                wordBreak: "keep-all",
              }}
            >
              {currentTutorial.description}
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="튜토리얼 닫기"
            style={{
              width: 40,
              height: 40,
              borderRadius: 999,
              border: "1px solid rgba(238,224,197,0.16)",
              background: "rgba(255,255,255,0.05)",
              color: "#fff",
              fontSize: 20,
              cursor: "pointer",
              flexShrink: 0,
            }}
          >
            ×
          </button>
        </div>

        <div
          style={{
            borderRadius: 22,
            padding: "16px 16px",
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(238,224,197,0.10)",
            marginBottom: 16,
          }}
        >
          <div
            style={{
              color: THEME_COLOR,
              fontSize: 13,
              fontWeight: 800,
              marginBottom: 8,
            }}
          >
            이렇게 사용하면 편해요
          </div>
          <div
            style={{
              color: "#fff",
              fontSize: 14,
              lineHeight: 1.75,
              wordBreak: "keep-all",
            }}
          >
            {currentTutorial.tip}
          </div>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            marginBottom: 18,
            flexWrap: "wrap",
          }}
        >
          {tutorialSteps.map((step, index) => (
            <button
              key={step.title}
              type="button"
              onClick={() => onStepChange(index)}
              aria-label={`${index + 1}단계로 이동`}
              style={{
                width: index === tutorialStep ? 34 : 10,
                height: 10,
                borderRadius: 999,
                border: "none",
                background:
                  index === tutorialStep ? THEME_COLOR : "rgba(255,255,255,0.18)",
                cursor: "pointer",
                transition: "all 0.18s ease",
                padding: 0,
              }}
            />
          ))}
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
            flexWrap: "wrap",
          }}
        >
          <div
            style={{
              color: TEXT_SUB,
              fontSize: 13,
              fontWeight: 700,
            }}
          >
            {tutorialStep + 1} / {tutorialSteps.length}
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              flexWrap: "wrap",
              justifyContent: "flex-end",
            }}
          >
            {currentTutorial.actionLabel && currentTutorial.onAction && (
              <button
                type="button"
                className="tutorialLinkButton"
                onClick={() => currentTutorial.onAction?.()}
                style={{
                  border: "1px solid rgba(238,224,197,0.18)",
                  borderRadius: 999,
                  padding: "10px 14px",
                  background: "rgba(255,255,255,0.05)",
                  color: THEME_COLOR,
                  fontSize: 14,
                  fontWeight: 800,
                  cursor: "pointer",
                }}
              >
                {currentTutorial.actionLabel}
              </button>
            )}

            <button
              type="button"
              className="tutorialLinkButton"
              onClick={onNext}
              style={{
                border: "1px solid rgba(238,224,197,0.18)",
                borderRadius: 999,
                padding: "10px 16px",
                background: THEME_COLOR,
                color: BROWN,
                fontSize: 14,
                fontWeight: 900,
                cursor: "pointer",
              }}
            >
              {tutorialStep === tutorialSteps.length - 1 ? "튜토리얼 끝내기" : "다음"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
