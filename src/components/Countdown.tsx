'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

interface CountdownProps {
  targetDate: Date;
  label?: string;
  onComplete?: () => void;
}

interface TimeLeft {
  hours: number;
  minutes: number;
  seconds: number;
}

function calculateTimeLeft(targetDate: Date): TimeLeft {
  const difference = targetDate.getTime() - new Date().getTime();

  if (difference <= 0) {
    return { hours: 0, minutes: 0, seconds: 0 };
  }

  return {
    hours: Math.floor(difference / (1000 * 60 * 60)),
    minutes: Math.floor((difference / (1000 * 60)) % 60),
    seconds: Math.floor((difference / 1000) % 60),
  };
}

export function Countdown({ targetDate, label, onComplete }: CountdownProps) {
  const [timeLeft, setTimeLeft] = useState<TimeLeft>(calculateTimeLeft(targetDate));
  const [isComplete, setIsComplete] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => {
      const newTimeLeft = calculateTimeLeft(targetDate);
      setTimeLeft(newTimeLeft);

      if (newTimeLeft.hours === 0 && newTimeLeft.minutes === 0 && newTimeLeft.seconds === 0) {
        setIsComplete(true);
        clearInterval(timer);
        onComplete?.();
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [targetDate, onComplete]);

  if (isComplete) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="text-center"
      >
        <div className="glass-card-glow px-8 py-6">
          <motion.span
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ duration: 0.5, repeat: Infinity, repeatDelay: 1 }}
            className="text-4xl inline-block mb-3"
          >
            ✨
          </motion.span>
          <p className="font-display text-lg text-[var(--color-aurora-cyan)] font-semibold glow-text-cyan">
            Window is now open!
          </p>
        </div>
      </motion.div>
    );
  }

  return (
    <div className="text-center">
      {label ? (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-sm text-[var(--color-text-muted)] mb-4 font-display"
        >
          {label}
        </motion.p>
      ) : null}

      <div className="glass-card-glow p-6 inline-block">
        <div className="flex items-center justify-center gap-3">
          <TimeUnit value={timeLeft.hours} label="hrs" index={0} />
          <span className="text-2xl text-[var(--color-aurora-violet)] font-mono">:</span>
          <TimeUnit value={timeLeft.minutes} label="min" index={1} />
          <span className="text-2xl text-[var(--color-aurora-violet)] font-mono">:</span>
          <TimeUnit value={timeLeft.seconds} label="sec" index={2} />
        </div>
      </div>
    </div>
  );
}

function TimeUnit({ value, label, index }: { value: number; label: string; index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
      className="flex flex-col items-center"
    >
      <motion.span
        key={value}
        initial={{ opacity: 0.5, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="text-4xl font-mono font-bold text-[var(--color-aurora-cyan)] glow-text-cyan bg-[var(--color-cosmic-dark)] rounded-xl px-4 py-3 min-w-[80px] border border-[var(--surface-border)]"
      >
        {String(value).padStart(2, '0')}
      </motion.span>
      <span className="text-xs text-[var(--color-text-muted)] mt-2 uppercase tracking-wider font-display">
        {label}
      </span>
    </motion.div>
  );
}
