import type { SimulatorFilm, SimulatorSpace } from "../../types";
import type { MaskZoneDefinition } from "../../lib/client-utils";
import { getFilmName } from "../../lib/client-utils";

type SimulatorDecisionStepProps = {
  selectedSpace: SimulatorSpace | null;
  maskZones: MaskZoneDefinition[];
  zoneFilmMap: Record<string, SimulatorFilm | null>;
  hasFabricWarning: boolean;
  kakaoHref: string;
  decisionMessage: string;
  isDecisionSharing: boolean;
  onBackToApply: () => void;
  onShareDecisionResult: () => void;
};

export default function SimulatorDecisionStep({
  selectedSpace,
  maskZones,
  zoneFilmMap,
  hasFabricWarning,
  kakaoHref,
  decisionMessage,
  isDecisionSharing,
  onBackToApply,
  onShareDecisionResult,
}: SimulatorDecisionStepProps) {
  return (
    <section className="decisionCard">
      <div className="applyTopRow">
        <div>
          <div className="sectionLabel">결정 확정</div>
          <h2 className="spaceTitle">선택 결과 확인</h2>
        </div>

        <button type="button" onClick={onBackToApply} className="changeSpaceButton">
          색상 다시 선택
        </button>
      </div>

      <div className="decisionSummary">
        <div className="decisionSpaceName">{selectedSpace?.name || "공간 없음"}</div>

        <div className="decisionZoneList">
          {maskZones.map((zone) => {
            const film = zoneFilmMap[zone.key] || null;

            return (
              <div key={zone.key} className="decisionZoneItem">
                <span>{zone.label}</span>
                <strong>{film ? getFilmName(film) : "미선택"}</strong>
              </div>
            );
          })}
        </div>

        {hasFabricWarning ? (
          <div className="decisionFabricWarning">
            선택된 필름에 패브릭필름이 있습니다. 시뮬레이션상 불가피하게 왜곡이 심한 종류이므로 주의 부탁드립니다.
          </div>
        ) : null}
      </div>

      <div className="decisionActionGrid">
        <section className="decisionActionCard">
          <div className="decisionActionIcon">1</div>
          <h3>결정 결과 전송</h3>
          <p>
            선택한 구역별 필름 결과를 보낼 수 있습니다. 휴대폰에서는 공유창이 열리고, 지원하지 않는 경우 결과가 복사됩니다.
          </p>
          <button
            type="button"
            onClick={onShareDecisionResult}
            className="primaryDecisionButton"
            disabled={isDecisionSharing}
          >
            {isDecisionSharing ? "전송 준비 중..." : "시뮬레이션 결과 전송"}
          </button>
          {decisionMessage ? <div className="decisionMessage">{decisionMessage}</div> : null}
        </section>

        <section className="decisionActionCard">
          <div className="decisionActionIcon">2</div>
          <h3>샘플 안내</h3>
          <p>
            거래처의 매장에 방문하시면 필름 실물을 보실수 있고, 샘플 받을 수있도록 준비해놨습니다.
          </p>
          <div className="storeInfoBox">
            <strong>이고세(주)</strong>
            <span>경기도 안산시 상록구 안산천서로 237 1층 안산이고세</span>
            <span>Tel. 031-486-6882</span>
          </div>
        </section>

        <section className="decisionActionCard">
          <div className="decisionActionIcon">3</div>
          <h3>카카오톡 문의</h3>
          <p>
            궁금하신게 있으시면 카카오톡으로 연락주세요.
          </p>
          {kakaoHref ? (
            <a
              href={kakaoHref}
              target="_blank"
              rel="noopener noreferrer"
              className="primaryDecisionButton"
            >
              카카오톡 문의하기
            </a>
          ) : (
            <button type="button" className="primaryDecisionButton" disabled>
              카카오톡 링크 준비중
            </button>
          )}
        </section>
      </div>
    </section>
  );
}
