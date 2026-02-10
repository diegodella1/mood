'use client';

import { motion } from 'framer-motion';
import { formatDistanceToNow } from '@/lib/utils';

interface PulseEntry {
  id: string;
  mood: string;
  note: string | null;
  window_id: string;
  created_at: string;
}

interface HistoryTimelineProps {
  pulses: PulseEntry[];
}

const springSmooth = { type: 'spring' as const, damping: 25, stiffness: 200 };

function getWindowLabel(windowId: string): string {
  // window_id format: "YYYY-MM-DD|window_type|tz"
  const parts = windowId.split('|');
  const windowType = parts[1] || '';
  const icons: Record<string, string> = {
    morning: '🌅',
    afternoon: '☀️',
    night: '🌙',
  };
  return `${icons[windowType] || '⏰'} ${windowType.charAt(0).toUpperCase() + windowType.slice(1)}`;
}

export function HistoryTimeline({ pulses }: HistoryTimelineProps) {
  if (pulses.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-sm text-[var(--color-text-muted)]">No pulses on this day</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {pulses.map((pulse, index) => (
        <motion.div
          key={pulse.id}
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ ...springSmooth, delay: index * 0.05 }}
          className="flex gap-3 p-3 glass-card-subtle rounded-xl"
        >
          {/* Emoji */}
          <div className="w-10 h-10 rounded-full glass-card flex items-center justify-center text-xl flex-shrink-0">
            {pulse.mood}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-xs text-[var(--color-aurora-cyan)] font-medium">
                {getWindowLabel(pulse.window_id)}
              </span>
              <span className="text-xs text-[var(--color-text-muted)]">
                {formatDistanceToNow(new Date(pulse.created_at))}
              </span>
            </div>
            {pulse.note && (
              <p className="text-sm text-[var(--color-text-secondary)] mt-1 leading-relaxed">
                {pulse.note}
              </p>
            )}
          </div>
        </motion.div>
      ))}
    </div>
  );
}
