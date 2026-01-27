'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';

const springSmooth = { type: 'spring' as const, damping: 25, stiffness: 200 };

const features = [
  {
    emoji: '🌍',
    title: 'Global Connection',
    description: 'See how people around the world are feeling in real-time. Connect through shared emotions across cities and continents.',
  },
  {
    emoji: '⏰',
    title: 'Time Windows',
    description: 'Three daily windows to share your mood: Morning, Afternoon, and Night. Each window captures the collective pulse of that moment.',
  },
  {
    emoji: '🔥',
    title: 'Streaks & Engagement',
    description: 'Build your streak by participating consistently. React to others\' moods and watch the global mood shift throughout the day.',
  },
  {
    emoji: '📊',
    title: 'Live Results',
    description: 'Interactive charts and a world map show you the dominant mood in your city and globally. Discover patterns and trends.',
  },
];

const howToPlay = [
  {
    step: 1,
    title: 'Wait for the Window',
    description: 'Global Pulse opens three times a day. A countdown shows you when the next window starts.',
    emoji: '⏳',
  },
  {
    step: 2,
    title: 'Choose Your Mood',
    description: 'Pick from suggested emojis or choose any emoji that represents how you\'re feeling right now.',
    emoji: '😊',
  },
  {
    step: 3,
    title: 'Send Your Pulse',
    description: 'Your mood joins thousands of others around the world. Your voice is part of the global chorus.',
    emoji: '📤',
  },
  {
    step: 4,
    title: 'Explore Results',
    description: 'See the dominant mood globally and in your city. Navigate the world map to discover how others feel.',
    emoji: '🗺️',
  },
];

export default function AboutPage() {
  return (
    <main className="min-h-screen pt-8 pb-24">
      <div className="cosmic-bg" />

      <div className="max-w-2xl mx-auto px-6">
        {/* Hero Section */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={springSmooth}
          className="text-center mb-12"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', damping: 10, stiffness: 100 }}
            className="text-7xl mb-6"
          >
            🌐
          </motion.div>
          <h1 className="font-display text-4xl font-bold text-gradient-aurora mb-4">
            Global Pulse
          </h1>
          <p className="text-lg text-[var(--color-text-secondary)] leading-relaxed">
            A real-time emotional pulse of the world. Share how you feel. See how the world feels. Together.
          </p>
        </motion.section>

        {/* What is Global Pulse */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...springSmooth, delay: 0.1 }}
          className="mb-12"
        >
          <h2 className="font-display text-2xl font-bold text-[var(--color-text-primary)] mb-4 flex items-center gap-3">
            <span className="text-2xl">✨</span>
            <span>What is Global Pulse?</span>
          </h2>
          <div className="glass-card p-6 space-y-4">
            <p className="text-[var(--color-text-secondary)] leading-relaxed">
              Global Pulse is a social experiment that captures the collective mood of humanity in real-time.
              Three times a day, people around the world share how they&apos;re feeling with a single emoji.
            </p>
            <p className="text-[var(--color-text-secondary)] leading-relaxed">
              These individual pulses combine to create a living map of human emotion—showing which moods
              dominate your city, your country, and the entire planet at any given moment.
            </p>
            <p className="text-[var(--color-text-secondary)] leading-relaxed">
              It&apos;s not about posting or scrolling. It&apos;s about feeling connected to something bigger
              than yourself. One emoji. One moment. Millions of people.
            </p>
          </div>
        </motion.section>

        {/* How to Play */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...springSmooth, delay: 0.2 }}
          className="mb-12"
        >
          <h2 className="font-display text-2xl font-bold text-[var(--color-text-primary)] mb-6 flex items-center gap-3">
            <span className="text-2xl">🎮</span>
            <span>How to Play</span>
          </h2>
          <div className="space-y-4">
            {howToPlay.map((item, index) => (
              <motion.div
                key={item.step}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ ...springSmooth, delay: 0.25 + index * 0.08 }}
                className="glass-card-subtle p-5 flex items-start gap-4"
              >
                <div className="flex-shrink-0">
                  <div className="w-10 h-10 rounded-full bg-[var(--color-aurora-cyan)]/20 border border-[var(--color-aurora-cyan)]/40 flex items-center justify-center">
                    <span className="font-mono font-bold text-[var(--color-aurora-cyan)]">
                      {item.step}
                    </span>
                  </div>
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xl">{item.emoji}</span>
                    <h3 className="font-display font-semibold text-[var(--color-text-primary)]">
                      {item.title}
                    </h3>
                  </div>
                  <p className="text-[var(--color-text-muted)] text-sm leading-relaxed">
                    {item.description}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.section>

        {/* Features */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...springSmooth, delay: 0.4 }}
          className="mb-12"
        >
          <h2 className="font-display text-2xl font-bold text-[var(--color-text-primary)] mb-6 flex items-center gap-3">
            <span className="text-2xl">💫</span>
            <span>Features</span>
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {features.map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ ...springSmooth, delay: 0.45 + index * 0.08 }}
                className="glass-card p-5"
              >
                <span className="text-3xl mb-3 block">{feature.emoji}</span>
                <h3 className="font-display font-semibold text-[var(--color-text-primary)] mb-2">
                  {feature.title}
                </h3>
                <p className="text-[var(--color-text-muted)] text-sm leading-relaxed">
                  {feature.description}
                </p>
              </motion.div>
            ))}
          </div>
        </motion.section>

        {/* Time Windows */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...springSmooth, delay: 0.6 }}
          className="mb-12"
        >
          <h2 className="font-display text-2xl font-bold text-[var(--color-text-primary)] mb-4 flex items-center gap-3">
            <span className="text-2xl">🕐</span>
            <span>Time Windows</span>
          </h2>
          <div className="glass-card-glow p-6">
            <p className="text-[var(--color-text-secondary)] mb-5 leading-relaxed">
              Global Pulse operates on synchronized time windows (UTC) so everyone around the world
              participates together:
            </p>
            <div className="space-y-3">
              <div className="flex items-center gap-4 p-3 rounded-xl bg-[var(--color-cosmic-dark)]">
                <span className="text-2xl">🌅</span>
                <div>
                  <span className="font-display font-semibold text-[var(--color-aurora-amber)]">Morning</span>
                  <span className="text-[var(--color-text-muted)] ml-2 font-mono text-sm">06:00 - 12:00 UTC</span>
                </div>
              </div>
              <div className="flex items-center gap-4 p-3 rounded-xl bg-[var(--color-cosmic-dark)]">
                <span className="text-2xl">☀️</span>
                <div>
                  <span className="font-display font-semibold text-[var(--color-aurora-cyan)]">Afternoon</span>
                  <span className="text-[var(--color-text-muted)] ml-2 font-mono text-sm">12:00 - 18:00 UTC</span>
                </div>
              </div>
              <div className="flex items-center gap-4 p-3 rounded-xl bg-[var(--color-cosmic-dark)]">
                <span className="text-2xl">🌙</span>
                <div>
                  <span className="font-display font-semibold text-[var(--color-aurora-violet)]">Night</span>
                  <span className="text-[var(--color-text-muted)] ml-2 font-mono text-sm">18:00 - 06:00 UTC</span>
                </div>
              </div>
            </div>
          </div>
        </motion.section>

        {/* CTA */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...springSmooth, delay: 0.7 }}
          className="text-center"
        >
          <div className="glass-card-glow p-8">
            <motion.div
              animate={{ scale: [1, 1.1, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="text-5xl mb-4"
            >
              💜
            </motion.div>
            <h3 className="font-display text-xl font-bold text-[var(--color-text-primary)] mb-3">
              Ready to join?
            </h3>
            <p className="text-[var(--color-text-muted)] mb-6">
              Your pulse matters. Add your voice to the global chorus.
            </p>
            <Link
              href="/"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl font-display font-semibold aurora-gradient text-black btn-glow transition-transform hover:scale-105"
            >
              <span>Send Your Pulse</span>
              <span>→</span>
            </Link>
          </div>
        </motion.section>

        {/* Back Link */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="text-center mt-8"
        >
          <Link
            href="/"
            className="text-[var(--color-text-muted)] hover:text-[var(--color-aurora-cyan)] transition-colors text-sm"
          >
            ← Back to Home
          </Link>
        </motion.div>
      </div>
    </main>
  );
}
