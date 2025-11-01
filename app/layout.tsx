import SWRegister from './sw-register';
export const metadata = { title: "Customer QR Login" };
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <head>
        <link rel="manifest" href="/manifest.webmanifest" />
        <meta name="theme-color" content="#0b1220" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <link rel="apple-touch-icon" href="/icons/icon-192.png" />
      </head>
      <body style={{ fontFamily: "ui-sans-serif, system-ui", padding: 20, background: "#0b1220", color: "#fff" }}>
        <div style={{ maxWidth: 520, margin: "0 auto" }}>{children}</div>
        <SWRegister />
      </body>
    </html>
  );
}
