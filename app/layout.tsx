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

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body
        style={{
          background: "#000",   // ← 전체 배경 검정
          color: "#fff",        // ← 기본 텍스트 흰색
          minHeight: "100vh",
        }}
      >
        <PWAClient />
        {children}
      </body>
    </html>
  );
}