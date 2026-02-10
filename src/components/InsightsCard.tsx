'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

interface WeekPulse {
  date: string;
  mood: string;
}

interface Insights {
  total_pulses: number;
  most_common_mood: string | null;
  mood_by_day_of_week: Record<string, string>;
  week_pulses: WeekPulse[];
  mood_streak: number;
}

interface InsightsCardProps {
  userId: string;
  compact?: boolean;
}

const DAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

export function InsightsCard({ userId, compact }: InsightsCardProps) {
  const [insights, setInsights] = useState<Insights | null>(null);

  useEffect(() => {
    if (!userId) return;
    fetch(`/api/insights?userId=${userId}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.insights) setInsights(data.insights);
      })
      .catch(() => {});
  }, [userId]);

  if (!insights) return null;

  // Build last 7 days with mood emojis
  const today = new Date();
  const weekDays: Array<{ label: string; mood: string | null; isToday: boolean }> = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];
    const pulse = insights.week_pulses.find((p) => p.date === dateStr);
    weekDays.push({
      label: DAY_LABELS[d.getDay()],
      mood: pulse?.mood || null,
      isToday: i === 0,
    });
  }

  if (compact) {
    return (
      <div className="glass-card-subtle p-3 rounded-xl">
        <p className="text-xs text-[var(--color-text-muted)] uppercase tracking-widest mb-2">
          Your week
        </p>
        <div className="flex items-center justify-between">
          {weekDays.map((day, i) => (
            <div key={i} className="flex flex-col items-center gap-1">
              <span className={`text-xs ${day.isToday ? 'text-[var(--color-aurora-cyan)] font-bold' : 'text-[var(--color-text-muted)]'}`}>
                {day.label}
              </span>
              <span className="text-lg">{day.mood || '·'}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-card p-5 space-y-4"
    >
      <h3 className="font-display text-lg font-bold text-[var(--color-text-primary)]">
        Your Insights
      </h3>

      {/* Week strip */}
      <div>
        <p className="text-xs text-[var(--color-text-muted)] uppercase tracking-widest mb-2">
          This week
        </p>
        <div className="flex items-center justify-between">
          {weekDays.map((day, i) => (
            <div key={i} className="flex flex-col items-center gap-1">
              <span className={`text-xs ${day.isToday ? 'text-[var(--color-aurora-cyan)] font-bold' : 'text-[var(--color-text-muted)]'}`}>
                {day.label}
              </span>
              <div className={`w-10 h-10 rounded-full flex items-center justify-center text-xl ${
                day.isToday ? 'ring-2 ring-[var(--color-aurora-cyan)]' : ''
              } ${day.mood ? 'glass-card-subtle' : ''}`}>
                {day.mood || '·'}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Stats row */}
      <div className="flex items-center justify-between pt-3 border-t border-[var(--surface-border)]">
        <div className="text-center">
          <p className="text-2xl font-bold text-[var(--color-text-primary)]">{insights.total_pulses}</p>
          <p className="text-xs text-[var(--color-text-muted)]">Total pulses</p>
        </div>
        {insights.most_common_mood && (
          <div className="text-center">
            <p className="text-2xl">{insights.most_common_mood}</p>
            <p className="text-xs text-[var(--color-text-muted)]">Top mood</p>
          </div>
        )}
        {insights.mood_streak > 1 && (
          <div className="text-center">
            <p className="text-2xl font-bold text-[var(--color-aurora-cyan)]">{insights.mood_streak}</p>
            <p className="text-xs text-[var(--color-text-muted)]">Mood streak</p>
          </div>
        )}
      </div>

      {/* Mood by day pattern */}
      {Object.keys(insights.mood_by_day_of_week).length > 0 && (
        <div className="pt-3 border-t border-[var(--surface-border)]">
          <p className="text-xs text-[var(--color-text-muted)] uppercase tracking-widest mb-2">
            Your mood pattern
          </p>
          <div className="flex items-center justify-between">
            {DAY_LABELS.map((label, i) => (
              <div key={i} className="flex flex-col items-center gap-1">
                <span className="text-xs text-[var(--color-text-muted)]">{label}</span>
                <span className="text-lg">{insights.mood_by_day_of_week[String(i)] || '·'}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </motion.div>
  );
}
