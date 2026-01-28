// Aura System - Visual status indicators based on streak
// Part of the "Pulse Journey" retention system

export type AuraType = 'fire' | 'lightning' | 'diamond' | null;

export interface AuraDefinition {
  id: AuraType;
  name: string;
  description: string;
  icon: string;
  minStreak: number;
  cssClass: string;
  glowColor: string;
  isPermanent: boolean;
}

export const AURA_DEFINITIONS: Record<NonNullable<AuraType>, AuraDefinition> = {
  fire: {
    id: 'fire',
    name: 'Fire',
    description: '7+ days streak',
    icon: '🔥',
    minStreak: 7,
    cssClass: 'aura-fire',
    glowColor: 'rgba(251, 146, 60, 0.5)', // orange-400
    isPermanent: false,
  },
  lightning: {
    id: 'lightning',
    name: 'Lightning',
    description: '30+ days streak',
    icon: '⚡',
    minStreak: 30,
    cssClass: 'aura-lightning',
    glowColor: 'rgba(250, 204, 21, 0.5)', // yellow-400
    isPermanent: false,
  },
  diamond: {
    id: 'diamond',
    name: 'Diamond',
    description: '100+ days streak (permanent)',
    icon: '💎',
    minStreak: 100,
    cssClass: 'aura-diamond',
    glowColor: 'rgba(147, 197, 253, 0.5)', // blue-300
    isPermanent: true, // Once earned, never lost
  },
};

// Streak milestones with rewards
export interface StreakMilestone {
  days: number;
  name: string;
  icon: string;
  reward: string;
  aura?: AuraType;
}

export const STREAK_MILESTONES: StreakMilestone[] = [
  { days: 3, name: 'First Steps', icon: '🌱', reward: 'Badge "Warming Up"' },
  { days: 7, name: 'One Week', icon: '🔥', reward: 'Fire Aura', aura: 'fire' },
  { days: 14, name: 'Two Weeks', icon: '💪', reward: 'Badge "Fortnight Force"' },
  { days: 30, name: 'One Month', icon: '⚡', reward: 'Lightning Aura', aura: 'lightning' },
  { days: 50, name: 'Halfway', icon: '🎯', reward: 'Badge "Halfway There"' },
  { days: 100, name: 'Centurion', icon: '💎', reward: 'Permanent Diamond Aura', aura: 'diamond' },
];

/**
 * Get the aura type for a given streak count
 */
export function getAuraForStreak(streakDays: number): AuraType {
  if (streakDays >= 100) return 'diamond';
  if (streakDays >= 30) return 'lightning';
  if (streakDays >= 7) return 'fire';
  return null;
}

/**
 * Get the next milestone for a user
 */
export function getNextMilestone(currentStreak: number): StreakMilestone | null {
  return STREAK_MILESTONES.find((m) => m.days > currentStreak) || null;
}

/**
 * Get the current milestone (the one they've achieved)
 */
export function getCurrentMilestone(currentStreak: number): StreakMilestone | null {
  const achieved = STREAK_MILESTONES.filter((m) => m.days <= currentStreak);
  return achieved.length > 0 ? achieved[achieved.length - 1] : null;
}

/**
 * Calculate progress to next milestone (0-100)
 */
export function getMilestoneProgress(currentStreak: number): {
  progress: number;
  daysRemaining: number;
  nextMilestone: StreakMilestone | null;
} {
  const next = getNextMilestone(currentStreak);
  if (!next) {
    return { progress: 100, daysRemaining: 0, nextMilestone: null };
  }

  const current = getCurrentMilestone(currentStreak);
  const startDays = current?.days || 0;
  const totalDays = next.days - startDays;
  const completedDays = currentStreak - startDays;

  return {
    progress: Math.round((completedDays / totalDays) * 100),
    daysRemaining: next.days - currentStreak,
    nextMilestone: next,
  };
}

/**
 * Get streak level name for display
 */
export function getStreakLevelName(streakDays: number): string {
  if (streakDays >= 100) return 'Centurion';
  if (streakDays >= 50) return 'Veteran';
  if (streakDays >= 30) return 'Master';
  if (streakDays >= 14) return 'Dedicated';
  if (streakDays >= 7) return 'Warrior';
  if (streakDays >= 3) return 'Initiate';
  return 'Newcomer';
}
