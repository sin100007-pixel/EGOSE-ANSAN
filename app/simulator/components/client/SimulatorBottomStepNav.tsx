type SimulatorStep = "intro" | "space" | "apply" | "decision";

type SimulatorBottomStepNavProps = {
  step: SimulatorStep;
  hasIntroStep: boolean;
  onIntro: () => void;
  onSpace: () => void;
  onApply: () => void;
  onDecision: () => void;
};

export default function SimulatorBottomStepNav({
  step,
  hasIntroStep,
  onIntro,
  onSpace,
  onApply,
  onDecision,
}: SimulatorBottomStepNavProps) {
  return (
    <nav
      className={`bottomStepNav ${hasIntroStep ? "bottomStepNavFour" : ""}`}
      aria-label="시뮬레이터 단계 이동"
      data-sim-admin-guide="customer-bottom-step-nav"
    >
      {hasIntroStep ? (
        <button
          type="button"
          onClick={onIntro}
          className={step === "intro" ? "bottomStepButtonActive" : ""}
        >
          <span>1</span>
          소개
        </button>
      ) : null}

      <button
        type="button"
        onClick={onSpace}
        className={step === "space" ? "bottomStepButtonActive" : ""}
      >
        <span>{hasIntroStep ? 2 : 1}</span>
        공간선택
      </button>

      <button
        type="button"
        onClick={onApply}
        className={step === "apply" ? "bottomStepButtonActive" : ""}
      >
        <span>{hasIntroStep ? 3 : 2}</span>
        색상적용
      </button>

      <button
        type="button"
        onClick={onDecision}
        className={step === "decision" ? "bottomStepButtonActive" : ""}
      >
        <span>{hasIntroStep ? 4 : 3}</span>
        결정확정
      </button>
    </nav>
  );
}
