"use client";
import { useEffect } from "react";
import IOSHint from "./components/IOSHint";

export default function PWAClient() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(console.error);
    }
  }, []);

  return (
    <div className="p-4 space-y-3">
      <IOSHint />
    </div>
  );
}