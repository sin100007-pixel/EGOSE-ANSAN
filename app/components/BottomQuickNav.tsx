"use client";

import React, { useEffect, useState } from "react";
import ProductToggle from "@/app/components/ProductToggle";
import InstallButton from "@/app/components/InstallButton";

type BottomQuickNavProps = {
  current?: "dashboard" | "ledger" | "filmbot";
};

function LedgerIcon() {
  return (
    <svg viewBox="0 0 24 24" width="24" height="24" fill="none" aria-hidden="true">
      <rect x="5" y="3.5" width="14" height="17" rx="2.8" stroke="currentColor" strokeWidth="1.9" />
      <line x1="8" y1="8" x2="16" y2="8" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
      <line x1="8" y1="12" x2="16" y2="12" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
      <line x1="8" y1="16" x2="13" y2="16" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
    </svg>
  );
}

function KakaoTalkLikeIcon() {
  return (
    <svg viewBox="0 0 24 24" width="24" height="24" fill="none" aria-hidden="true">
      <path
        d="M12 4.5c-4.7 0-8.5 3-8.5 6.8 0 2.4 1.5 4.5 3.9 5.7l-.8 3.2 3.5-2.2c.6.1 1.2.2 1.9.2 4.7 0 8.5-3 8.5-6.9S16.7 4.5 12 4.5Z"
        fill="currentColor"
      />
      <text
        x="12"
        y="13.1"
        textAnchor="middle"
        fontSize="4.2"
        fontWeight="800"
        fill="#F5E6A1"
        fontFamily="Arial, sans-serif"
      >
        TALK
      </text>
    </svg>
  );
}

function QrCodeIcon() {
  return (
    <svg viewBox="0 0 24 24" width="24" height="24" fill="none" aria-hidden="true">
      <rect x="4" y="4" width="6" height="6" rx="1.1" stroke="currentColor" strokeWidth="1.9" />
      <rect x="14" y="4" width="6" height="6" rx="1.1" stroke="currentColor" strokeWidth="1.9" />
      <rect x="4" y="14" width="6" height="6" rx="1.1" stroke="currentColor" strokeWidth="1.9" />
      <path d="M14 14h2v2h-2zM18 14h2v2h-2zM16 16h2v2h-2zM14 18h2v2h-2zM18 18h2v2h-2z" fill="currentColor" />
    </svg>
  );
}

function InstallIcon() {
  return (
    <svg viewBox="0 0 24 24" width="24" height="24" fill="none" aria-hidden="true">
      <path
        d="M12 4v9m0 0 3.5-3.5M12 13 8.5 9.5M5 16.5v1.2A2.3 2.3 0 0 0 7.3 20h9.4a2.3 2.3 0 0 0 2.3-2.3v-1.2"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function BottomItem({
  href,
  label,
  icon,
  target,
  rel,
  active = false,
}: {
  href: string;
  label: string;
  icon: React.ReactNode;
  target?: string;
  rel?: string;
  active?: boolean;
}) {
  return (
    <a
      href={href}
      target={target}
      rel={rel}
      style={{
        textDecoration: "none",
        color: active ? "#111111" : "#1B1B1B",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 6,
        minHeight: 74,
        borderRadius: 18,
        padding: "10px 6px",
        boxSizing: "border-box",
        background: active ? "rgba(255,255,255,0.34)" : "transparent",
      }}
    >
      <div
        style={{
          width: 28,
          height: 28,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#2A2A2A",
        }}
      >
        {icon}
      </div>
      <div
        style={{
          fontSize: 12,
          fontWeight: 800,
          lineHeight: 1.1,
          letterSpacing: "-0.02em",
          textAlign: "center",
          whiteSpace: "nowrap",
        }}
      >
        {label}
      </div>
    </a>
  );
}

export default function BottomQuickNav({ current = "dashboard" }: BottomQuickNavProps) {
  const COLORS = {
    cream: "#F5F1E8",
    creamStrong: "#EEDFC6",
    badge: "#FF6E86",
  };

  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    const checkInstalled = () => {
      const standalone =
        window.matchMedia?.("(display-mode: standalone)")?.matches ||
        (window.navigator as Navigator & { standalone?: boolean }).standalone === true;
      setIsInstalled(Boolean(standalone));
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
    };

    checkInstalled();
    window.addEventListener("appinstalled", handleAppInstalled);
    return () => {
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  return (
    <div
      style={{
        position: "fixed",
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 40,
        pointerEvents: "none",
      }}
    >
      <div
        style={{
          maxWidth: 460,
          margin: "0 auto",
          padding: "0 10px calc(0px + env(safe-area-inset-bottom))",
          pointerEvents: "auto",
        }}
      >
        <div
          style={{
            position: "relative",
            background: COLORS.cream,
            borderRadius: "28px 28px 0 0",
            border: "1px solid rgba(0,0,0,0.06)",
            boxShadow: "0 -10px 28px rgba(0,0,0,0.24)",
            padding: isInstalled
              ? "14px 8px calc(12px + env(safe-area-inset-bottom))"
              : "16px 8px calc(16px + env(safe-area-inset-bottom))",
            overflow: "visible",
          }}
        >
          <a
            href="/product-test"
            aria-label="필름봇 페이지로 이동"
            style={{
              position: "absolute",
              left: "50%",
              top: -40,
              transform: "translateX(-50%)",
              width: 96,
              height: 96,
              borderRadius: "50%",
              background: COLORS.creamStrong,
              border: "4px solid #FFFFFF",
              boxShadow: "0 12px 24px rgba(0,0,0,0.20)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              textDecoration: "none",
              zIndex: 3,
            }}
          >
            <div
              style={{
                position: "absolute",
                top: -2,
                right: -2,
                padding: "4px 8px",
                borderRadius: 999,
                background: COLORS.badge,
                color: "#fff",
                fontSize: 10,
                fontWeight: 900,
                lineHeight: 1,
                letterSpacing: "0.04em",
                border: "2px solid #fff",
              }}
            >
              NEW
            </div>

            <img
              src="/filmbot-button.png"
              alt="필름봇"
              style={{
                display: "block",
                width: 58,
                height: "auto",
                objectFit: "contain",
              }}
            />
          </a>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr 100px 1fr 1fr",
              gap: 2,
              alignItems: "end",
            }}
          >
            <BottomItem href="/ledger" label="거래내역" icon={<LedgerIcon />} active={current === "ledger"} />

            <BottomItem
              href="http://pf.kakao.com/_IxgdJj/chat"
              target="_blank"
              rel="noreferrer"
              label="문의"
              icon={<KakaoTalkLikeIcon />}
            />

            {isInstalled ? (
              <div aria-hidden="true" style={{ height: 1 }} />
            ) : (
              <InstallButton
                aria-label="앱 설치"
                style={{
                  width: "100%",
                  minHeight: 96,
                  border: "none",
                  background: "transparent",
                  color: "#4A4030",
                  boxShadow: "none",
                  padding: "42px 4px 6px",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "flex-end",
                  gap: 4,
                  fontWeight: 900,
                  fontSize: 12,
                  lineHeight: 1.05,
                  letterSpacing: "-0.02em",
                  textAlign: "center",
                  cursor: "pointer",
                }}
              >
                <span
                  style={{
                    width: 20,
                    height: 20,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#4A4030",
                  }}
                >
                  <InstallIcon />
                </span>
                앱 설치
              </InstallButton>
            )}

            <ProductToggle bottomNav />

            <BottomItem
              href={current === "dashboard" ? "#user-qr-card" : "/dashboard#user-qr-card"}
              label="QR코드"
              icon={<QrCodeIcon />}
              active={current === "dashboard"}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
