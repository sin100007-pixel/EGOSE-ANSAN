"use client";

import { useEffect, useMemo, useState } from "react";
import {
  CUSTOMER_GUIDES,
  CUSTOMER_GUIDE_STEPS,
  CUSTOMER_GUIDE_STORAGE_PREFIX,
  CUSTOMER_GUIDE_ENABLED_STORAGE_PREFIX,
  type CustomerGuideStep,
  type SimulatorMode,
  type SimulatorStep,
} from "../lib/client-state";

type UseSimulatorCustomerGuideArgs = {
  mode: SimulatorMode;
  token: string;
  step: SimulatorStep;
  hasIntroStep: boolean;
  isFilmSheetOpen: boolean;
  loading: boolean;
  expired: boolean;
  setupNeeded: boolean;
};

export function useSimulatorCustomerGuide({
  mode,
  token,
  step,
  hasIntroStep,
  isFilmSheetOpen,
  loading,
  expired,
  setupNeeded,
}: UseSimulatorCustomerGuideArgs) {
  const [activeGuideStep, setActiveGuideStep] = useState<CustomerGuideStep | null>(null);
  const [seenGuideSteps, setSeenGuideSteps] = useState<Partial<Record<CustomerGuideStep, boolean>>>({});
  const [guideReady, setGuideReady] = useState(false);
  const [guideEnabled, setGuideEnabled] = useState(true);

  const customerGuideStorageKey = useMemo(() => {
    return `${CUSTOMER_GUIDE_STORAGE_PREFIX}:${token || "default"}`;
  }, [token]);

  const customerGuideEnabledStorageKey = useMemo(() => {
    return `${CUSTOMER_GUIDE_ENABLED_STORAGE_PREFIX}:${token || "default"}`;
  }, [token]);

  useEffect(() => {
    if (mode !== "customer") {
      setSeenGuideSteps({});
      setActiveGuideStep(null);
      setGuideEnabled(false);
      setGuideReady(true);
      return;
    }

    setGuideReady(false);

    try {
      const raw = window.localStorage.getItem(customerGuideStorageKey);
      const parsed = raw ? (JSON.parse(raw) as Partial<Record<CustomerGuideStep, boolean>>) : {};
      const nextSeen: Partial<Record<CustomerGuideStep, boolean>> = {};

      CUSTOMER_GUIDE_STEPS.forEach((guideStep) => {
        if (parsed?.[guideStep]) {
          nextSeen[guideStep] = true;
        }
      });

      const enabledRaw = window.localStorage.getItem(customerGuideEnabledStorageKey);
      const parsedEnabled = enabledRaw ? JSON.parse(enabledRaw) : true;

      setSeenGuideSteps(nextSeen);
      setGuideEnabled(parsedEnabled !== false);
    } catch {
      setSeenGuideSteps({});
      setGuideEnabled(true);
    } finally {
      setActiveGuideStep(null);
      setGuideReady(true);
    }
  }, [customerGuideEnabledStorageKey, customerGuideStorageKey, mode]);

  useEffect(() => {
    if (
      mode !== "customer" ||
      !guideReady ||
      !guideEnabled ||
      loading ||
      expired ||
      setupNeeded
    ) {
      return;
    }

    if (isFilmSheetOpen) {
      return;
    }

    if (step !== "intro" && step !== "space" && step !== "apply") {
      setActiveGuideStep(null);
      return;
    }

    if (step === "intro" && !hasIntroStep) {
      setActiveGuideStep(null);
      return;
    }

    const nextGuideStep = step as CustomerGuideStep;

    if (seenGuideSteps[nextGuideStep]) {
      if (activeGuideStep && activeGuideStep !== nextGuideStep) {
        setActiveGuideStep(null);
      }
      return;
    }

    if (activeGuideStep !== nextGuideStep) {
      setActiveGuideStep(nextGuideStep);
    }
  }, [
    activeGuideStep,
    expired,
    guideEnabled,
    guideReady,
    hasIntroStep,
    isFilmSheetOpen,
    loading,
    mode,
    seenGuideSteps,
    setupNeeded,
    step,
  ]);

  const toggleGuideEnabled = () => {
    const nextEnabled = !guideEnabled;

    setGuideEnabled(nextEnabled);

    try {
      window.localStorage.setItem(customerGuideEnabledStorageKey, JSON.stringify(nextEnabled));
    } catch {
      // localStorage를 사용할 수 없는 브라우저여도 화면 동작은 유지합니다.
    }

    if (!nextEnabled) {
      setActiveGuideStep(null);
      return;
    }

    if (loading || expired || setupNeeded || isFilmSheetOpen) {
      return;
    }

    if (step === "intro" && !hasIntroStep) {
      return;
    }

    if (step === "intro" || step === "space" || step === "apply") {
      setActiveGuideStep(step as CustomerGuideStep);
    }
  };

  const closeCustomerGuide = () => {
    if (!activeGuideStep) return;

    const guideStep = activeGuideStep;

    setSeenGuideSteps((prev) => {
      const nextSeen = { ...prev, [guideStep]: true };

      try {
        window.localStorage.setItem(customerGuideStorageKey, JSON.stringify(nextSeen));
      } catch {
        // localStorage를 사용할 수 없는 브라우저여도 화면 동작은 유지합니다.
      }

      return nextSeen;
    });

    setActiveGuideStep(null);
  };

  return {
    activeGuideStep,
    currentGuide: activeGuideStep ? CUSTOMER_GUIDES[activeGuideStep] : null,
    guideEnabled,
    toggleGuideEnabled,
    closeCustomerGuide,
  };
}
