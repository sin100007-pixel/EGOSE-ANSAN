"use client";

import React, { useEffect, useState } from "react";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

type InstallButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  children?: React.ReactNode;
};

export default function InstallButton({
  children = "앱 설치",
  style,
  onClick,
  type = "button",
  ...rest
}: InstallButtonProps) {
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    };

    const isStandalone =
      window.matchMedia?.("(display-mode: standalone)")?.matches ||
      (window.navigator as Navigator & { standalone?: boolean }).standalone === true;

    if (isStandalone) {
      setIsInstalled(true);
    }

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  const handleClick = async (e: React.MouseEvent<HTMLButtonElement>) => {
    onClick?.(e);

    if (e.defaultPrevented) return;
    if (!deferredPrompt) return;

    try {
      await deferredPrompt.prompt();
      await deferredPrompt.userChoice;
    } catch {
      // 무시
    } finally {
      setDeferredPrompt(null);
    }
  };

  if (isInstalled) return null;

  return (
    <button
      type={type}
      style={style}
      onClick={handleClick}
      {...rest}
    >
      {children}
    </button>
  );
}