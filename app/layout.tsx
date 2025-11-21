import type { Metadata, Viewport } from "next";
import { Suspense } from "react";
import PWAClient from "./pwa-client";
import SessionHydrator from "./components/SessionHydrator";
import PageViewTracker from "./components/PageViewTracker";

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#111827" },
    { media: "(prefers-color-scheme: dark)", color: "#111827" },
  ],
};

export const metadata: Metadata = {
  title: "EGOSE QR",
  description: "고객 전용 QR 코드 뷰어",
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192" },
      { url: "/icons/icon-512.png", sizes: "512x512" },
    ],
    apple: [{ url: "/icons/icon-192.png" }],
  },
};

const BG_DARK = "#0F0C2E";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <body
        style={{
          background: BG_DARK,
          color: "#fff",
          minHeight: "100vh",
          margin: 0,
        }}
      >
        {/* PWA 설치 버튼/힌트 + 세션 자동복구 */}
        <PWAClient />
        <SessionHydrator />

        {/* ✅ useSearchParams 사용하는 PageViewTracker 는 Suspense 로 감싸기 */}
        <Suspense fallback={null}>
          <PageViewTracker />
        </Suspense>

        {children}
      </body>
    </html>
  );
}
