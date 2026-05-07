import type { ContractorProfile, SimulatorFilm, SimulatorLinkInfo, SimulatorSpace } from "../types";

export type SimulatorMode = "installer" | "customer";

export type BootstrapState = {
  loading: boolean;
  setupNeeded: boolean;
  expired: boolean;
  message: string;
  spaces: SimulatorSpace[];
  films: SimulatorFilm[];
  link: SimulatorLinkInfo | null;
  contractor: ContractorProfile | null;
};

export type SimulatorStep = "intro" | "space" | "apply" | "decision";
export type CustomerGuideStep = Extract<SimulatorStep, "intro" | "space" | "apply">;

export const COLORS = {
  bg: "#05023B",
  panel: "rgba(12,10,72,0.72)",
  panelStrong: "rgba(10,8,72,0.94)",
  cream: "#EEE0C5",
  creamText: "#7A5A34",
  line: "rgba(238,224,197,0.16)",
  soft: "rgba(255,255,255,0.70)",
  white: "#FFFFFF",
};

export const INITIAL_BOOTSTRAP_STATE: BootstrapState = {
  loading: true,
  setupNeeded: false,
  expired: false,
  message: "",
  spaces: [],
  films: [],
  link: null,
  contractor: null,
};

export type CustomerGuide = {
  stepLabel: string;
  title: string;
  body: string[];
  buttonLabel: string;
};

export const CUSTOMER_GUIDES: Record<CustomerGuideStep, CustomerGuide> = {
  intro: {
    stepLabel: "1단계 소개",
    title: "인테리어필름 시뮬레이터에 오신 걸 환영합니다.",
    body: [
      "원하는 공간에 필름을 미리 적용해볼 수 있어요.",
      "준비되셨다면 화면 가운데의 [시뮬레이션 시작] 버튼을 눌러주세요.",
    ],
    buttonLabel: "알겠어요",
  },
  space: {
    stepLabel: "2단계 공간 선택",
    title: "시뮬레이션할 공간을 선택해주세요.",
    body: [
      "원하는 공간 카드를 터치하면 그 공간에 인테리어 필름을 적용해볼 수 있습니다.",
    ],
    buttonLabel: "공간 선택하러 가기",
  },
  apply: {
    stepLabel: "3단계 색상 적용",
    title: "먼저 필름을 적용할 구역을 선택해주세요.",
    body: [
      "이미지 아래의 구역 버튼을 누르면 색상 목록이 열립니다.",
      "색상 팔레트에서 원하는 색을 고르면 비슷한 필름을 모아서 보여드려요.",
      "마음에 드는 색을 적용했다면 화면 하단의 [결정확정] 버튼을 눌러주세요.",
    ],
    buttonLabel: "색상 적용해보기",
  },
};

export const CUSTOMER_GUIDE_STEPS: CustomerGuideStep[] = ["intro", "space", "apply"];
export const CUSTOMER_GUIDE_STORAGE_PREFIX = "egose-simulator-customer-guide-v1";
