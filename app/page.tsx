import type { Metadata } from "next";
import PWAClient from "./pwa-client";

export const metadata: Metadata = {
  title: "EGOSE QR",
  description: "고객 전용 QR 코드 뷰어",
  themeColor: "#111827",
  manifest: "/manifest.json",
  icons: {
    icon: [{ url: "/icons/icon-192.png", sizes: "192x192" }],
    apple: [{ url: "/icons/icon-180.png", sizes: "180x180" }],
  },
};

// 컬러 지정 (첫번째/두번째 이미지에 맞춘 값)
const BG_DARK = "#0F0C2E";   // 아주 어두운 남보라(배경)
const BTN_BLUE = "#0019C9";  // 진한 로열블루(버튼)

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body
        style={{
          background: BG_DARK, // 배경 = 첫 번째 색
          color: "#fff",       // 기본 글자 흰색
          minHeight: "100vh",
          margin: 0,
        }}
      >
        <PWAClient />
        {children}
      </body>
    </html>
  );
}