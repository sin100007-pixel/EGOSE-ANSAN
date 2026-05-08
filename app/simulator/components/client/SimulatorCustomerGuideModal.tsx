import type { CustomerGuide, CustomerGuideSectionLine } from "../../lib/client-state";

type SimulatorCustomerGuideModalProps = {
  guide: CustomerGuide;
  onClose: () => void;
  onDisable: () => void;
};

function renderGuideLine(line: CustomerGuideSectionLine) {
  if (typeof line === "string") {
    return line;
  }

  return line.map((part, index) => {
    if (part.type === "checker") {
      return (
        <span key={`checker-${index}`} className="customerGuideCheckerInline">
          <span className="customerGuideCheckerDot" aria-hidden="true" />
          <span>{part.label ?? "체크무늬"}</span>
        </span>
      );
    }

    if (part.type === "button") {
      const buttonVariantClass =
        part.variant === "start"
          ? "customerGuideInlineActionStart"
          : part.variant === "decision"
            ? "customerGuideInlineActionDecision"
            : "";

      return (
        <span
          key={`button-${index}`}
          className={`customerGuideInlineAction ${buttonVariantClass}`.trim()}
          aria-hidden="true"
        >
          {part.label}
        </span>
      );
    }

    return <span key={`text-${index}`}>{part.text}</span>;
  });
}

export default function SimulatorCustomerGuideModal({
  guide,
  onClose,
  onDisable,
}: SimulatorCustomerGuideModalProps) {
  return (
    <div className="customerGuideOverlay" role="presentation" onClick={onClose}>
      <section
        className="customerGuideModal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="customer-guide-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="customerGuideTopRow">
          <div className="customerGuideBadge">고객 사용 가이드 · {guide.stepLabel}</div>
          <button
            type="button"
            onClick={onClose}
            className="customerGuideClose"
            aria-label="가이드 닫기"
          >
            ×
          </button>
        </div>

        <h3 id="customer-guide-title" className="customerGuideTitle">
          {guide.title}
        </h3>

        <div className="customerGuideBody">
          {guide.body.map((section, sectionIndex) => (
            <div key={`${guide.stepLabel}-${sectionIndex}`} className="customerGuideSection">
              {section.heading ? (
                <div className="customerGuideSectionTitle">{section.heading}</div>
              ) : null}

              <div className="customerGuideSectionLines">
                {section.lines.map((line, lineIndex) => (
                  <p key={`${guide.stepLabel}-${sectionIndex}-${lineIndex}`}>{renderGuideLine(line)}</p>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="customerGuideActions">
          <button type="button" onClick={onClose} className="customerGuidePrimaryButton">
            {guide.buttonLabel}
          </button>

          <button type="button" onClick={onDisable} className="customerGuideSecondaryButton">
            다시 보지 않기
          </button>
        </div>
      </section>
    </div>
  );
}
