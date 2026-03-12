"use client";

import {
  ButtonHTMLAttributes,
  ReactNode,
  useEffect,
  useMemo,
  useState,
} from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

declare global {
  interface WindowEventMap {
    beforeinstallprompt: BeforeInstallPromptEvent;
  }
}

interface InstallButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement> {
  children?: ReactNode;
}

function isStandaloneMode() {
  if (typeof window === "undefined") return false;

  const navigatorStandalone =
    typeof window.navigator !== "undefined" &&
    "standalone" in window.navigator &&
    Boolean((window.navigator as Navigator & { standalone?: boolean }).standalone);

  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    navigatorStandalone
  );
}

function getUserAgent() {
  if (typeof window === "undefined") return "";
  return window.navigator.userAgent || "";
}

function isWhaleBrowser(ua: string) {
  return /Whale/i.test(ua);
}

function isAndroidDevice(ua: string) {
  return /Android/i.test(ua);
}

export default function InstallButton({
  children,
  onClick,
  type = "button",
  ...buttonProps
}: InstallButtonProps) {
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);

  const ua = useMemo(() => getUserAgent(), []);
  const isWhale = useMemo(() => isWhaleBrowser(ua), [ua]);
  const isAndroid = useMemo(() => isAndroidDevice(ua), [ua]);

  useEffect(() => {
    setIsInstalled(isStandaloneMode());

    const handleBeforeInstallPrompt = (e: BeforeInstallPromptEvent) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    };

    const mediaQuery = window.matchMedia("(display-mode: standalone)");
    const handleDisplayModeChange = () => {
      setIsInstalled(isStandaloneMode());
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);
    mediaQuery.addEventListener?.("change", handleDisplayModeChange);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);
      mediaQuery.removeEventListener?.("change", handleDisplayModeChange);
    };
  }, []);

  const handleWhaleGuide = () => {
    if (isAndroid) {
      window.alert(
        "웨일 브라우저에서는 브라우저 메뉴에서 설치해야 할 수 있습니다.\n\n" +
          "우측 상단 메뉴(⋮)를 연 뒤\n" +
          "'홈 화면에 추가' 또는 '앱 설치'를 선택해 주세요."
      );
      return;
    }

    window.alert(
      "웨일 브라우저에서는 주소창 오른쪽의 설치 아이콘 또는 브라우저 메뉴에서 설치해야 할 수 있습니다.\n\n" +
        "주소창의 설치 아이콘이 보이면 눌러 설치하고,\n" +
        "보이지 않으면 우측 상단 메뉴에서 설치 관련 항목을 확인해 주세요."
    );
  };

  const handleInstall = async (
    e: React.MouseEvent<HTMLButtonElement, MouseEvent>
  ) => {
    if (isInstalled) return;

    if (onClick) {
      onClick(e);
    }

    if (e.defaultPrevented) return;

    if (deferredPrompt) {
      try {
        await deferredPrompt.prompt();
        await deferredPrompt.userChoice;
      } catch {
        // 사용자가 닫았거나 브라우저에서 막힌 경우
      } finally {
        setDeferredPrompt(null);
      }
      return;
    }

    if (isWhale) {
      handleWhaleGuide();
      return;
    }

    window.alert(
      "이 브라우저에서는 자동 설치 창을 바로 띄울 수 없습니다.\n\n" +
        "브라우저 메뉴에서 '홈 화면에 추가' 또는 '앱 설치'를 선택해 주세요."
    );
  };

  if (isInstalled) return null;

  const shouldShow = Boolean(deferredPrompt) || isWhale;
  if (!shouldShow) return null;

  return (
    <button
      {...buttonProps}
      type={type}
      onClick={handleInstall}
      aria-label={buttonProps["aria-label"] ?? "앱 설치"}
    >
      {children ?? "앱 설치"}
    </button>
  );
}