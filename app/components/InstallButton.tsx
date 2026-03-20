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
  const isWhale = /Whale/i.test(ua);
  const isInApp = isKakao || isNaver || isFBIG || isDaum;

  const isIOS = /iPad|iPhone|iPod/i.test(ua);
  const isAndroid = /Android/i.test(ua);

  return { isInApp, isIOS, isAndroid, isKakao, isWhale };
}

function buildChromeIntentUrl(href: string) {
  const url = new URL(href);
  const scheme = url.protocol.replace(":", "");
  const pathPlusQuery = `${url.host}${url.pathname}${url.search}`;
  return `intent://${pathPlusQuery}#Intent;scheme=${scheme};package=com.android.chrome;end`;
}

export default function InstallButton({
  children = "앱 설치",
  onClick,
  type = "button",
  ...btnProps
}: Props) {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [show, setShow] = useState(false);

  const { isInApp, isIOS, isAndroid, isWhale } = useMemo(() => {
    if (typeof navigator === "undefined") {
      return {
        isInApp: false,
        isIOS: false,
        isAndroid: false,
        isKakao: false,
        isWhale: false,
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

    window.addEventListener("beforeinstallprompt", onBeforeInstall as EventListener);
    window.addEventListener("appinstalled", onInstalled);

    // iOS / 인앱 / 웨일은 beforeinstallprompt가 없어도 버튼 표시
    if (isIOS || isInApp || isWhale) {
      setShow(true);
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall as EventListener);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, [isIOS, isInApp, isWhale, isStandalone]);

  const handleWhaleGuide = () => {
    if (isAndroid) {
      alert(
        "웨일 브라우저에서는 브라우저 메뉴에서 설치해야 할 수 있습니다.\n\n" +
          "우측 상단 메뉴(⋮)를 연 뒤\n" +
          "'홈 화면에 추가' 또는 '앱 설치'를 선택해 주세요."
      );
      return;
    }

    alert(
      "웨일 브라우저에서는 주소창 오른쪽의 설치 아이콘 또는 브라우저 메뉴에서 설치해야 할 수 있습니다.\n\n" +
        "주소창의 설치 아이콘이 보이면 눌러 설치하고,\n" +
        "보이지 않으면 우측 상단 메뉴에서 설치 관련 항목을 확인해 주세요."
    );
  };

  const handleClick = async (e: React.MouseEvent<HTMLButtonElement>) => {
    if (onClick) onClick(e);
    if (e.defaultPrevented) return;

    // 인앱 브라우저
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

    // 웨일
    if (isWhale && !deferred) {
      handleWhaleGuide();
      return;
    }

    // iOS Safari
    if (isIOS) {
      alert(
        'iOS 설치 안내:\n\n1) Safari에서 이 페이지 열기\n2) 하단 공유 아이콘(□↑)\n3) "홈 화면에 추가"'
      );
      return;
    }

    // 일반 PWA 설치
    if (!deferred) {
      alert(
        '이 브라우저에서는 자동 설치 창을 바로 띄울 수 없습니다.\n\n브라우저 메뉴에서 "홈 화면에 추가" 또는 "앱 설치"를 선택해 주세요.'
      );
      return;
    }

    try {
      await deferred.prompt();
      await deferred.userChoice;
      setDeferred(null);
    } catch {
      // 무시
    }
  };

  if (!show) return null;

  const label =
    isInApp && typeof children === "string"
      ? `${children} (외부 브라우저에서)`
      : children;

  return (
    <button {...btnProps} type={type} onClick={handleClick}>
      {label}
    </button>
  );
}