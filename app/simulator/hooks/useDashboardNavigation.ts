"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { SimulatorMode } from "../lib/client-state";

export function useDashboardNavigation(mode: SimulatorMode) {
  const router = useRouter();
  const [isDashboardMoving, setIsDashboardMoving] = useState(false);

  useEffect(() => {
    if (mode !== "installer") return;

    router.prefetch("/dashboard");
    const idle = window.setTimeout(() => {
      router.prefetch("/dashboard");
    }, 250);

    return () => {
      window.clearTimeout(idle);
    };
  }, [mode, router]);

  const paintThenNavigateToDashboard = (method: "push" | "replace") => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (method === "replace") {
          router.replace("/dashboard");
          return;
        }

        router.push("/dashboard");
      });
    });
  };

  const moveToDashboard = (method: "push" | "replace") => {
    if (isDashboardMoving) return;

    setIsDashboardMoving(true);
    router.prefetch("/dashboard");
    paintThenNavigateToDashboard(method);
  };

  const goToDashboard = () => {
    moveToDashboard("push");
  };

  const replaceToDashboard = () => {
    moveToDashboard("replace");
  };

  return {
    isDashboardMoving,
    goToDashboard,
    replaceToDashboard,
  };
}
