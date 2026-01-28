'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useTour } from '@/hooks/useTour';
import { TourTooltip } from '@/components/TourTooltip';

const ONBOARDING_STORAGE_KEY = 'global_pulse_onboarding_complete';

interface TourContextType {
  isActive: boolean;
  hasCompletedTour: boolean;
  startTour: () => void;
  activateTour: () => void;
}

const TourContext = createContext<TourContextType | null>(null);

export function useTourContext() {
  const context = useContext(TourContext);
  if (!context) {
    throw new Error('useTourContext must be used within TourProvider');
  }
  return context;
}

interface TourProviderProps {
  children: ReactNode;
}

export function TourProvider({ children }: TourProviderProps) {
  const {
    isActive,
    currentStep,
    currentStepIndex,
    totalSteps,
    hasCompletedTour,
    startTour,
    nextStep,
    prevStep,
    skipTour,
    activateTour,
  } = useTour();

  const [onboardingComplete, setOnboardingComplete] = useState(false);

  // Check if onboarding is complete before activating tour
  useEffect(() => {
    const checkOnboarding = () => {
      const completed = localStorage.getItem(ONBOARDING_STORAGE_KEY);
      setOnboardingComplete(completed === 'true');
    };

    // Check initially
    checkOnboarding();

    // Also listen for storage changes (in case onboarding completes)
    const handleStorage = () => checkOnboarding();
    window.addEventListener('storage', handleStorage);

    // Poll for changes (since storage event doesn't fire in same tab)
    const interval = setInterval(checkOnboarding, 500);

    return () => {
      window.removeEventListener('storage', handleStorage);
      clearInterval(interval);
    };
  }, []);

  // Only activate tour after onboarding is complete
  useEffect(() => {
    if (onboardingComplete && !hasCompletedTour) {
      const timer = setTimeout(() => {
        activateTour();
      }, 1500); // Longer delay to let page settle

      return () => clearTimeout(timer);
    }
  }, [onboardingComplete, hasCompletedTour, activateTour]);

  return (
    <TourContext.Provider value={{ isActive, hasCompletedTour, startTour, activateTour }}>
      {children}

      {currentStep && (
        <TourTooltip
          step={currentStep}
          currentIndex={currentStepIndex}
          totalSteps={totalSteps}
          onNext={nextStep}
          onPrev={prevStep}
          onSkip={skipTour}
          isActive={isActive}
        />
      )}
    </TourContext.Provider>
  );
}
