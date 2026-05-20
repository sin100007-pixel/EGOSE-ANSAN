import Image from "next/image";
import guideOnImage from "../../assets/guide-on.png";

type SimulatorCustomerGuidePromptModalProps = {
  onStart: () => void;
  onSkip: () => void;
};

export default function SimulatorCustomerGuidePromptModal({
  onStart,
  onSkip,
}: SimulatorCustomerGuidePromptModalProps) {
  return (
    <div className="customerGuideOverlay" role="presentation">
      <section
        className="customerGuideModal customerGuidePromptModal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="customer-guide-prompt-title"
      >
        <div className="customerGuidePromptImageWrap" aria-hidden="true">
          <Image
            src={guideOnImage}
            alt=""
            width={160}
            height={160}
            className="customerGuidePromptImage"
            priority={false}
          />
        </div>

        <div className="customerGuideBadge customerGuidePromptBadge">사용설명 안내</div>

        <h3 id="customer-guide-prompt-title" className="customerGuideTitle customerGuidePromptTitle">
          필름시뮬레이터 사용설명을 들으시겠습니까?
        </h3>

        <p className="customerGuidePromptText">
          처음 사용하시면 가이드를 보면서 순서대로 따라가실 수 있습니다.
        </p>

        <div className="customerGuidePromptActions">
          <button type="button" onClick={onSkip} className="customerGuidePromptGhostButton">
            필요없어요
          </button>
          <button type="button" onClick={onStart} className="customerGuidePrimaryButton">
            들을게요
          </button>
        </div>
      </section>
    </div>
  );
}
