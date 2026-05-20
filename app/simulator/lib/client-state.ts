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
export type CustomerGuideStep = Extract<SimulatorStep, "intro" | "space" | "apply" | "decision">;

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

export type CustomerGuideInlinePart =
  | { type: "text"; text: string }
  | { type: "checker"; label?: string }
  | { type: "button"; label: string; variant?: "start" | "decision" };

export type CustomerGuideSectionLine = string | CustomerGuideInlinePart[];

export type CustomerGuideSection = {
  heading?: string;
  lines: CustomerGuideSectionLine[];
};

export type CustomerGuide = {
  stepLabel: string;
  title: string;
  body: CustomerGuideSection[];
  buttonLabel: string;
};

export const CUSTOMER_GUIDES: Record<CustomerGuideStep, CustomerGuide> = {
  intro: {
    stepLabel: "1단계 소개",
    title: "인테리어필름 시뮬레이터에 오신 걸 환영합니다.",
    body: [
      {
        lines: [
          "원하는 공간에 필름을 미리 적용해볼 수 있어요.",
          [
            { type: "text", text: "준비되셨다면 화면 가운데의 " },
            { type: "button", label: "시뮬레이션 시작", variant: "start" },
            { type: "text", text: " 버튼을 눌러주세요." },
          ],
        ],
      },
    ],
    buttonLabel: "알겠어요",
  },
  space: {
    stepLabel: "2단계 공간 선택",
    title: "시뮬레이션할 공간을 선택해주세요.",
    body: [
      {
        lines: [
          "원하는 공간 카드를 터치하면 그 공간에 인테리어 필름을 적용해볼 수 있습니다.",
        ],
      },
    ],
    buttonLabel: "공간 선택하러 가기",
  },
  apply: {
    stepLabel: "3단계 색상 적용",
    title: "색상 적용 방법을 안내드릴게요.",
    body: [
      {
        heading: "[구역선택]",
        lines: [
          [
            { type: "text", text: "이미지의 원하는 구역의 " },
            { type: "checker", label: "체크무늬" },
            { type: "text", text: "를 클릭" },
          ],
        ],
      },
      {
        heading: "[색상선택]",
        lines: [
          "팔레트에서 원하는 색을 누르면 그 색과 비슷한 필름을 모아서 보여드려요.",
        ],
      },
      {
        heading: "[결정확정]",
        lines: [
          [
            { type: "text", text: "마음에 드는 색을 찾으셨으면 하단에 " },
            { type: "button", label: "결정확정으로 넘어가기", variant: "decision" },
            { type: "text", text: " 버튼을 눌러주세요." },
          ],
        ],
      },
    ],
    buttonLabel: "색상 적용해보기",
  },
  decision: {
    stepLabel: "4단계 결정 확정",
    title: "선택한 결과를 확인합니다.",
    body: [
      {
        lines: ["선택한 결과를 확인하고 필요한 방법으로 문의해주세요."],
      },
    ],
    buttonLabel: "확인하기",
  },
};

export const CUSTOMER_GUIDE_STEPS: CustomerGuideStep[] = ["intro", "space", "apply", "decision"];
export const CUSTOMER_GUIDE_STORAGE_PREFIX = "egose-simulator-customer-guide-v1";
export const CUSTOMER_GUIDE_START_PROMPT_STORAGE_PREFIX = "egose-simulator-customer-guide-start-prompt-v1";
