"use client";
import { useEffect, useState } from "react";

export default function IOSHint() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const ua = navigator.userAgent;
    const isIOS = /iPhone|iPad|iPod/.test(ua);
    const isInStandalone = (navigator as any).standalone === true;
    const isSafari = /^((?!chrome|android).)*safari/i.test(ua);
    if (isIOS && isSafari && !isInStandalone) setShow(true);
  }, []);

  if (!show) return null;

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 bg-white border shadow-xl rounded-2xl px-4 py-3 text-sm">
      iOS에서는 <b>공유</b> → <b>홈 화면에 추가</b>를 눌러 설치하세요.
    </div>
  );
}