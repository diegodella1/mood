// Suggested emojis (originally the 6 moods, now as emojis)
export const SUGGESTED_EMOJIS = [
  { emoji: '🔥', label: 'Hype' },
  { emoji: '😵', label: 'Overwhelmed' },
  { emoji: '😌', label: 'Calm' },
  { emoji: '🌀', label: 'Chaos' },
  { emoji: '😔', label: 'Low' },
  { emoji: '🎯', label: 'Focused' },
] as const;

// Legacy mood string to emoji mapping (for backwards compatibility)
export const LEGACY_MOOD_TO_EMOJI: Record<string, string> = {
  hype: '🔥',
  overwhelmed: '😵',
  calm: '😌',
  chaos: '🌀',
  low: '😔',
  focused: '🎯',
};

// Reverse mapping: emoji to label (for suggested emojis)
export const EMOJI_TO_LABEL: Record<string, string> = {
  '🔥': 'Hype',
  '😵': 'Overwhelmed',
  '😌': 'Calm',
  '🌀': 'Chaos',
  '😔': 'Low',
  '🎯': 'Focused',
};

// Unicode emoji regex pattern
// Matches most emojis including compound emojis (skin tones, ZWJ sequences, etc.)
const EMOJI_REGEX = /^(?:\p{Emoji_Presentation}|\p{Emoji}\uFE0F)(?:\u200D(?:\p{Emoji_Presentation}|\p{Emoji}\uFE0F))*$/u;

/**
 * Validates if a string is a valid emoji
 */
export function isValidEmoji(str: string): boolean {
  if (!str || str.length === 0 || str.length > 20) return false;
  return EMOJI_REGEX.test(str);
}

/**
 * Converts legacy mood strings to emojis, or returns the emoji if already an emoji
 * Used for backwards compatibility with existing data
 */
export function normalizeToEmoji(mood: string): string {
  // If it's a legacy mood string, convert to emoji
  if (LEGACY_MOOD_TO_EMOJI[mood]) {
    return LEGACY_MOOD_TO_EMOJI[mood];
  }
  // Otherwise assume it's already an emoji
  return mood;
}

/**
 * Gets a display label for an emoji
 * Returns the known label for suggested emojis, or the emoji itself for custom emojis
 */
export function getEmojiLabel(emoji: string): string {
  const normalized = normalizeToEmoji(emoji);
  return EMOJI_TO_LABEL[normalized] || normalized;
}

// Reaction emojis for pulses
export const REACTIONS = ['heart', 'laugh', 'fire', 'hug', 'skull'] as const;
export type Reaction = typeof REACTIONS[number];

export const REACTION_EMOJIS: Record<Reaction, string> = {
  heart: '❤️',
  laugh: '😂',
  fire: '🔥',
  hug: '🤗',
  skull: '💀',
};

// Window types and their time ranges (local time)
export const WINDOWS = {
  morning: { start: 8, end: 11 },
  afternoon: { start: 13, end: 16 },
  night: { start: 20, end: 23 },
} as const;

export type WindowType = keyof typeof WINDOWS;

// App constants
export const APP_NAME = 'Global Pulse';
export const APP_DESCRIPTION = 'Share your mood with the world';
export const STORAGE_KEYS = {
  USER_ID: 'global_pulse_user_id',
  TIMEZONE: 'global_pulse_timezone',
} as const;
