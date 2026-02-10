'use client';

import { motion } from 'framer-motion';

interface PulseEntry {
  id: string;
  mood: string;
  note: string | null;
  window_id: string;
  created_at: string;
}

interface HistoryCalendarProps {
  year: number;
  month: number; // 1-indexed
  pulses: Record<string, PulseEntry[]>;
  onDaySelect?: (date: string) => void;
  selectedDate?: string | null;
}

const DAY_HEADERS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function HistoryCalendar({ year, month, pulses, onDaySelect, selectedDate }: HistoryCalendarProps) {
  const firstDay = new Date(year, month - 1, 1);
  const lastDay = new Date(year, month, 0);
  const startDow = firstDay.getDay(); // 0=Sun
  const daysInMonth = lastDay.getDate();

  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];

  // Build cells: leading blanks + day cells
  const cells: Array<{ day: number | null; dateStr: string | null }> = [];
  for (let i = 0; i < startDow; i++) {
    cells.push({ day: null, dateStr: null });
  }
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    cells.push({ day: d, dateStr });
  }

  return (
    <div>
      {/* Day headers */}
      <div className="grid grid-cols-7 gap-1 mb-2">
        {DAY_HEADERS.map((h) => (
          <div key={h} className="text-center text-xs text-[var(--color-text-muted)] font-medium py-1">
            {h}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-1">
        {cells.map((cell, i) => {
          if (!cell.day || !cell.dateStr) {
            return <div key={`blank-${i}`} />;
          }

          const dayPulses = pulses[cell.dateStr] || [];
          const primaryMood = dayPulses[0]?.mood;
          const isToday = cell.dateStr === todayStr;
          const isSelected = cell.dateStr === selectedDate;
          const isFuture = new Date(cell.dateStr) > today;

          return (
            <motion.button
              key={cell.dateStr}
              whileTap={{ scale: 0.9 }}
              onClick={() => dayPulses.length > 0 && onDaySelect?.(cell.dateStr!)}
              disabled={dayPulses.length === 0}
              className={`
                aspect-square rounded-xl flex flex-col items-center justify-center text-sm transition-all
                ${isToday ? 'ring-2 ring-[var(--color-aurora-cyan)]' : ''}
                ${isSelected ? 'bg-[var(--color-aurora-cyan)]/20' : ''}
                ${dayPulses.length > 0 ? 'glass-card-subtle cursor-pointer hover:bg-[var(--surface-glass)]' : ''}
                ${isFuture ? 'opacity-30' : ''}
              `}
            >
              <span className={`text-xs ${isToday ? 'text-[var(--color-aurora-cyan)] font-bold' : 'text-[var(--color-text-muted)]'}`}>
                {cell.day}
              </span>
              {primaryMood && (
                <span className="text-base leading-none mt-0.5">{primaryMood}</span>
              )}
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
