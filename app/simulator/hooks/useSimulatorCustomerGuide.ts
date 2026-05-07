"use client";

import { useEffect, useMemo, useState } from "react";
import {
  CUSTOMER_GUIDES,
  CUSTOMER_GUIDE_STEPS,
  CUSTOMER_GUIDE_STORAGE_PREFIX,
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
  const [manualGuideMode, setManualGuideMode] = useState(false);

  const customerGuideStorageKey = useMemo(() => {
    return `${CUSTOMER_GUIDE_STORAGE_PREFIX}:${token || "default"}`;
  }, [token]);

  const currentStepGuide = useMemo<CustomerGuideStep | null>(() => {
    if (step !== "intro" && step !== "space" && step !== "apply") {
      return null;
    }

    if (step === "intro" && !hasIntroStep) {
      return null;
    }

    return step as CustomerGuideStep;
  }, [hasIntroStep, step]);

  useEffect(() => {
    if (mode !== "customer") {
      setSeenGuideSteps({});
      setActiveGuideStep(null);
      setManualGuideMode(false);
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

      setSeenGuideSteps(nextSeen);
    } catch {
      setSeenGuideSteps({});
    } finally {
      setActiveGuideStep(null);
      setManualGuideMode(false);
      setGuideReady(true);
    }
  }, [customerGuideStorageKey, mode]);

  useEffect(() => {
    if (mode !== "customer" || !guideReady || loading || expired || setupNeeded) {
      return;
    }

    if (!currentStepGuide || isFilmSheetOpen) {
      setActiveGuideStep(null);
      return;
    }

    if (manualGuideMode || !seenGuideSteps[currentStepGuide]) {
      setActiveGuideStep(currentStepGuide);
      return;
    }

    setActiveGuideStep(null);
  }, [
    currentStepGuide,
    expired,
    guideReady,
    isFilmSheetOpen,
    loading,
    manualGuideMode,
    mode,
    seenGuideSteps,
    setupNeeded,
  ]);

  const rememberGuideStepAsSeen = (guideStep: CustomerGuideStep) => {
    setSeenGuideSteps((prev) => {
      const nextSeen = { ...prev, [guideStep]: true };

      try {
        window.localStorage.setItem(customerGuideStorageKey, JSON.stringify(nextSeen));
      } catch {
        // localStorage를 사용할 수 없는 브라우저여도 화면 동작은 유지합니다.
      }

      return nextSeen;
    });
  };

  const toggleGuideEnabled = () => {
    if (mode !== "customer" || !guideReady || loading || expired || setupNeeded || !currentStepGuide) {
      return;
    }

    if (activeGuideStep) {
      rememberGuideStepAsSeen(activeGuideStep);
      setActiveGuideStep(null);
      setManualGuideMode(false);
      return;
    }

    if (isFilmSheetOpen) {
      return;
    }

    setManualGuideMode(true);
    setActiveGuideStep(currentStepGuide);
  };

  const closeCustomerGuide = () => {
    if (!activeGuideStep) return;

    rememberGuideStepAsSeen(activeGuideStep);
    setActiveGuideStep(null);
    setManualGuideMode(false);
  };

  const guideEnabled = Boolean(activeGuideStep);

  return {
    activeGuideStep,
    currentGuide: activeGuideStep ? CUSTOMER_GUIDES[activeGuideStep] : null,
    guideEnabled,
    toggleGuideEnabled,
    closeCustomerGuide,
  };
}
