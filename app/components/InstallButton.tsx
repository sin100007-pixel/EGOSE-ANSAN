"use client";

import React, { useEffect, useMemo, useState } from "react";

type Props = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  children?: React.ReactNode;
};

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

function detectEnv(ua: string) {
  const isKakao = /KAKAOTALK/i.test(ua);
  const isNaver = /NAVER\(inapp|NAVERAPP/i.test(ua);
  const isFBIG = /FBAN|FBAV|FB_IAB|Instagram/i.test(ua);
  const isDaum = /DaumApps/i.test(ua);
  const isInApp = isKakao || isNaver || isFBIG || isDaum;

  const isIOS = /iPad|iPhone|iPod/i.test(ua);
  const isAndroid = /Android/i.test(ua);

  return { isInApp, isIOS, isAndroid };
}

function buildChromeIntentUrl(href: string) {
  const url = new URL(href);
  const scheme = url.protocol.replace(":", "");
  const pathPlusQuery = `${url.host}${url.pathname}${url.search}`;
  return `intent://${pathPlusQuery}#Intent;scheme=${scheme};package=com.android.chrome;end`;
}

export default function InstallButton({
  children = "앱 설치",
  ...btnProps
}: Props) {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [show, setShow] = useState(false);

  const { isInApp, isIOS } = useMemo(() => {
    if (typeof navigator === "undefined") {
      return { isInApp: false, isIOS: false, isAndroid: false };
    }
    return detectEnv(navigator.userAgent || "");
  }, []);

  const isStandalone = useMemo(() => {
    if (typeof window === "undefined") return false;
    const mql = window.matchMedia?.("(display-mode: standalone)")?.matches;
    const iosStandalone = (window as any)?.navigator?.standalone === true;
    return Boolean(mql || iosStandalone);
  }, []);

  useEffect(() => {
    if (isStandalone) {
      setShow(false);
      return;
    }

    const onBeforeInstall = (e: Event) => {
      e.preventDefault();
      const bip = e as BeforeInstallPromptEvent;
      setDeferred(bip);
      setShow(true);
    };

    const onInstalled = () => {
      setDeferred(null);
      setShow(false);
    };

    window.addEventListener(
      "beforeinstallprompt",
      onBeforeInstall as EventListener
    );
    window.addEventListener("appinstalled", onInstalled);

    // 인앱 / iOS 만 버튼 표시
    // 크롬은 beforeinstallprompt가 실제로 왔을 때만 표시
    if (isIOS || isInApp) {
      setShow(true);
    } else {
      setShow(false);
    }

    return () => {
      window.removeEventListener(
        "beforeinstallprompt",
        onBeforeInstall as EventListener
      );
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, [isIOS, isInApp, isStandalone]);

  const handleClick = async () => {
    // 인앱 브라우저면 크롬으로 보내기
    if (isInApp) {
      try {
        const intentUrl = buildChromeIntentUrl(window.location.href);
        window.location.href = intentUrl;
      } catch {
        // 아무 메시지도 띄우지 않음
      }
      return;
    }

    // iOS는 설치 팝업 자체가 없어서 안내만 필요
    if (isIOS) {
      alert(
        'iPhone 설치 방법:\n\nSafari에서 열기 → 공유 버튼 → "홈 화면에 추가"'
      );
      return;
    }

    // 크롬/안드로이드: 설치 가능할 때만 바로 실행
    if (!deferred) return;

    try {
      await deferred.prompt();
      await deferred.userChoice;
      setDeferred(null);
      setShow(false);
    } catch {
      // 무시
    }
  };

  if (!show) return null;

  const label =
    isInApp
      ? typeof children === "string"
        ? `${children}`
        : children
      : children;

  return (
    <button type="button" onClick={handleClick} {...btnProps}>
      {label}
    </button>
  );
}