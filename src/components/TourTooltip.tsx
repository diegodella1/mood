'use client';

import { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { createPortal } from 'react-dom';
import type { TourStep } from '@/hooks/useTour';

interface TourTooltipProps {
  step: TourStep;
  currentIndex: number;
  totalSteps: number;
  onNext: () => void;
  onPrev: () => void;
  onSkip: () => void;
  isActive: boolean;
}

const springSmooth = { type: 'spring' as const, damping: 25, stiffness: 200 };

export function TourTooltip({
  step,
  currentIndex,
  totalSteps,
  onNext,
  onPrev,
  onSkip,
  isActive,
}: TourTooltipProps) {
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const [mounted, setMounted] = useState(false);
  const tooltipRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!isActive || !step) return;

    const calculatePosition = () => {
      const target = document.querySelector(step.target);
      if (!target) return;

      const rect = target.getBoundingClientRect();
      const tooltipWidth = 300;
      const tooltipHeight = 180;
      const padding = 12;

      let top = 0;
      let left = 0;

      switch (step.position) {
        case 'top':
          top = rect.top - tooltipHeight - padding + window.scrollY;
          left = rect.left + rect.width / 2 - tooltipWidth / 2;
          break;
        case 'bottom':
          top = rect.bottom + padding + window.scrollY;
          left = rect.left + rect.width / 2 - tooltipWidth / 2;
          break;
        case 'left':
          top = rect.top + rect.height / 2 - tooltipHeight / 2 + window.scrollY;
          left = rect.left - tooltipWidth - padding;
          break;
        case 'right':
          top = rect.top + rect.height / 2 - tooltipHeight / 2 + window.scrollY;
          left = rect.right + padding;
          break;
      }

      // Keep within viewport
      left = Math.max(padding, Math.min(left, window.innerWidth - tooltipWidth - padding));
      top = Math.max(padding, top);

      setPosition({ top, left });

      // Scroll target into view if needed
      target.scrollIntoView({ behavior: 'smooth', block: 'center' });
    };

    // Small delay to ensure elements are rendered
    const timer = setTimeout(calculatePosition, 100);
    window.addEventListener('resize', calculatePosition);
    window.addEventListener('scroll', calculatePosition);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', calculatePosition);
      window.removeEventListener('scroll', calculatePosition);
    };
  }, [step, isActive]);

  // Highlight target element
  useEffect(() => {
    if (!isActive || !step) return;

    const target = document.querySelector(step.target);
    if (target) {
      target.classList.add('tour-highlight');
      return () => target.classList.remove('tour-highlight');
    }
  }, [step, isActive]);

  if (!mounted || !isActive) return null;

  const isLastStep = currentIndex === totalSteps - 1;
  const isFirstStep = currentIndex === 0;

  return createPortal(
    <AnimatePresence>
      {isActive && (
        <>
          {/* Backdrop overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 z-[100] pointer-events-none"
          />

          {/* Tooltip */}
          <motion.div
            ref={tooltipRef}
            initial={{ opacity: 0, scale: 0.9, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 10 }}
            transition={springSmooth}
            style={{
              position: 'absolute',
              top: position.top,
              left: position.left,
              width: 300,
            }}
            className="z-[101] glass-card-glow p-4 rounded-2xl shadow-2xl"
          >
            {/* Header */}
            <div className="flex items-start gap-3 mb-3">
              {step.emoji && (
                <span className="text-3xl">{step.emoji}</span>
              )}
              <div className="flex-1">
                <h3 className="font-display font-bold text-[var(--color-text-primary)] text-lg">
                  {step.title}
                </h3>
                <p className="text-[var(--color-text-muted)] text-xs">
                  Step {currentIndex + 1} of {totalSteps}
                </p>
              </div>
            </div>

            {/* Description */}
            <p className="text-[var(--color-text-secondary)] text-sm mb-4 leading-relaxed">
              {step.description}
            </p>

            {/* Progress bar */}
            <div className="h-1 bg-[var(--color-cosmic-mid)] rounded-full mb-4 overflow-hidden">
              <motion.div
                className="h-full aurora-gradient"
                initial={{ width: 0 }}
                animate={{ width: `${((currentIndex + 1) / totalSteps) * 100}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between">
              <button
                onClick={onSkip}
                className="text-[var(--color-text-muted)] text-sm hover:text-[var(--color-text-secondary)] transition-colors"
              >
                Skip tour
              </button>

              <div className="flex gap-2">
                {!isFirstStep && (
                  <button
                    onClick={onPrev}
                    className="px-3 py-1.5 text-sm font-medium text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors"
                  >
                    Back
                  </button>
                )}
                <button
                  onClick={onNext}
                  className="px-4 py-1.5 text-sm font-medium aurora-gradient rounded-lg text-white"
                >
                  {isLastStep ? 'Done!' : 'Next'}
                </button>
              </div>
            </div>

            {/* Arrow pointer */}
            <div
              className={`absolute w-3 h-3 bg-[var(--surface-glass)] rotate-45 ${
                step.position === 'top' ? 'bottom-[-6px] left-1/2 -translate-x-1/2' :
                step.position === 'bottom' ? 'top-[-6px] left-1/2 -translate-x-1/2' :
                step.position === 'left' ? 'right-[-6px] top-1/2 -translate-y-1/2' :
                'left-[-6px] top-1/2 -translate-y-1/2'
              }`}
            />
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body
  );
}
