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
      <body>
        <PWAClient />
        {children}
      </body>
    </html>
  );
}