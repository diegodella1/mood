'use client';

import { motion } from 'framer-motion';
import type { CustomWindowConfig } from '@/providers/ConfigProvider';

interface EventCountdownProps {
  customWindow: CustomWindowConfig;
  startsIn: { hours: number; minutes: number };
}

export function EventCountdown({ customWindow, startsIn }: EventCountdownProps) {
  const isStartingSoon = startsIn.hours === 0 && startsIn.minutes <= 30;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="rounded-xl border p-4"
      style={{
        borderColor: `${customWindow.color}50`,
        backgroundColor: `${customWindow.color}10`,
      }}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-3xl">{customWindow.icon}</span>
          <div>
            <p className="text-zinc-400 text-xs uppercase tracking-wide">Coming Up</p>
            <h4 className="text-white font-semibold">{customWindow.name}</h4>
          </div>
        </div>

        {/* Countdown */}
        <div className="text-right">
          <div className="flex items-center gap-1">
            <motion.div
              animate={isStartingSoon ? { scale: [1, 1.1, 1] } : {}}
              transition={{ duration: 1, repeat: Infinity }}
              className={`font-mono font-bold text-xl ${
                isStartingSoon ? 'text-yellow-400' : 'text-white'
              }`}
            >
              {startsIn.hours > 0 && (
                <>
                  <span>{startsIn.hours}</span>
                  <span className="text-zinc-500 text-sm">h</span>
                  <span className="mx-1">:</span>
                </>
              )}
              <span>{String(startsIn.minutes).padStart(2, '0')}</span>
              <span className="text-zinc-500 text-sm">m</span>
            </motion.div>
          </div>
          <p className="text-zinc-500 text-xs">until start</p>
        </div>
      </div>

      {/* Rewards preview */}
      <div className="flex items-center gap-3 mt-3 pt-3 border-t border-white/5">
        {customWindow.xp_multiplier > 1 && (
          <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
            <span className="text-yellow-400 text-sm font-medium">
              {customWindow.xp_multiplier}x XP
            </span>
          </div>
        )}
        {customWindow.lucky_drop_boost > 1 && (
          <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-purple-500/10 border border-purple-500/20">
            <span className="text-purple-400 text-sm">🎁</span>
            <span className="text-purple-400 text-sm font-medium">
              {customWindow.lucky_drop_boost}x drops
            </span>
          </div>
        )}
        {isStartingSoon && (
          <motion.span
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 1.5, repeat: Infinity }}
            className="text-yellow-400 text-sm ml-auto"
          >
            Starting soon!
          </motion.span>
        )}
      </div>
    </motion.div>
  );
}
