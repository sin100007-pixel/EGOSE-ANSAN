"use client";

import { useEffect } from "react";
import IOSHint from "./components/IOSHint";

function isProblemInAppBrowser() {
  if (typeof navigator === "undefined") return false;
  return /KAKAOTALK|SamsungBrowser|Whale|NAVER|FB_IAB|Instagram/i.test(navigator.userAgent || "");
}

function isSimulatorPage() {
  if (typeof window === "undefined") return false;
  return window.location.pathname.startsWith("/simulator");
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

    const shouldDisablePwaCache = isSimulatorPage() || isProblemInAppBrowser();

    if (shouldDisablePwaCache) {
      void clearServiceWorkersAndCaches().finally(() => {
        const url = new URL(window.location.href);

        // 시뮬레이터는 이미지/마스크가 중요해서 PWA 캐시가 끼어들지 않게 합니다.
        // 문제 브라우저에서는 해제 후 한 번만 재진입합니다.
        if (isProblemInAppBrowser() && !url.searchParams.has("__egose_pwa_cache_reset")) {
          url.searchParams.set("__egose_pwa_cache_reset", "20260507-inline-assets-1");
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