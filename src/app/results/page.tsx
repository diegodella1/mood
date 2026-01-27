'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { ResultsView } from '@/components/ResultsView';

const springSmooth = { type: 'spring' as const, damping: 25, stiffness: 200 };

export default function ResultsPage() {
  return (
    <main className="min-h-screen flex flex-col relative">
      {/* Header */}
      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={springSmooth}
        className="sticky top-0 z-50 px-4 py-4"
      >
        <div className="max-w-2xl mx-auto glass-card px-5 py-3 flex items-center justify-between">
          <Link
            href="/"
            className="text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back
          </Link>
          <h1 className="font-display text-xl font-bold text-gradient-aurora">
            Results
          </h1>
          <div className="w-16" />
        </div>
      </motion.header>

      {/* Results content */}
      <div className="flex-1 overflow-y-auto pb-8">
        <ResultsView />
      </div>
    </main>
  );
}
