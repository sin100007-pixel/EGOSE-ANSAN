import type { SimulatorSpace } from "../../types";
import {
  getSpaceThumbnail,
  readMaskZones,
  readPreviewAspectRatio,
} from "../../lib/client-utils";

type SimulatorSpaceStepProps = {
  spaces: SimulatorSpace[];
  selectedSpace: SimulatorSpace | null;
  onSelectSpace: (spaceId: string) => void;
};

export default function SimulatorSpaceStep({
  spaces,
  selectedSpace,
  onSelectSpace,
}: SimulatorSpaceStepProps) {
  return (
    <section className="spaceSelectCard">
      <div className="sectionHeader">
        <div>
          <div className="sectionLabel">공간 선택</div>
          <h2 className="sectionTitle">어디에 필름을 적용해볼까요?</h2>
        </div>
        <div className="spaceCount">{spaces.length || 0}개 공간</div>
      </div>

      <div className="spaceGrid">
        {spaces.length > 0 ? (
          spaces.map((space) => {
            const thumbnail = getSpaceThumbnail(space);
            const active = selectedSpace?.id === space.id;
            const thumbZones = readMaskZones(space);
            const thumbAspectRatio = readPreviewAspectRatio(space);
            const hasSceneThumb = Boolean(space.base_image_url || space.overlay_image_url);

            return (
              <button
                key={space.id}
                type="button"
                onClick={() => onSelectSpace(space.id)}
                className={`spaceCard ${active ? "spaceCardActive" : ""}`}
              >
                <div className="spaceThumb" style={{ aspectRatio: thumbAspectRatio }}>
                  {hasSceneThumb ? (
                    <div className="spaceThumbStage">
                      {thumbZones.map((zone) => (
                        <div
                          key={zone.key}
                          aria-hidden="true"
                          className="spaceThumbCheckerLayer"
                          style={{
                            WebkitMaskImage: `url("${zone.mask_url}")`,
                            maskImage: `url("${zone.mask_url}")`,
                          }}
                        />
                      ))}

                      {space.base_image_url ? (
                        <img src={space.base_image_url} alt="공간 원본" className="spaceThumbBaseImage" />
                      ) : null}

                      {space.overlay_image_url ? (
                        <img src={space.overlay_image_url} alt={space.name} className="spaceThumbOverlayImage" />
                      ) : null}
                    </div>
                  ) : thumbnail ? (
                    <img src={thumbnail} alt={space.name} />
                  ) : (
                    <div className="spaceThumbEmpty">이미지 준비중</div>
                  )}
                </div>

                <div className="spaceInfo">
                  <div>
                    <div className="spaceName">{space.name}</div>
                    <div className="spaceDesc">{space.description || "선택하면 색상 적용 화면으로 이동합니다."}</div>
                  </div>

                  <span className="spaceGoBadge">선택</span>
                </div>
              </button>
            );
          })
        ) : (
          <div className="emptyFilmBox">등록된 공간이 없습니다.</div>
        )}
      </div>
    </section>
  );
}
