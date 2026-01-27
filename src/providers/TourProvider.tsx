'use client';

import { createContext, useContext, useEffect, ReactNode } from 'react';
import { useTour } from '@/hooks/useTour';
import { TourTooltip } from '@/components/TourTooltip';

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

  // Activate tour after onboarding is complete (small delay)
  useEffect(() => {
    const timer = setTimeout(() => {
      activateTour();
    }, 1000);

    return () => clearTimeout(timer);
  }, [activateTour]);

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
