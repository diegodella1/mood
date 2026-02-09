'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CITIES } from '@/lib/cities';

interface OnboardingProps {
  onComplete: (city?: string) => void;
}

const ONBOARDING_STEPS = [
  {
    emoji: '🌍',
    title: 'Welcome to Global Pulse',
    description: 'One tap to share how you feel. See how the world feels back. Pulse 3x daily: morning, afternoon, night.',
    highlight: '🌅 Morning • ☀️ Afternoon • 🌙 Night',
    type: 'info' as const,
  },
  {
    emoji: '🔥',
    title: 'Streaks, XP & Surprises',
    description: 'Pulse daily to build your streak, earn XP, level up, and unlock auras. Every pulse has a 5% Lucky Drop chance!',
    highlight: '🔥 7d Fire • ⚡ 30d Lightning • 💎 100d Diamond (permanent!)',
    type: 'info' as const,
  },
  {
    emoji: '📍',
    title: 'Where are you?',
    description: 'Pick your city to compete in leaderboards and city battles. Optional — you can change this anytime.',
    highlight: 'Help us map the world\'s emotions',
    type: 'city' as const,
  },
];

const springSmooth = { type: 'spring' as const, damping: 25, stiffness: 200 };
const springBouncy = { type: 'spring' as const, damping: 12, stiffness: 100 };

// Popular cities for quick selection
const POPULAR_CITIES = [
  'Buenos Aires', 'New York', 'London', 'Tokyo', 'São Paulo',
  'Mexico City', 'Madrid', 'Paris', 'Berlin', 'Sydney'
];

export function Onboarding({ onComplete }: OnboardingProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [selectedCity, setSelectedCity] = useState<string>('');
  const [citySearch, setCitySearch] = useState('');

  const filteredCities = citySearch.length > 1
    ? CITIES.filter(c => c.toLowerCase().includes(citySearch.toLowerCase())).slice(0, 6)
    : POPULAR_CITIES;

  const handleNext = () => {
    if (currentStep < ONBOARDING_STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      onComplete(selectedCity || undefined);
    }
  };

  const handleSkip = () => {
    onComplete(selectedCity || undefined);
  };

  const step = ONBOARDING_STEPS[currentStep];
  const isLastStep = currentStep === ONBOARDING_STEPS.length - 1;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[var(--color-space)] p-6"
    >
      {/* Skip button */}
      {!isLastStep && (
        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          onClick={handleSkip}
          className="absolute top-6 right-6 text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)] transition-colors"
        >
          Skip
        </motion.button>
      )}

      {/* Content */}
      <div className="flex-1 flex flex-col items-center justify-center max-w-sm">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            transition={springSmooth}
            className="text-center"
          >
            {/* Emoji */}
            <motion.div
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={springBouncy}
              className="text-8xl mb-8"
            >
              {step.emoji}
            </motion.div>

            {/* Title */}
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ ...springSmooth, delay: 0.1 }}
              className="font-display text-3xl font-bold text-gradient-aurora mb-4"
            >
              {step.title}
            </motion.h1>

            {/* Description */}
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ ...springSmooth, delay: 0.2 }}
              className="text-[var(--color-text-secondary)] text-lg mb-6 leading-relaxed"
            >
              {step.description}
            </motion.p>

            {/* Highlight or City Selector */}
            {step.type === 'city' ? (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ ...springSmooth, delay: 0.3 }}
                className="w-full space-y-4"
              >
                {/* Search input */}
                <input
                  type="text"
                  placeholder="Search your city..."
                  value={citySearch}
                  onChange={(e) => setCitySearch(e.target.value)}
                  className="w-full px-4 py-3 glass-card text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] rounded-xl focus:outline-none focus:ring-2 focus:ring-[var(--color-aurora-cyan)]"
                />

                {/* City options */}
                <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto">
                  {filteredCities.map((city) => (
                    <button
                      key={city}
                      onClick={() => setSelectedCity(city)}
                      className={`px-3 py-2 rounded-xl text-sm font-medium transition-all ${
                        selectedCity === city
                          ? 'aurora-gradient text-white'
                          : 'glass-card-subtle text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'
                      }`}
                    >
                      {city}
                    </button>
                  ))}
                </div>

                {selectedCity && (
                  <p className="text-center text-[var(--color-aurora-cyan)] text-sm">
                    Selected: {selectedCity}
                  </p>
                )}
              </motion.div>
            ) : (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ ...springSmooth, delay: 0.3 }}
                className="inline-block px-4 py-2 glass-card-subtle text-[var(--color-aurora-cyan)] font-medium text-sm"
              >
                {step.highlight}
              </motion.div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Progress & Button */}
      <div className="w-full max-w-sm space-y-6">
        {/* Progress dots */}
        <div className="flex items-center justify-center gap-2">
          {ONBOARDING_STEPS.map((_, index) => (
            <motion.div
              key={index}
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.4 + index * 0.1 }}
              className={`w-2 h-2 rounded-full transition-all ${
                index === currentStep
                  ? 'w-8 bg-gradient-to-r from-[var(--color-aurora-cyan)] to-[var(--color-aurora-violet)]'
                  : index < currentStep
                  ? 'bg-[var(--color-aurora-cyan)]'
                  : 'bg-[var(--color-cosmic-mid)]'
              }`}
            />
          ))}
        </div>

        {/* Next button */}
        <motion.button
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          onClick={handleNext}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="w-full py-4 aurora-gradient rounded-2xl font-display font-bold text-white text-lg shadow-lg shadow-[var(--glow-cyan)]"
        >
          {isLastStep ? (selectedCity ? "Let's Go! 🚀" : "Skip & Start") : 'Next'}
        </motion.button>

        {/* Skip city selection hint */}
        {step.type === 'city' && !selectedCity && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.7 }}
            className="text-center text-[var(--color-text-muted)] text-xs"
          >
            You can always set your city later in Profile
          </motion.p>
        )}
      </div>
    </motion.div>
  );
}
