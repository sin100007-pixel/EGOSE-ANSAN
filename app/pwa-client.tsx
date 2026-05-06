"use client";

import { useEffect } from "react";
import IOSHint from "./components/IOSHint";

const EMERGENCY_SW_RESET_VERSION = "20260507-hard-reset-4";

function getUserAgent() {
  if (typeof navigator === "undefined") return "";
  return navigator.userAgent || "";
}

function isKakaoTalkInAppBrowser() {
  return /KAKAOTALK/i.test(getUserAgent());
}

function isFragileMobileBrowser() {
  const ua = getUserAgent();

  return /KAKAOTALK|SamsungBrowser|NAVER|Whale|; wv\)|Version\/\d+\.\d+ Chrome\/\d+.*Mobile Safari/i.test(ua);
}

function isSimulatorPage(pathname: string) {
  return pathname === "/simulator" || pathname.startsWith("/simulator/");
}

async function clearServiceWorkersAndCaches() {
  if ("serviceWorker" in navigator) {
    try {
      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.all(registrations.map((registration) => registration.unregister()));
    } catch {
      // 브라우저가 serviceWorker 접근을 막는 경우는 무시합니다.
    }
  }

  if ("caches" in window) {
    try {
      const keys = await caches.keys();
      await Promise.all(keys.map((key) => caches.delete(key)));
    } catch {
      // 브라우저가 CacheStorage 접근을 막는 경우는 무시합니다.
    }
  }
}

export default function PWAClient() {
  useEffect(() => {
    if (typeof window === "undefined") return;

    const url = new URL(window.location.href);
    const simulatorPage = isSimulatorPage(url.pathname);
    const resetRequested =
      url.searchParams.has("__kakao_sw_reset") ||
      url.searchParams.has("__egose_sw_reset");
    const shouldEmergencyReset =
      simulatorPage && (resetRequested || isKakaoTalkInAppBrowser() || isFragileMobileBrowser());

    if (shouldEmergencyReset) {
      const alreadyReloaded =
        url.searchParams.get("__egose_sw_reset_done") === EMERGENCY_SW_RESET_VERSION;

      void clearServiceWorkersAndCaches().finally(() => {
        // 중요: service worker는 unregister 직후 현재 페이지에는 남아있을 수 있습니다.
        // 그래서 한 번은 반드시 새 주소로 재진입해야 이미지/API 요청이 기존 SW에서 풀립니다.
        if (!alreadyReloaded) {
          url.searchParams.set("__kakao_sw_reset", "1");
          url.searchParams.set("__egose_sw_reset_done", EMERGENCY_SW_RESET_VERSION);
          url.searchParams.set("v", EMERGENCY_SW_RESET_VERSION);
          window.location.replace(url.toString());
        }
      });

      return;
    }

    // 시뮬레이터 고객 링크에서는 PWA service worker가 필요 없습니다.
    // 이미지/마스크/API 요청이 service worker에 잡히지 않도록 등록하지 않습니다.
    if (simulatorPage) {
      return;
    }

    if (!("serviceWorker" in navigator)) return;

    const register = () => {
      navigator.serviceWorker.register(`/sw.js?v=${EMERGENCY_SW_RESET_VERSION}`).catch(() => undefined);
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
