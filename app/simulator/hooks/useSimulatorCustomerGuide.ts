"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  CUSTOMER_GUIDES,
  CUSTOMER_GUIDE_START_PROMPT_STORAGE_PREFIX,
  CUSTOMER_GUIDE_STEPS,
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
  const [promptHandledInSession, setPromptHandledInSession] = useState(false);
  const [showGuideStartPrompt, setShowGuideStartPrompt] = useState(false);
  const [showGuideSkippedNotice, setShowGuideSkippedNotice] = useState(false);
  const [guidedSequenceActive, setGuidedSequenceActive] = useState(false);
  const [guidedSequenceCompletedSteps, setGuidedSequenceCompletedSteps] = useState<CustomerGuideStep[]>([]);
  const promptShownInSessionRef = useRef(false);

  const customerGuidePromptStorageKey = useMemo(() => {
    return `${CUSTOMER_GUIDE_START_PROMPT_STORAGE_PREFIX}:${token || "default"}`;
  }, [token]);

  const guidedSequenceSteps = useMemo<CustomerGuideStep[]>(() => {
    if (hasIntroStep) {
      return [...CUSTOMER_GUIDE_STEPS];
    }

    return CUSTOMER_GUIDE_STEPS.filter((guideStep) => guideStep !== "intro");
  }, [hasIntroStep]);

  const currentStepGuide = useMemo<CustomerGuideStep | null>(() => {
    if (step !== "intro" && step !== "space" && step !== "apply" && step !== "decision") {
      return null;
    }

    if (step === "intro" && !hasIntroStep) {
      return null;
    }

    return step as CustomerGuideStep;
  }, [hasIntroStep, step]);

  const canOpenCurrentGuide = Boolean(
    mode === "customer" &&
      guideReady &&
      !loading &&
      !expired &&
      !setupNeeded &&
      currentStepGuide &&
      (!isFilmSheetOpen || currentStepGuide === "apply")
  );

  const shouldPromptAtCurrentStep = Boolean(
    currentStepGuide === "intro" || (!hasIntroStep && currentStepGuide === "space")
  );

  const markPromptHandled = useCallback(() => {
    setPromptHandledInSession(true);

    try {
      window.localStorage.setItem(customerGuidePromptStorageKey, "done");
    } catch {
      // localStorage를 사용할 수 없는 브라우저여도 현재 화면에서는 다시 묻지 않습니다.
    }
  }, [customerGuidePromptStorageKey]);

  useEffect(() => {
    promptShownInSessionRef.current = false;
    setGuidedSequenceActive(false);
    setGuidedSequenceCompletedSteps([]);

    if (mode !== "customer") {
      setActiveGuideStep(null);
      setPromptHandledInSession(true);
      setShowGuideStartPrompt(false);
      setShowGuideSkippedNotice(false);
      setGuideReady(true);
      return;
    }

    setGuideReady(false);

    try {
      setPromptHandledInSession(window.localStorage.getItem(customerGuidePromptStorageKey) === "done");
    } catch {
      setPromptHandledInSession(false);
    } finally {
      setActiveGuideStep(null);
      setShowGuideStartPrompt(false);
      setShowGuideSkippedNotice(false);
      setGuideReady(true);
    }
  }, [customerGuidePromptStorageKey, mode]);

  useEffect(() => {
    if (mode !== "customer" || !guideReady || loading || expired || setupNeeded) {
      return;
    }

    if (!currentStepGuide || !shouldPromptAtCurrentStep || promptHandledInSession) {
      return;
    }

    if (promptShownInSessionRef.current || showGuideStartPrompt || activeGuideStep || showGuideSkippedNotice) {
      return;
    }

    promptShownInSessionRef.current = true;
    setShowGuideStartPrompt(true);
  }, [
    activeGuideStep,
    currentStepGuide,
    expired,
    guideReady,
    loading,
    mode,
    promptHandledInSession,
    setupNeeded,
    shouldPromptAtCurrentStep,
    showGuideSkippedNotice,
    showGuideStartPrompt,
  ]);

  useEffect(() => {
    if (!activeGuideStep || activeGuideStep === currentStepGuide) {
      return;
    }

    setActiveGuideStep(null);
  }, [activeGuideStep, currentStepGuide]);

  useEffect(() => {
    if (!guidedSequenceActive || !canOpenCurrentGuide || !currentStepGuide) {
      return;
    }

    if (activeGuideStep || showGuideStartPrompt || showGuideSkippedNotice) {
      return;
    }

    if (guidedSequenceCompletedSteps.includes(currentStepGuide)) {
      return;
    }

    if (!guidedSequenceSteps.includes(currentStepGuide)) {
      return;
    }

    const timer = window.setTimeout(() => {
      setActiveGuideStep(currentStepGuide);
    }, 160);

    return () => {
      window.clearTimeout(timer);
    };
  }, [
    activeGuideStep,
    canOpenCurrentGuide,
    currentStepGuide,
    guidedSequenceActive,
    guidedSequenceCompletedSteps,
    guidedSequenceSteps,
    showGuideSkippedNotice,
    showGuideStartPrompt,
  ]);

  const openCustomerGuide = useCallback(() => {
    if (!canOpenCurrentGuide || !currentStepGuide) {
      return;
    }

    setGuidedSequenceActive(false);
    setShowGuideStartPrompt(false);
    setShowGuideSkippedNotice(false);
    setActiveGuideStep(currentStepGuide);
  }, [canOpenCurrentGuide, currentStepGuide]);

  const startCustomerGuideFromPrompt = useCallback(() => {
    if (!canOpenCurrentGuide || !currentStepGuide) {
      return;
    }

    markPromptHandled();
    setGuidedSequenceCompletedSteps([]);
    setGuidedSequenceActive(true);
    setShowGuideStartPrompt(false);
    setShowGuideSkippedNotice(false);
    setActiveGuideStep(currentStepGuide);
  }, [canOpenCurrentGuide, currentStepGuide, markPromptHandled]);

  const skipCustomerGuideFromPrompt = useCallback(() => {
    markPromptHandled();
    setGuidedSequenceActive(false);
    setGuidedSequenceCompletedSteps([]);
    setShowGuideStartPrompt(false);
    setActiveGuideStep(null);
    setShowGuideSkippedNotice(true);
  }, [markPromptHandled]);

  const closeGuideStartPrompt = useCallback(() => {
    markPromptHandled();
    setGuidedSequenceActive(false);
    setGuidedSequenceCompletedSteps([]);
    setShowGuideStartPrompt(false);
  }, [markPromptHandled]);

  const closeCustomerGuide = useCallback(() => {
    if (activeGuideStep) {
      setGuidedSequenceCompletedSteps((prev) => (
        prev.includes(activeGuideStep) ? prev : [...prev, activeGuideStep]
      ));

      const closedStepIndex = guidedSequenceSteps.indexOf(activeGuideStep);
      if (closedStepIndex >= guidedSequenceSteps.length - 1) {
        setGuidedSequenceActive(false);
      }
    }

    setActiveGuideStep(null);
  }, [activeGuideStep, guidedSequenceSteps]);

  const closeGuideSkippedNotice = useCallback(() => {
    setShowGuideSkippedNotice(false);
  }, []);

  return {
    activeGuideStep,
    currentGuide: activeGuideStep ? CUSTOMER_GUIDES[activeGuideStep] : null,
    openCustomerGuide,
    closeCustomerGuide,
    showGuideStartPrompt,
    startCustomerGuideFromPrompt,
    skipCustomerGuideFromPrompt,
    closeGuideStartPrompt,
    showGuideSkippedNotice,
    closeGuideSkippedNotice,
  };
}
