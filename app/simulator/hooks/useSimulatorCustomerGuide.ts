"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  CUSTOMER_GUIDES,
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
  const [guideReady, setGuideReady] = useState(false);
  const [guideEnabled, setGuideEnabled] = useState(true);
  const [pendingGuideStep, setPendingGuideStep] = useState<CustomerGuideStep | null>(null);
  const [showGuideDisabledNotice, setShowGuideDisabledNotice] = useState(false);
  const previousStepGuideRef = useRef<CustomerGuideStep | null>(null);

  const customerGuideEnabledStorageKey = useMemo(() => {
    return `${CUSTOMER_GUIDE_ENABLED_STORAGE_PREFIX}:${token || "default"}`;
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

  const persistGuideEnabled = (value: boolean) => {
    try {
      window.localStorage.setItem(customerGuideEnabledStorageKey, JSON.stringify(value));
    } catch {
      // localStorage를 사용할 수 없는 브라우저여도 화면 동작은 유지합니다.
    }
  };

  useEffect(() => {
    if (mode !== "customer") {
      setActiveGuideStep(null);
      setGuideEnabled(true);
      setPendingGuideStep(null);
      setShowGuideDisabledNotice(false);
      previousStepGuideRef.current = null;
      setGuideReady(true);
      return;
    }

    setGuideReady(false);

    try {
      const raw = window.localStorage.getItem(customerGuideEnabledStorageKey);
      const parsed = raw === null ? true : JSON.parse(raw);
      setGuideEnabled(parsed !== false);
    } catch {
      setGuideEnabled(true);
    } finally {
      setActiveGuideStep(null);
      setPendingGuideStep(null);
      setShowGuideDisabledNotice(false);
      previousStepGuideRef.current = null;
      setGuideReady(true);
    }
  }, [customerGuideEnabledStorageKey, mode]);

  useEffect(() => {
    if (mode !== "customer" || !guideReady) {
      previousStepGuideRef.current = currentStepGuide;
      return;
    }

    if (currentStepGuide !== previousStepGuideRef.current) {
      if (currentStepGuide) {
        setPendingGuideStep(currentStepGuide);
      } else {
        setPendingGuideStep(null);
        setActiveGuideStep(null);
      }

      previousStepGuideRef.current = currentStepGuide;
    }
  }, [currentStepGuide, guideReady, mode]);

  useEffect(() => {
    if (mode !== "customer" || !guideReady || loading || expired || setupNeeded) {
      return;
    }

    if (!currentStepGuide) {
      setActiveGuideStep(null);
      return;
    }

    if (!guideEnabled || isFilmSheetOpen) {
      setActiveGuideStep(null);
      return;
    }

    if (pendingGuideStep && pendingGuideStep === currentStepGuide) {
      setActiveGuideStep(currentStepGuide);
      setPendingGuideStep(null);
    }
  }, [
    currentStepGuide,
    expired,
    guideEnabled,
    guideReady,
    isFilmSheetOpen,
    loading,
    mode,
    pendingGuideStep,
    setupNeeded,
  ]);

  const toggleGuideEnabled = () => {
    if (mode !== "customer" || !guideReady || loading || expired || setupNeeded || !currentStepGuide) {
      return;
    }

    const nextEnabled = !guideEnabled;
    setGuideEnabled(nextEnabled);
    persistGuideEnabled(nextEnabled);
    setShowGuideDisabledNotice(false);

    if (!nextEnabled) {
      setActiveGuideStep(null);
      setPendingGuideStep(null);
      return;
    }

    if (!isFilmSheetOpen) {
      setActiveGuideStep(currentStepGuide);
    }
  };

  const closeCustomerGuide = () => {
    setActiveGuideStep(null);
  };

  const disableCustomerGuide = () => {
    setGuideEnabled(false);
    persistGuideEnabled(false);
    setPendingGuideStep(null);
    setActiveGuideStep(null);
    setShowGuideDisabledNotice(true);
  };

  const closeGuideDisabledNotice = () => {
    setShowGuideDisabledNotice(false);
  };

  return {
    activeGuideStep,
    currentGuide: activeGuideStep ? CUSTOMER_GUIDES[activeGuideStep] : null,
    guideEnabled,
    toggleGuideEnabled,
    closeCustomerGuide,
    disableCustomerGuide,
    showGuideDisabledNotice,
    closeGuideDisabledNotice,
  };
}
