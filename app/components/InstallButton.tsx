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

interface InstallButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
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

function isSamsungInternet(ua: string) {
  return /SamsungBrowser/i.test(ua);
}

function isChromeBrowser(ua: string) {
  return /Chrome|CriOS/i.test(ua) && !/Edg|OPR|Whale|SamsungBrowser/i.test(ua);
}

function isAndroidDevice(ua: string) {
  return /Android/i.test(ua);
}

function isIOSDevice(ua: string) {
  return /iPhone|iPad|iPod/i.test(ua);
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
  const isSamsung = useMemo(() => isSamsungInternet(ua), [ua]);
  const isChrome = useMemo(() => isChromeBrowser(ua), [ua]);
  const isAndroid = useMemo(() => isAndroidDevice(ua), [ua]);
  const isIOS = useMemo(() => isIOSDevice(ua), [ua]);

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

  const showManualInstallGuide = () => {
    if (isIOS) {
      window.alert(
        "iPhone/iPad에서는 Safari의 공유 버튼을 누른 뒤\n'홈 화면에 추가'를 선택해 설치해 주세요."
      );
      return;
    }

    if (isWhale) {
      window.alert(
        isAndroid
          ? "웨일 브라우저에서는 우측 상단 메뉴(⋮)를 연 뒤\n'홈 화면에 추가' 또는 '앱 설치'를 선택해 주세요."
          : "웨일 브라우저에서는 주소창 오른쪽 설치 아이콘 또는 우측 상단 메뉴에서\n설치 관련 항목을 선택해 주세요."
      );
      return;
    }

    if (isSamsung) {
      window.alert(
        "삼성 인터넷에서는 하단 또는 우측 상단 메뉴에서\n'홈 화면에 추가' 또는 '앱 설치'를 선택해 주세요."
      );
      return;
    }

    if (isChrome) {
      window.alert(
        isAndroid
          ? "크롬에서는 우측 상단 메뉴(⋮)를 연 뒤\n'홈 화면에 추가' 또는 '앱 설치'를 선택해 주세요."
          : "크롬에서는 주소창 오른쪽 설치 아이콘 또는 우측 상단 메뉴에서\n'설치'를 선택해 주세요."
      );
      return;
    }

    window.alert(
      "이 브라우저에서는 자동 설치 창을 바로 띄울 수 없습니다.\n\n브라우저 메뉴에서 '홈 화면에 추가' 또는 '앱 설치'를 선택해 주세요."
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
      } finally {
        setDeferredPrompt(null);
      }
      return;
    }

    showManualInstallGuide();
  };

  if (isInstalled) return null;

  const canShowManualInstallButton = isIOS || isWhale || isSamsung || isChrome;
  const shouldShow = Boolean(deferredPrompt) || canShowManualInstallButton;

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