"use client";
import { useEffect, useState } from "react";

export default function InstallButton() {
  const [deferred, setDeferred] = useState<any>(null);
  const [show, setShow] = useState(false);

  useEffect(() => {
    const onBeforeInstall = (e: any) => {
      e.preventDefault();
      setDeferred(e);
      setShow(true);
    };
    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    return () => window.removeEventListener("beforeinstallprompt", onBeforeInstall);
  }, []);

  if (!show) return null;

  return (
    <button
      className="px-4 py-2 rounded-xl bg-black text-white shadow"
      onClick={async () => {
        deferred.prompt();
        await deferred.userChoice; // { outcome: 'accepted' | 'dismissed' }
        setDeferred(null);
        setShow(false);
      }}
    >
      앱 설치
    </button>
  );
}