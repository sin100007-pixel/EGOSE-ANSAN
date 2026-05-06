"use client";

import { useEffect } from "react";
import IOSHint from "./components/IOSHint";

function isKakaoTalkInAppBrowser() {
  if (typeof navigator === "undefined") return false;
  return /KAKAOTALK/i.test(navigator.userAgent || "");
}

export default function PWAClient() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    if (isKakaoTalkInAppBrowser()) {
      navigator.serviceWorker
        .getRegistrations()
        .then((registrations) => {
          registrations.forEach((registration) => {
            void registration.unregister();
          });
        })
        .catch(() => undefined);

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