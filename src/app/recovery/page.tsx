'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { STORAGE_KEYS } from '@/lib/constants';

const springSmooth = { type: 'spring' as const, damping: 25, stiffness: 200 };

type Step = 'email' | 'code' | 'success';

export default function RecoveryPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recoveredUser, setRecoveredUser] = useState<{
    streakDays: number;
    maxStreakEver: number;
    aura: string | null;
  } | null>(null);

  const handleRequestCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/recovery/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to send code');
      }

      setStep('code');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/recovery/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Invalid code');
      }

      // Save the recovered userId to localStorage
      localStorage.setItem(STORAGE_KEYS.USER_ID, data.userId);

      setRecoveredUser(data.user);
      setStep('success');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setIsLoading(false);
    }
  };

  const handleContinue = () => {
    // Reload the app to use the new userId
    window.location.href = '/';
  };

  return (
    <main className="min-h-screen flex flex-col relative">
      {/* Header */}
      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={springSmooth}
        className="sticky top-0 z-50 px-4 py-4"
      >
        <div className="max-w-lg mx-auto glass-card px-5 py-3 flex items-center justify-between">
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
            Recovery
          </h1>
          <div className="w-16" />
        </div>
      </motion.header>

      {/* Content */}
      <div className="flex-1 flex items-center justify-center px-4 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={springSmooth}
          className="w-full max-w-md"
        >
          <AnimatePresence mode="wait">
            {step === 'email' && (
              <motion.div
                key="email"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="glass-card p-8"
              >
                <div className="text-center mb-8">
                  <div className="text-5xl mb-4">📧</div>
                  <h2 className="font-display text-2xl font-bold text-[var(--color-text-primary)] mb-2">
                    Recover Your Account
                  </h2>
                  <p className="text-[var(--color-text-secondary)]">
                    Enter the email associated with your account
                  </p>
                </div>

                <form onSubmit={handleRequestCode} className="space-y-4">
                  <div>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="your@email.com"
                      required
                      className="w-full px-4 py-3 bg-[var(--surface-glass)] border border-[var(--surface-border)] rounded-xl text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:border-[var(--color-aurora-cyan)]"
                    />
                  </div>

                  {error && (
                    <motion.p
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="text-red-400 text-sm text-center"
                    >
                      {error}
                    </motion.p>
                  )}

                  <motion.button
                    type="submit"
                    disabled={isLoading || !email}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="w-full py-4 aurora-gradient rounded-xl font-display font-bold text-white disabled:opacity-50"
                  >
                    {isLoading ? 'Sending...' : 'Send Recovery Code'}
                  </motion.button>
                </form>
              </motion.div>
            )}

            {step === 'code' && (
              <motion.div
                key="code"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="glass-card p-8"
              >
                <div className="text-center mb-8">
                  <div className="text-5xl mb-4">🔐</div>
                  <h2 className="font-display text-2xl font-bold text-[var(--color-text-primary)] mb-2">
                    Enter Code
                  </h2>
                  <p className="text-[var(--color-text-secondary)]">
                    We sent a 6-digit code to<br />
                    <span className="text-[var(--color-aurora-cyan)]">{email}</span>
                  </p>
                </div>

                <form onSubmit={handleVerifyCode} className="space-y-4">
                  <div>
                    <input
                      type="text"
                      value={code}
                      onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      placeholder="000000"
                      required
                      maxLength={6}
                      className="w-full px-4 py-4 bg-[var(--surface-glass)] border border-[var(--surface-border)] rounded-xl text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:border-[var(--color-aurora-cyan)] text-center font-mono text-2xl tracking-widest"
                    />
                  </div>

                  {error && (
                    <motion.p
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="text-red-400 text-sm text-center"
                    >
                      {error}
                    </motion.p>
                  )}

                  <motion.button
                    type="submit"
                    disabled={isLoading || code.length !== 6}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="w-full py-4 aurora-gradient rounded-xl font-display font-bold text-white disabled:opacity-50"
                  >
                    {isLoading ? 'Verifying...' : 'Verify Code'}
                  </motion.button>

                  <button
                    type="button"
                    onClick={() => {
                      setStep('email');
                      setCode('');
                      setError(null);
                    }}
                    className="w-full py-3 text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors text-sm"
                  >
                    Try a different email
                  </button>
                </form>

                <p className="text-xs text-[var(--color-text-muted)] text-center mt-6">
                  Code expires in 15 minutes
                </p>
              </motion.div>
            )}

            {step === 'success' && recoveredUser && (
              <motion.div
                key="success"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="glass-card-glow p-8 text-center"
              >
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', damping: 10 }}
                  className="text-6xl mb-4"
                >
                  🎉
                </motion.div>

                <h2 className="font-display text-2xl font-bold text-gradient-aurora mb-4">
                  Account Recovered!
                </h2>

                <div className="glass-card-subtle p-4 rounded-xl mb-6">
                  <div className="flex items-center justify-center gap-4">
                    {recoveredUser.aura && (
                      <span className="text-3xl">
                        {recoveredUser.aura === 'fire' ? '🔥' : recoveredUser.aura === 'lightning' ? '⚡' : '💎'}
                      </span>
                    )}
                    <div>
                      <p className="text-3xl font-mono font-bold text-[var(--color-text-primary)]">
                        {recoveredUser.streakDays}
                      </p>
                      <p className="text-sm text-[var(--color-text-muted)]">day streak</p>
                    </div>
                  </div>
                  {recoveredUser.maxStreakEver > recoveredUser.streakDays && (
                    <p className="text-xs text-[var(--color-text-muted)] mt-2">
                      Best: {recoveredUser.maxStreakEver} days
                    </p>
                  )}
                </div>

                <motion.button
                  onClick={handleContinue}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="w-full py-4 aurora-gradient rounded-xl font-display font-bold text-white"
                >
                  Continue to App
                </motion.button>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </main>
  );
}
