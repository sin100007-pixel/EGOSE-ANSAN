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
  const [, setSeenGuideSteps] = useState<Partial<Record<CustomerGuideStep, boolean>>>({});
  const [dismissedGuideSteps, setDismissedGuideSteps] = useState<Partial<Record<CustomerGuideStep, boolean>>>({});
  const [guideReady, setGuideReady] = useState(false);
  const [guideEnabled, setGuideEnabled] = useState(false);

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
      setDismissedGuideSteps({});
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

      setSeenGuideSteps(nextSeen);
      setGuideEnabled(CUSTOMER_GUIDE_STEPS.some((guideStep) => !nextSeen[guideStep]));
    } catch {
      setSeenGuideSteps({});
      setGuideEnabled(true);
    } finally {
      setDismissedGuideSteps({});
      setActiveGuideStep(null);
      setGuideReady(true);
    }
  }, [customerGuideStorageKey, mode]);

  useEffect(() => {
    if (mode !== "customer" || !guideReady || loading || expired || setupNeeded) {
      setActiveGuideStep(null);
      return;
    }

    if (!currentStepGuide || isFilmSheetOpen) {
      setActiveGuideStep(null);
      return;
    }

    if (guideEnabled && !dismissedGuideSteps[currentStepGuide]) {
      setActiveGuideStep(currentStepGuide);
      return;
    }

    setActiveGuideStep(null);
  }, [
    currentStepGuide,
    dismissedGuideSteps,
    expired,
    guideEnabled,
    guideReady,
    isFilmSheetOpen,
    loading,
    mode,
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

    if (guideEnabled) {
      if (activeGuideStep) {
        rememberGuideStepAsSeen(activeGuideStep);
      }

      setGuideEnabled(false);
      setActiveGuideStep(null);
      setDismissedGuideSteps({});
      return;
    }

    if (isFilmSheetOpen) {
      return;
    }

    setGuideEnabled(true);
    setDismissedGuideSteps((prev) => {
      const nextDismissed = { ...prev };
      delete nextDismissed[currentStepGuide];
      return nextDismissed;
    });
    setActiveGuideStep(currentStepGuide);
  };

  const closeCustomerGuide = () => {
    if (!activeGuideStep) return;

    rememberGuideStepAsSeen(activeGuideStep);
    setDismissedGuideSteps((prev) => ({ ...prev, [activeGuideStep]: true }));
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
