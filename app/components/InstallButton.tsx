// app/components/InstallButton.tsx
"use client";

import React, { useEffect, useMemo, useState } from "react";

type Props = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  /** 버튼 라벨 (기본: 앱 설치) */
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

  return { isInApp, isIOS, isAndroid, isKakao };
}

function buildChromeIntentUrl(href: string) {
  // https 기준 (http면 scheme을 http로 바꿔야 함)
  const url = new URL(href);
  const scheme = url.protocol.replace(":", ""); // 'https'
  const pathPlusQuery = `${url.host}${url.pathname}${url.search}`;
  return `intent://${pathPlusQuery}#Intent;scheme=${scheme};package=com.android.chrome;end`;
}

export default function InstallButton({ children = "앱 설치", ...btnProps }: Props) {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [show, setShow] = useState(false);

  const { isInApp, isIOS, isAndroid } = useMemo(() => {
    if (typeof navigator === "undefined") return { isInApp: false, isIOS: false, isAndroid: false, isKakao: false };
    return detectEnv(navigator.userAgent || "");
  }, []);

  // 이미 PWA로 실행 중이면 숨김
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
      // Android/Chrome 등: 설치 가능할 때 발생
      e.preventDefault();
      const bip = e as BeforeInstallPromptEvent;
      setDeferred(bip);
      setShow(true);
    };

    const onInstalled = () => {
      setDeferred(null);
      setShow(false);
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstall as EventListener);
    window.addEventListener("appinstalled", onInstalled);

    // iOS 사파리/인앱, 또는 인앱(WebView)들에선 beforeinstallprompt가 안 뜸 → 버튼은 보여주되 동작을 안내/유도
    if (isIOS || isInApp) setShow(true);

    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall as EventListener);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, [isIOS, isInApp, isStandalone]);

  const handleClick = async () => {
    // 1) 인앱 브라우저: 외부 브라우저로 열기 유도
    if (isInApp) {
      if (isAndroid) {
        try {
          const intentUrl = buildChromeIntentUrl(window.location.href);
          window.location.href = intentUrl;
        } catch {
          alert('우측 상단 메뉴에서 "외부 브라우저로 열기"를 눌러 Chrome으로 열어주세요.');
        }
      } else if (isIOS) {
        alert(
          'iOS 설치 안내:\n\n1) 우측 하단 ···(더보기)\n2) "Safari로 열기" 선택\n3) Safari에서 하단 공유(□↑) → "홈 화면에 추가"\n'
        );
      } else {
        alert('우측 상단 메뉴에서 "외부 브라우저로 열기"를 선택해 주세요.');
      }
      return;
    }

    // 2) iOS 사파리: beforeinstallprompt 미지원 → 설치 방법 안내
    if (isIOS) {
      alert(
        'iOS 설치 안내:\n\n1) Safari에서 이 페이지 열기\n2) 하단 공유 아이콘(□↑)\n3) "홈 화면에 추가"'
      );
      return;
    }

    // 3) 일반 브라우저: PWA 설치 흐름
    if (!deferred) return;
    try {
      await deferred.prompt();
      await deferred.userChoice;
      setDeferred(null);
    } catch {
      // 무시
    }
  };

  if (!show) return null;

  // 인앱 환경에선 라벨을 살짝 바꿔 사용자 혼란을 줄임 (children 우선, 없으면 기본 문구)
  const label =
    isInApp ? (typeof children === "string" ? `${children} (외부 브라우저에서)` : children) : children;

  return (
    <button type="button" onClick={handleClick} {...btnProps}>
      {label}
    </button>
  );
}