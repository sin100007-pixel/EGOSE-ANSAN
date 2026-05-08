import Image from "next/image";
import guideOnImage from "../../assets/guide-on.png";

type SimulatorCustomerGuideNoticeModalProps = {
  onClose: () => void;
};

export default function SimulatorCustomerGuideNoticeModal({
  onClose,
}: SimulatorCustomerGuideNoticeModalProps) {
  return (
    <div className="customerGuideOverlay" role="presentation" onClick={onClose}>
      <section
        className="customerGuideModal customerGuideNoticeModal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="customer-guide-notice-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="customerGuideTopRow">
          <div className="customerGuideBadge">가이드 안내</div>
          <button
            type="button"
            onClick={onClose}
            className="customerGuideClose"
            aria-label="안내 닫기"
          >
            ×
          </button>
        </div>

        <h3 id="customer-guide-notice-title" className="customerGuideTitle">
          가이드를 껐어요.
        </h3>

        <div className="customerGuideBody customerGuideNoticeBody">
          <div className="customerGuideNoticeImageWrap" aria-hidden="true">
            <Image
              src={guideOnImage}
              alt=""
              width={160}
              height={160}
              className="customerGuideNoticeImage"
              priority={false}
            />
          </div>

          <p className="customerGuideNoticeText">
            오른쪽 상단에 위 가이드 버튼을 누르시면 언제든 가이드를 다시 킬 수 있습니다.
          </p>
        </div>

        <button type="button" onClick={onClose} className="customerGuidePrimaryButton">
          알겠어요
        </button>
      </section>
    </div>
  );
}
