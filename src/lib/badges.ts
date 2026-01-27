// Badge definitions with unlock conditions
// Uses Variable Rewards principle - some badges are rare/unexpected

export interface BadgeDefinition {
  id: string;
  name: string;
  description: string;
  icon: string;
  rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
  condition: BadgeCondition;
  secretUntilEarned?: boolean; // Hidden badges for surprise (Variable Rewards)
}

export type BadgeCondition =
  | { type: 'streak'; days: number }
  | { type: 'total_pulses'; count: number }
  | { type: 'perfect_days'; count: number } // All 3 windows in a day
  | { type: 'reactions_received'; count: number }
  | { type: 'reactions_given'; count: number }
  | { type: 'unique_moods'; count: number }
  | { type: 'early_bird'; count: number } // Morning pulses
  | { type: 'night_owl'; count: number } // Night pulses
  | { type: 'mood_match'; count: number } // Matched global top mood
  | { type: 'battle_participant'; count: number }
  | { type: 'battle_winner'; count: number }
  | { type: 'special'; event: string }; // Special events

export const BADGE_DEFINITIONS: BadgeDefinition[] = [
  // STREAK BADGES (Commitment & Consistency)
  {
    id: 'streak_3',
    name: 'Warming Up',
    description: '3 day streak',
    icon: '🌱',
    rarity: 'common',
    condition: { type: 'streak', days: 3 },
  },
  {
    id: 'streak_7',
    name: 'Week Warrior',
    description: '7 day streak',
    icon: '🔥',
    rarity: 'common',
    condition: { type: 'streak', days: 7 },
  },
  {
    id: 'streak_14',
    name: 'Fortnight Force',
    description: '14 day streak',
    icon: '⚡',
    rarity: 'uncommon',
    condition: { type: 'streak', days: 14 },
  },
  {
    id: 'streak_30',
    name: 'Monthly Master',
    description: '30 day streak',
    icon: '💫',
    rarity: 'rare',
    condition: { type: 'streak', days: 30 },
  },
  {
    id: 'streak_60',
    name: 'Unstoppable',
    description: '60 day streak',
    icon: '🌟',
    rarity: 'epic',
    condition: { type: 'streak', days: 60 },
  },
  {
    id: 'streak_100',
    name: 'Centurion',
    description: '100 day streak',
    icon: '👑',
    rarity: 'legendary',
    condition: { type: 'streak', days: 100 },
  },

  // PULSE COUNT BADGES (Progress & Achievement)
  {
    id: 'pulses_10',
    name: 'First Steps',
    description: 'Shared 10 pulses',
    icon: '👣',
    rarity: 'common',
    condition: { type: 'total_pulses', count: 10 },
  },
  {
    id: 'pulses_50',
    name: 'Regular',
    description: 'Shared 50 pulses',
    icon: '📊',
    rarity: 'uncommon',
    condition: { type: 'total_pulses', count: 50 },
  },
  {
    id: 'pulses_100',
    name: 'Century Club',
    description: 'Shared 100 pulses',
    icon: '💯',
    rarity: 'rare',
    condition: { type: 'total_pulses', count: 100 },
  },
  {
    id: 'pulses_500',
    name: 'Pulse Veteran',
    description: 'Shared 500 pulses',
    icon: '🎖️',
    rarity: 'epic',
    condition: { type: 'total_pulses', count: 500 },
  },

  // PERFECT DAY BADGES (Goal-Gradient)
  {
    id: 'perfect_1',
    name: 'Perfect Day',
    description: 'Complete all 3 windows in one day',
    icon: '✨',
    rarity: 'common',
    condition: { type: 'perfect_days', count: 1 },
  },
  {
    id: 'perfect_7',
    name: 'Perfect Week',
    description: '7 perfect days',
    icon: '🌈',
    rarity: 'rare',
    condition: { type: 'perfect_days', count: 7 },
  },
  {
    id: 'perfect_30',
    name: 'Perfectionist',
    description: '30 perfect days',
    icon: '💎',
    rarity: 'legendary',
    condition: { type: 'perfect_days', count: 30 },
  },

  // SOCIAL BADGES (Reciprocity & Social Proof)
  {
    id: 'reactions_received_10',
    name: 'Appreciated',
    description: 'Received 10 reactions',
    icon: '❤️',
    rarity: 'common',
    condition: { type: 'reactions_received', count: 10 },
  },
  {
    id: 'reactions_received_100',
    name: 'Popular',
    description: 'Received 100 reactions',
    icon: '🌟',
    rarity: 'rare',
    condition: { type: 'reactions_received', count: 100 },
  },
  {
    id: 'reactions_given_50',
    name: 'Supporter',
    description: 'Gave 50 reactions',
    icon: '🤝',
    rarity: 'uncommon',
    condition: { type: 'reactions_given', count: 50 },
  },

  // TIME-BASED BADGES
  {
    id: 'early_bird_10',
    name: 'Early Bird',
    description: '10 morning pulses',
    icon: '🌅',
    rarity: 'uncommon',
    condition: { type: 'early_bird', count: 10 },
  },
  {
    id: 'night_owl_10',
    name: 'Night Owl',
    description: '10 night pulses',
    icon: '🦉',
    rarity: 'uncommon',
    condition: { type: 'night_owl', count: 10 },
  },

  // VARIETY BADGES
  {
    id: 'unique_moods_10',
    name: 'Emotional Range',
    description: 'Used 10 different moods',
    icon: '🎭',
    rarity: 'uncommon',
    condition: { type: 'unique_moods', count: 10 },
  },
  {
    id: 'unique_moods_25',
    name: 'Mood Master',
    description: 'Used 25 different moods',
    icon: '🎨',
    rarity: 'rare',
    condition: { type: 'unique_moods', count: 25 },
  },

  // SECRET/SURPRISE BADGES (Variable Rewards - dopamine spikes)
  {
    id: 'mood_match_5',
    name: 'Vibe Check',
    description: 'Matched the global top mood 5 times',
    icon: '🎯',
    rarity: 'uncommon',
    condition: { type: 'mood_match', count: 5 },
    secretUntilEarned: true,
  },
  {
    id: 'mood_match_20',
    name: 'Global Sync',
    description: 'Matched the global top mood 20 times',
    icon: '🌐',
    rarity: 'rare',
    condition: { type: 'mood_match', count: 20 },
    secretUntilEarned: true,
  },

  // COMPETITION BADGES
  {
    id: 'battle_participant_1',
    name: 'Battle Ready',
    description: 'Participated in a city battle',
    icon: '⚔️',
    rarity: 'common',
    condition: { type: 'battle_participant', count: 1 },
  },
  {
    id: 'battle_winner_1',
    name: 'Champion',
    description: 'Won a city battle',
    icon: '🏆',
    rarity: 'rare',
    condition: { type: 'battle_winner', count: 1 },
  },
];

// Rarity colors for UI
export const RARITY_COLORS = {
  common: { bg: 'bg-gray-500/20', text: 'text-gray-400', border: 'border-gray-500/30' },
  uncommon: { bg: 'bg-green-500/20', text: 'text-green-400', border: 'border-green-500/30' },
  rare: { bg: 'bg-blue-500/20', text: 'text-blue-400', border: 'border-blue-500/30' },
  epic: { bg: 'bg-purple-500/20', text: 'text-purple-400', border: 'border-purple-500/30' },
  legendary: { bg: 'bg-amber-500/20', text: 'text-amber-400', border: 'border-amber-500/30' },
};

// Get badge by ID
export function getBadgeDefinition(id: string): BadgeDefinition | undefined {
  return BADGE_DEFINITIONS.find((b) => b.id === id);
}

// Check which badges a user qualifies for based on stats
export function checkBadgeEligibility(
  stats: UserStats,
  earnedBadgeIds: string[]
): BadgeDefinition[] {
  const newBadges: BadgeDefinition[] = [];

  for (const badge of BADGE_DEFINITIONS) {
    if (earnedBadgeIds.includes(badge.id)) continue;

    const condition = badge.condition;
    let qualified = false;

    switch (condition.type) {
      case 'streak':
        qualified = stats.currentStreak >= condition.days;
        break;
      case 'total_pulses':
        qualified = stats.totalPulses >= condition.count;
        break;
      case 'perfect_days':
        qualified = stats.perfectDays >= condition.count;
        break;
      case 'reactions_received':
        qualified = stats.reactionsReceived >= condition.count;
        break;
      case 'reactions_given':
        qualified = stats.reactionsGiven >= condition.count;
        break;
      case 'unique_moods':
        qualified = stats.uniqueMoods >= condition.count;
        break;
      case 'early_bird':
        qualified = stats.morningPulses >= condition.count;
        break;
      case 'night_owl':
        qualified = stats.nightPulses >= condition.count;
        break;
      case 'mood_match':
        qualified = stats.moodMatches >= condition.count;
        break;
      case 'battle_participant':
        qualified = stats.battlesParticipated >= condition.count;
        break;
      case 'battle_winner':
        qualified = stats.battlesWon >= condition.count;
        break;
    }

    if (qualified) {
      newBadges.push(badge);
    }
  }

  return newBadges;
}

export interface UserStats {
  currentStreak: number;
  totalPulses: number;
  perfectDays: number;
  reactionsReceived: number;
  reactionsGiven: number;
  uniqueMoods: number;
  morningPulses: number;
  nightPulses: number;
  moodMatches: number;
  battlesParticipated: number;
  battlesWon: number;
}
