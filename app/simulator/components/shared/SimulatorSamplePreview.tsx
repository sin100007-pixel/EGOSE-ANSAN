"use client";

import type { SimulatorFilm } from "../../types";
import { getFilmCode, getFilmName } from "./SimulatorFilmResultCard";

type SimulatorSamplePreviewProps = {
  film: SimulatorFilm | null;
  onClose: () => void;
};

export default function SimulatorSamplePreview({ film, onClose }: SimulatorSamplePreviewProps) {
  if (!film?.sample_url) return null;

  return (
    <div className="sampleBubbleBackdrop" onClick={onClose}>
      <div className="sampleBubble" onClick={(event) => event.stopPropagation()}>
        <button type="button" onClick={onClose} className="sampleBubbleClose">
          닫기
        </button>

        <div className="sampleBubbleLabel">필름봇 샘플사진</div>
        <div className="sampleBubbleTitle">{getFilmName(film)}</div>

        {getFilmCode(film) ? <div className="sampleBubbleCode">{getFilmCode(film)}</div> : null}

        <div className="sampleBubbleImageWrap">
          <img src={film.sample_url} alt={`${getFilmName(film)} 샘플사진`} loading="lazy" decoding="async" />
        </div>

        <p className="sampleBubbleText">
          실제 확대 질감을 참고할 수 있도록 필름봇용 샘플사진을 보여드리고 있어요.
        </p>
      </div>
    </div>
  );
}
