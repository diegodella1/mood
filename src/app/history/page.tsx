'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { useUser } from '@/providers/UserProvider';
import { HistoryCalendar } from '@/components/HistoryCalendar';
import { HistoryTimeline } from '@/components/HistoryTimeline';
import { InsightsCard } from '@/components/InsightsCard';

interface PulseEntry {
  id: string;
  mood: string;
  note: string | null;
  window_id: string;
  created_at: string;
}

interface HistoryData {
  pulses: Record<string, PulseEntry[]>;
  stats: {
    total_pulses: number;
    most_common_mood: string | null;
    mood_by_day_of_week: Record<string, string>;
    week_pulses: Array<{ date: string; mood: string }>;
    mood_streak: number;
  } | null;
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const springSmooth = { type: 'spring' as const, damping: 30, stiffness: 200 };

export default function HistoryPage() {
  const { user, isLoading: userLoading } = useUser();
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [data, setData] = useState<HistoryData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const fetchHistory = useCallback(async () => {
    if (!user?.id) return;
    setIsLoading(true);
    try {
      const res = await fetch(`/api/history?userId=${user.id}&year=${year}&month=${month}`);
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (error) {
      console.error('Failed to fetch history:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user?.id, year, month]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  const goToPreviousMonth = () => {
    if (month === 1) {
      setMonth(12);
      setYear(year - 1);
    } else {
      setMonth(month - 1);
    }
    setSelectedDate(null);
  };

  const goToNextMonth = () => {
    const isCurrentMonth = year === now.getFullYear() && month === now.getMonth() + 1;
    if (isCurrentMonth) return;
    if (month === 12) {
      setMonth(1);
      setYear(year + 1);
    } else {
      setMonth(month + 1);
    }
    setSelectedDate(null);
  };

  const isCurrentMonth = year === now.getFullYear() && month === now.getMonth() + 1;

  if (userLoading) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <div className="w-12 h-12 border-3 border-[var(--color-aurora-cyan)] border-t-transparent rounded-full animate-spin" />
      </main>
    );
  }

  const selectedDayPulses = selectedDate && data?.pulses[selectedDate] ? data.pulses[selectedDate] : [];

  return (
    <main className="min-h-screen flex flex-col">
      {/* Header */}
      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={springSmooth}
        className="sticky top-0 z-50 px-4 py-4"
      >
        <div className="max-w-lg mx-auto glass-card px-5 py-3 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            <span className="text-sm">Back</span>
          </Link>
          <h1 className="font-display text-lg font-bold text-[var(--color-text-primary)]">
            History
          </h1>
          <div className="w-16" />
        </div>
      </motion.header>

      <div className="flex-1 px-4 py-4">
        <div className="max-w-lg mx-auto space-y-6">
          {/* Stats bar */}
          {data?.stats && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ ...springSmooth, delay: 0.1 }}
              className="glass-card p-4 flex items-center justify-around"
            >
              <div className="text-center">
                <p className="text-xl font-bold text-[var(--color-text-primary)]">{data.stats.total_pulses}</p>
                <p className="text-xs text-[var(--color-text-muted)]">Total</p>
              </div>
              {data.stats.most_common_mood && (
                <div className="text-center">
                  <p className="text-xl">{data.stats.most_common_mood}</p>
                  <p className="text-xs text-[var(--color-text-muted)]">Top mood</p>
                </div>
              )}
              {data.stats.mood_streak > 1 && (
                <div className="text-center">
                  <p className="text-xl font-bold text-[var(--color-aurora-cyan)]">{data.stats.mood_streak}</p>
                  <p className="text-xs text-[var(--color-text-muted)]">Mood streak</p>
                </div>
              )}
            </motion.div>
          )}

          {/* Month selector */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ ...springSmooth, delay: 0.15 }}
            className="flex items-center justify-between"
          >
            <button
              onClick={goToPreviousMonth}
              className="p-2 rounded-lg glass-card-subtle hover:bg-[var(--surface-glass)] transition-all"
            >
              <svg className="w-5 h-5 text-[var(--color-text-secondary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <h2 className="font-display text-lg font-bold text-[var(--color-text-primary)]">
              {MONTH_NAMES[month - 1]} {year}
            </h2>
            <button
              onClick={goToNextMonth}
              disabled={isCurrentMonth}
              className="p-2 rounded-lg glass-card-subtle hover:bg-[var(--surface-glass)] transition-all disabled:opacity-30"
            >
              <svg className="w-5 h-5 text-[var(--color-text-secondary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </motion.div>

          {/* Calendar */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...springSmooth, delay: 0.2 }}
          >
            {isLoading ? (
              <div className="h-64 flex items-center justify-center">
                <div className="w-8 h-8 border-2 border-[var(--color-aurora-cyan)] border-t-transparent rounded-full animate-spin" />
              </div>
            ) : (
              <HistoryCalendar
                year={year}
                month={month}
                pulses={data?.pulses || {}}
                onDaySelect={setSelectedDate}
                selectedDate={selectedDate}
              />
            )}
          </motion.div>

          {/* Timeline for selected day */}
          {selectedDate && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={springSmooth}
            >
              <h3 className="text-sm font-medium text-[var(--color-text-primary)] mb-3">
                {new Date(selectedDate + 'T12:00:00').toLocaleDateString('en-US', {
                  weekday: 'long',
                  month: 'long',
                  day: 'numeric',
                })}
              </h3>
              <HistoryTimeline pulses={selectedDayPulses} />
            </motion.div>
          )}

          {/* Insights */}
          {user && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ ...springSmooth, delay: 0.3 }}
            >
              <InsightsCard userId={user.id} />
            </motion.div>
          )}
        </div>
      </div>
    </main>
  );
}
