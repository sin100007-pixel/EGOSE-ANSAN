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

  const { isInApp, isIOS, isAndroid } = useMemo(() => {
    if (typeof navigator === "undefined") {
      return {
        isInApp: false,
        isIOS: false,
        isAndroid: false,
        isKakao: false,
      };
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

    // iOS / 인앱 / 안드로이드 일반 브라우저에서는 버튼을 먼저 보여줌
    // Chrome에서 beforeinstallprompt가 아직 안 떠도 수동 설치 안내 가능
    if (isIOS || isInApp || isAndroid) {
      setShow(true);
    }

    return () => {
      window.removeEventListener(
        "beforeinstallprompt",
        onBeforeInstall as EventListener
      );
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, [isIOS, isInApp, isAndroid, isStandalone]);

  const handleClick = async () => {
    // 1) 인앱 브라우저: 외부 브라우저로 열기 유도
    if (isInApp) {
      if (isAndroid) {
        try {
          const intentUrl = buildChromeIntentUrl(window.location.href);
          window.location.href = intentUrl;
        } catch {
          alert(
            '우측 상단 메뉴에서 "외부 브라우저로 열기"를 눌러 Chrome으로 열어주세요.'
          );
        }
      } else if (isIOS) {
        alert(
          'iOS 설치 안내:\n\n1) 우측 하단 ···(더보기)\n2) "Safari로 열기" 선택\n3) Safari에서 하단 공유(□↑) → "홈 화면에 추가"'
        );
      } else {
        alert('우측 상단 메뉴에서 "외부 브라우저로 열기"를 선택해 주세요.');
      }
      return;
    }

    // 2) iOS 사파리: beforeinstallprompt 미지원
    if (isIOS) {
      alert(
        'iOS 설치 안내:\n\n1) Safari에서 이 페이지 열기\n2) 하단 공유 아이콘(□↑)\n3) "홈 화면에 추가"'
      );
      return;
    }

    // 3) Android / Chrome 등: 설치 프롬프트가 있으면 실행
    if (deferred) {
      try {
        await deferred.prompt();
        await deferred.userChoice;
        setDeferred(null);
      } catch {
        // 무시
      }
      return;
    }

    // 4) Chrome인데 아직 beforeinstallprompt가 안 뜬 경우 수동 안내
    if (isAndroid) {
      alert(
        '크롬 설치 안내:\n\n1) 우측 상단 ⋮ 메뉴\n2) "앱 설치" 또는 "홈 화면에 추가" 선택'
      );
      return;
    }
  };

  if (!show) return null;

  const label =
    isInApp
      ? typeof children === "string"
        ? `${children} (외부 브라우저에서)`
        : children
      : children;

  return (
    <button type="button" onClick={handleClick} {...btnProps}>
      {label}
    </button>
  );
}