// app/components/InstallButton.tsx
"use client";

import React, { useEffect, useMemo, useState } from "react";

type Props = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  /** 버튼 라벨 (기본: 앱 설치) */
  children?: React.ReactNode;
};

export default function InstallButton({ children = "앱 설치", ...btnProps }: Props) {
  const [deferred, setDeferred] = useState<any>(null);
  const [show, setShow] = useState(false);

  // iOS 여부
  const isIos = useMemo(() => {
    if (typeof navigator === "undefined") return false;
    return /iphone|ipad|ipod/i.test(navigator.userAgent);
  }, []);

  // 이미 PWA로 실행 중이면 숨김
  const isStandalone = useMemo(() => {
    if (typeof window === "undefined") return false;
    const mql = window.matchMedia?.("(display-mode: standalone)")?.matches;
    const iosStandalone = (window as any).navigator?.standalone === true;
    return Boolean(mql || iosStandalone);
  }, []);

  useEffect(() => {
    if (isStandalone) {
      setShow(false);
      return;
    }

    const onBeforeInstall = (e: any) => {
      // Android/Chrome 등: 설치 가능할 때 발생
      e.preventDefault();
      setDeferred(e);
      setShow(true);
    };

    const onInstalled = () => {
      setDeferred(null);
      setShow(false);
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstall as any);
    window.addEventListener("appinstalled", onInstalled);

    // iOS는 beforeinstallprompt 이벤트가 없으므로 안내 버튼을 노출
    if (isIos) setShow(true);

    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall as any);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, [isIos, isStandalone]);

  const handleClick = async () => {
    if (isIos) {
      alert(
        'iOS 설치 방법:\n\n1) Safari로 이 페이지 열기\n2) 하단 공유 아이콘(□↑) 탭\n3) "홈 화면에 추가" 선택\n4) 추가 버튼 탭'
      );
      return;
    }

    if (!deferred) return;
    deferred.prompt();
    await deferred.userChoice; // { outcome: 'accepted' | 'dismissed' }
    setDeferred(null);
    // 설치 수락 시 브라우저가 standalone으로 전환되며 버튼은 숨겨짐
  };

  if (!show) return null;

  return (
    <button type="button" onClick={handleClick} {...btnProps}>
      {children}
    </button>
  );
}
