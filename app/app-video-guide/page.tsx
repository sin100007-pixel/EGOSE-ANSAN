import type { Metadata } from "next";
import AppVideoGuideClient from "./AppVideoGuideClient";

export const metadata: Metadata = {
  title: "이고세 앱 사용법",
  description: "이고세 앱 주요 기능을 영상으로 확인하는 안내 페이지입니다.",
};

export default function AppVideoGuidePage() {
  return <AppVideoGuideClient />;
}
