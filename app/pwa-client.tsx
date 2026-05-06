"use client";

import { useEffect } from "react";
import IOSHint from "./components/IOSHint";

function isKakaoTalkInAppBrowser() {
  if (typeof navigator === "undefined") return false;
  return /KAKAOTALK/i.test(navigator.userAgent || "");
}

async function clearServiceWorkersAndCaches() {
  if ("serviceWorker" in navigator) {
    try {
      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.all(registrations.map((registration) => registration.unregister()));
    } catch {
      // 무시
    }
  }

  if ("caches" in window) {
    try {
      const keys = await caches.keys();
      await Promise.all(keys.map((key) => caches.delete(key)));
    } catch {
      // 무시
    }
  }
}

export default function PWAClient() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    const isKakao = isKakaoTalkInAppBrowser();

    if (isKakao) {
      void clearServiceWorkersAndCaches().finally(() => {
        const url = new URL(window.location.href);

        // 카카오톡 브라우저에서 기존 나쁜 service worker가 잡고 있으면
        // 해제 후 한 번 새로고침해야 이미지/API가 정상 네트워크로 다시 요청됩니다.
        if (!url.searchParams.has("__kakao_sw_reset")) {
          url.searchParams.set("__kakao_sw_reset", "1");
          window.location.replace(url.toString());
        }
      });

      return;
    }

    const register = () => {
      navigator.serviceWorker.register("/sw.js").catch(() => undefined);
    };

    if (document.readyState === "complete") {
      register();
      return;
    }

    window.addEventListener("load", register);

    return () => {
      window.removeEventListener("load", register);
    };
  }, []);

  return (
    <div className="p-4 space-y-3">
      <IOSHint />
    </div>
  );
}