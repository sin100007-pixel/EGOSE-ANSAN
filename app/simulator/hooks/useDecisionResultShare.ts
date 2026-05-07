"use client";

import { useRef, useState } from "react";
import { toPng } from "html-to-image";
import type { SimulatorFilm, SimulatorLinkInfo, SimulatorSpace } from "../types";
import type { MaskZoneDefinition } from "../lib/client-utils";
import { getFilmName } from "../lib/client-utils";
import type { COLORS } from "../lib/client-state";

type UseDecisionResultShareArgs = {
  selectedSpace: SimulatorSpace | null;
  link: SimulatorLinkInfo | null;
  maskZones: MaskZoneDefinition[];
  zoneFilmMap: Record<string, SimulatorFilm | null>;
  hasFabricWarning: boolean;
  colors: typeof COLORS;
};

export function useDecisionResultShare({
  selectedSpace,
  link,
  maskZones,
  zoneFilmMap,
  hasFabricWarning,
  colors,
}: UseDecisionResultShareArgs) {
  const decisionExportRef = useRef<HTMLDivElement | null>(null);
  const [decisionMessage, setDecisionMessage] = useState("");
  const [isDecisionSharing, setIsDecisionSharing] = useState(false);

  const buildDecisionText = () => {
    const lines = [
      "필름 시뮬레이션 결정 결과",
      selectedSpace ? `공간: ${selectedSpace.name}` : "",
      link?.installer_name ? `시공자: ${link.installer_name}` : "",
      "",
      ...maskZones.map((zone) => {
        const film = zoneFilmMap[zone.key];
        return `${zone.label}: ${film ? getFilmName(film) : "미선택"}`;
      }),
    ].filter(Boolean);

    if (hasFabricWarning) {
      lines.push(
        "",
        "선택된 필름에 패브릭필름이 있습니다. 시뮬레이션상 불가피하게 왜곡이 심한 종류이므로 주의 부탁드립니다.",
      );
    }

    return lines.join("\n");
  };

  const downloadDataUrl = (dataUrl: string, fileName: string) => {
    const linkElement = document.createElement("a");
    linkElement.href = dataUrl;
    linkElement.download = fileName;
    document.body.appendChild(linkElement);
    linkElement.click();
    document.body.removeChild(linkElement);
  };

  const createDecisionResultImage = async () => {
    if (!decisionExportRef.current) {
      throw new Error("이미지로 저장할 영역을 찾을 수 없습니다.");
    }

    return toPng(decisionExportRef.current, {
      cacheBust: true,
      pixelRatio: 2,
      backgroundColor: colors.bg,
    });
  };

  const shareDecisionResult = async () => {
    const text = buildDecisionText();
    const fileName = `simulation-result-${new Date().toISOString().slice(0, 10)}.png`;

    setDecisionMessage("");
    setIsDecisionSharing(true);

    try {
      const dataUrl = await createDecisionResultImage();

      try {
        const response = await fetch(dataUrl);
        const blob = await response.blob();
        const file = new File([blob], fileName, { type: "image/png" });

        if (
          typeof navigator !== "undefined" &&
          "share" in navigator &&
          typeof navigator.canShare === "function" &&
          navigator.canShare({ files: [file] })
        ) {
          await navigator.share({
            files: [file],
            title: "필름 시뮬레이션 결정 결과",
            text,
          });
          setDecisionMessage("결정 결과 이미지와 내용을 전송했습니다.");
          return;
        }
      } catch {
        // 파일 공유가 되지 않으면 아래 텍스트 공유/복사 흐름으로 진행합니다.
      }

      if (navigator.share) {
        await navigator.share({
          title: "필름 시뮬레이션 결정 결과",
          text,
        });
        downloadDataUrl(dataUrl, fileName);
        setDecisionMessage("결정 결과 문구를 전송했고, 이미지는 파일로 저장했습니다.");
        return;
      }

      await navigator.clipboard.writeText(text);
      downloadDataUrl(dataUrl, fileName);
      setDecisionMessage("결정 결과를 복사했고, 이미지는 파일로 저장했습니다. 문자, 메신저로 붙여넣어 전송해주세요.");
    } catch {
      try {
        await navigator.clipboard.writeText(text);
        setDecisionMessage("결정 결과를 복사했습니다. 이미지는 저장하지 못했습니다. 문자, 메신저로 붙여넣어 전송해주세요.");
      } catch {
        setDecisionMessage("전송에 실패했습니다. 화면의 결과를 캡쳐해서 보내주세요.");
      }
    } finally {
      setIsDecisionSharing(false);
    }
  };

  return {
    decisionExportRef,
    decisionMessage,
    setDecisionMessage,
    isDecisionSharing,
    shareDecisionResult,
  };
}
