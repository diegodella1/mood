'use client';

import { useState, useEffect, useCallback } from 'react';

const TOUR_STORAGE_KEY = 'global_pulse_tour_completed';
const TOUR_STEP_KEY = 'global_pulse_tour_step';

export interface TourStep {
  id: string;
  target: string; // CSS selector or element ID
  title: string;
  description: string;
  position: 'top' | 'bottom' | 'left' | 'right';
  emoji?: string;
}

export const TOUR_STEPS: TourStep[] = [
  {
    id: 'mood-selector',
    target: '[data-tour="mood-selector"]',
    title: 'Share Your Vibe',
    description: 'Tap any emoji to share how you\'re feeling right now. Your pulse joins thousands around the world!',
    position: 'bottom',
    emoji: '😊',
  },
  {
    id: 'streak',
    target: '[data-tour="streak"]',
    title: 'Your Streak',
    description: 'Pulse daily to build your streak. At 7 days you get a Fire aura, 30 days Lightning, 100 days the permanent Diamond!',
    position: 'top',
    emoji: '🔥',
  },
  {
    id: 'daily-progress',
    target: '[data-tour="daily-progress"]',
    title: 'Daily Progress',
    description: 'Track your pulses across the 3 daily windows. Complete all 3 for maximum engagement!',
    position: 'top',
    emoji: '📊',
  },
  {
    id: 'find-friends',
    target: '[data-tour="find-friends"]',
    title: 'Find Friends',
    description: 'Search and follow friends. When you both follow each other, you start a shared streak!',
    position: 'top',
    emoji: '👥',
  },
  {
    id: 'invite',
    target: '[data-tour="invite"]',
    title: 'Invite & Earn',
    description: 'Invite friends with your unique code. You both get a shield to protect your streak!',
    position: 'top',
    emoji: '🎁',
  },
  {
    id: 'results',
    target: '[data-tour="results"]',
    title: 'Explore Results',
    description: 'See how your city and the world are feeling. Discover mood patterns and trends!',
    position: 'bottom',
    emoji: '🗺️',
  },
];

export function useTour() {
  const [isActive, setIsActive] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [hasCompletedTour, setHasCompletedTour] = useState(true); // Default true to prevent flash

  // Check if tour was completed
  useEffect(() => {
    const completed = localStorage.getItem(TOUR_STORAGE_KEY);
    const savedStep = localStorage.getItem(TOUR_STEP_KEY);

    if (!completed) {
      setHasCompletedTour(false);
      // Resume from saved step if any
      if (savedStep) {
        setCurrentStepIndex(parseInt(savedStep, 10));
      }
    } else {
      setHasCompletedTour(true);
    }
  }, []);

  const startTour = useCallback(() => {
    setCurrentStepIndex(0);
    setIsActive(true);
    localStorage.removeItem(TOUR_STORAGE_KEY);
    setHasCompletedTour(false);
  }, []);

  const nextStep = useCallback(() => {
    if (currentStepIndex < TOUR_STEPS.length - 1) {
      const newIndex = currentStepIndex + 1;
      setCurrentStepIndex(newIndex);
      localStorage.setItem(TOUR_STEP_KEY, newIndex.toString());
    } else {
      completeTour();
    }
  }, [currentStepIndex]);

  const prevStep = useCallback(() => {
    if (currentStepIndex > 0) {
      const newIndex = currentStepIndex - 1;
      setCurrentStepIndex(newIndex);
      localStorage.setItem(TOUR_STEP_KEY, newIndex.toString());
    }
  }, [currentStepIndex]);

  const skipTour = useCallback(() => {
    completeTour();
  }, []);

  const completeTour = useCallback(() => {
    setIsActive(false);
    setHasCompletedTour(true);
    localStorage.setItem(TOUR_STORAGE_KEY, 'true');
    localStorage.removeItem(TOUR_STEP_KEY);
  }, []);

  const activateTour = useCallback(() => {
    if (!hasCompletedTour) {
      setIsActive(true);
    }
  }, [hasCompletedTour]);

  const currentStep = TOUR_STEPS[currentStepIndex];
  const progress = ((currentStepIndex + 1) / TOUR_STEPS.length) * 100;

  return {
    isActive,
    currentStep,
    currentStepIndex,
    totalSteps: TOUR_STEPS.length,
    progress,
    hasCompletedTour,
    startTour,
    nextStep,
    prevStep,
    skipTour,
    completeTour,
    activateTour,
  };
}
