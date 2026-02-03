'use client';

import { motion } from 'framer-motion';
import type { CustomWindowConfig } from '@/providers/ConfigProvider';

interface CustomWindowBannerProps {
  customWindow: CustomWindowConfig;
  remainingMinutes: number;
  participantCount?: number;
}

export function CustomWindowBanner({
  customWindow,
  remainingMinutes,
  participantCount,
}: CustomWindowBannerProps) {
  const isUrgent = remainingMinutes <= 30;
  const isCritical = remainingMinutes <= 15;

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative overflow-hidden rounded-2xl border-2"
      style={{
        borderColor: customWindow.color,
        backgroundColor: `${customWindow.color}15`,
      }}
    >
      {/* Background gradient */}
      <div
        className="absolute inset-0 opacity-10"
        style={{
          background: `linear-gradient(135deg, ${customWindow.color} 0%, transparent 50%)`,
        }}
      />

      {/* Banner image if present */}
      {customWindow.banner_url && (
        <div className="absolute inset-0 opacity-20">
          <img
            src={customWindow.banner_url}
            alt=""
            className="w-full h-full object-cover"
          />
        </div>
      )}

      <div className="relative p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <motion.span
              animate={{ scale: [1, 1.1, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="text-4xl"
            >
              {customWindow.icon}
            </motion.span>
            <div>
              <h3 className="font-bold text-white text-lg">{customWindow.name}</h3>
              {customWindow.description && (
                <p className="text-zinc-400 text-sm line-clamp-1">
                  {customWindow.description}
                </p>
              )}
            </div>
          </div>

          {/* XP Multiplier Badge */}
          {customWindow.xp_multiplier > 1 && (
            <motion.div
              animate={{ scale: [1, 1.05, 1] }}
              transition={{ duration: 1.5, repeat: Infinity }}
              className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-yellow-500/20 border border-yellow-500/50"
            >
              <span className="text-yellow-400 font-bold text-lg">
                {customWindow.xp_multiplier}x
              </span>
              <span className="text-yellow-400 text-sm">XP</span>
            </motion.div>
          )}
        </div>

        {/* Bottom info row */}
        <div className="flex items-center justify-between mt-3 pt-3 border-t border-white/10">
          {/* Time remaining */}
          <div className="flex items-center gap-2">
            <span className={`text-2xl ${isCritical ? 'animate-pulse' : ''}`}>
              {isCritical ? '⚡' : isUrgent ? '⏰' : '🕐'}
            </span>
            <div>
              <p className={`font-mono font-bold ${
                isCritical
                  ? 'text-red-400'
                  : isUrgent
                  ? 'text-orange-400'
                  : 'text-white'
              }`}>
                {remainingMinutes} min left
              </p>
              <p className="text-zinc-500 text-xs">
                {isCritical
                  ? "Don't miss out!"
                  : isUrgent
                  ? 'Closing soon!'
                  : 'Event active'}
              </p>
            </div>
          </div>

          {/* Social proof */}
          {participantCount !== undefined && participantCount > 0 && (
            <div className="text-right">
              <p className="text-white font-medium">
                {participantCount.toLocaleString()}
              </p>
              <p className="text-zinc-500 text-xs">already joined</p>
            </div>
          )}

          {/* Lucky drop boost indicator */}
          {customWindow.lucky_drop_boost > 1 && (
            <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-purple-500/20 border border-purple-500/30">
              <span className="text-purple-400">🎁</span>
              <span className="text-purple-400 text-sm font-medium">
                {customWindow.lucky_drop_boost}x drops
              </span>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
