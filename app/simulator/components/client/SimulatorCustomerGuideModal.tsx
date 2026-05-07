type CustomerGuide = {
  stepLabel: string;
  title: string;
  body: string[];
  buttonLabel: string;
};

type SimulatorCustomerGuideModalProps = {
  guide: CustomerGuide;
  onClose: () => void;
};

export default function SimulatorCustomerGuideModal({ guide, onClose }: SimulatorCustomerGuideModalProps) {
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
          {guide.body.map((line) => (
            <p key={line}>{line}</p>
          ))}
        </div>

        <button type="button" onClick={onClose} className="customerGuidePrimaryButton">
          {guide.buttonLabel}
        </button>
      </section>
    </div>
  );
}
