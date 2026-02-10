import { formatInTimeZone, toZonedTime } from 'date-fns-tz';
import { format } from 'date-fns';
import { WINDOWS, WindowType } from './constants';

// Type for dynamic windows config
export interface WindowsConfig {
  [key: string]: { start: number; end: number };
}

/**
 * Get the user's timezone from the browser
 */
export function getUserTimezone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
}

/**
 * Get the current hour in a specific timezone
 */
export function getCurrentHourInTimezone(timezone: string): number {
  const now = new Date();
  const zonedTime = toZonedTime(now, timezone);
  return zonedTime.getHours();
}

/**
 * Get the current date string (YYYY-MM-DD) in a specific timezone
 */
export function getCurrentDateInTimezone(timezone: string): string {
  return formatInTimeZone(new Date(), timezone, 'yyyy-MM-dd');
}

/**
 * Determine which window is currently active for a timezone
 * Returns null if no window is active
 * @param timezone - User's timezone
 * @param windows - Optional custom windows config (defaults to WINDOWS constant)
 */
export function getActiveWindow(timezone: string, windows: WindowsConfig = WINDOWS): string | null {
  const hour = getCurrentHourInTimezone(timezone);

  for (const [windowType, { start, end }] of Object.entries(windows)) {
    // Handle windows that cross midnight (e.g., night: 22-2)
    if (start > end) {
      if (hour >= start || hour < end) {
        return windowType;
      }
    } else {
      if (hour >= start && hour < end) {
        return windowType;
      }
    }
  }

  return null;
}

/**
 * Get the next window start time for a timezone
 * Returns the window type and the Date when it starts
 * @param timezone - User's timezone
 * @param windows - Optional custom windows config (defaults to WINDOWS constant)
 */
export function getNextWindow(timezone: string, windows: WindowsConfig = WINDOWS): { windowType: string; startsAt: Date } {
  const now = new Date();
  const zonedNow = toZonedTime(now, timezone);
  const currentHour = zonedNow.getHours();

  // Sort windows by start time
  const windowOrder = Object.entries(windows)
    .sort(([, a], [, b]) => a.start - b.start)
    .map(([type]) => type);

  for (const windowType of windowOrder) {
    const { start } = windows[windowType];
    if (currentHour < start) {
      // This window is today
      const startsAt = new Date(zonedNow);
      startsAt.setHours(start, 0, 0, 0);
      return { windowType, startsAt };
    }
  }

  // All windows passed today, next is first window tomorrow
  const firstWindow = windowOrder[0];
  const tomorrow = new Date(zonedNow);
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(windows[firstWindow].start, 0, 0, 0);
  return { windowType: firstWindow, startsAt: tomorrow };
}

/**
 * Get remaining time in the current window
 * Returns null if no window is active
 * @param timezone - User's timezone
 * @param windows - Optional custom windows config (defaults to WINDOWS constant)
 */
export function getWindowRemainingTime(timezone: string, windows: WindowsConfig = WINDOWS): { minutes: number; seconds: number } | null {
  const activeWindow = getActiveWindow(timezone, windows);
  if (!activeWindow) return null;

  const windowConfig = windows[activeWindow];
  if (!windowConfig) return null;

  const now = new Date();
  const zonedNow = toZonedTime(now, timezone);
  const windowEnd = new Date(zonedNow);

  // Handle windows that cross midnight
  if (windowConfig.start > windowConfig.end) {
    const currentHour = zonedNow.getHours();
    if (currentHour >= windowConfig.start) {
      // We're before midnight, end is tomorrow
      windowEnd.setDate(windowEnd.getDate() + 1);
    }
  }
  windowEnd.setHours(windowConfig.end, 0, 0, 0);

  const diffMs = windowEnd.getTime() - zonedNow.getTime();

  // Handle edge case where diff is negative due to clock skew
  if (diffMs <= 0) {
    return { minutes: 0, seconds: 0 };
  }

  const totalSeconds = Math.floor(diffMs / 1000);

  return {
    minutes: Math.floor(totalSeconds / 60),
    seconds: totalSeconds % 60,
  };
}

/**
 * Generate window ID in format: date|window_type|timezone
 */
export function generateWindowId(date: string, windowType: string, timezone: string): string {
  return `${date}|${windowType}|${timezone}`;
}

/**
 * Get the most recently completed window's ID
 * Used as fallback when no window is currently active
 */
export function getLastCompletedWindowId(timezone: string, windows: WindowsConfig = WINDOWS): string {
  const hour = getCurrentHourInTimezone(timezone);
  const date = getCurrentDateInTimezone(timezone);

  // Sort windows by end time descending
  const sorted = Object.entries(windows)
    .map(([type, { start, end }]) => ({ type, start, end }))
    .sort((a, b) => b.end - a.end);

  // Find the most recent window that already ended
  for (const w of sorted) {
    if (hour >= w.end) {
      return generateWindowId(date, w.type, timezone);
    }
  }

  // All windows are ahead of current hour (e.g., 0-8am)
  // Use last window from yesterday
  const yesterday = new Date();
  const zonedYesterday = toZonedTime(yesterday, timezone);
  zonedYesterday.setDate(zonedYesterday.getDate() - 1);
  const yesterdayStr = format(zonedYesterday, 'yyyy-MM-dd');
  const lastWindow = sorted[0]; // highest end time = last window of day
  return generateWindowId(yesterdayStr, lastWindow.type, timezone);
}

/**
 * Parse a window ID back to its components
 * Validates the format and returns defaults for invalid inputs
 */
export function parseWindowId(windowId: string): { date: string; windowType: WindowType; timezone: string } {
  const parts = windowId.split('|');

  // Validate we have exactly 3 parts
  if (parts.length !== 3) {
    console.error('Invalid window ID format:', windowId);
    const today = formatInTimeZone(new Date(), 'UTC', 'yyyy-MM-dd');
    return { date: today, windowType: 'morning', timezone: 'UTC' };
  }

  const [date, windowType, timezone] = parts;

  // Validate date format (YYYY-MM-DD)
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(date)) {
    console.error('Invalid date in window ID:', date);
    const today = formatInTimeZone(new Date(), 'UTC', 'yyyy-MM-dd');
    return { date: today, windowType: windowType as WindowType || 'morning', timezone: timezone || 'UTC' };
  }

  // Validate window type
  const validWindowTypes: WindowType[] = ['morning', 'afternoon', 'night'];
  const validatedWindowType = validWindowTypes.includes(windowType as WindowType)
    ? (windowType as WindowType)
    : 'morning';

  return { date, windowType: validatedWindowType, timezone: timezone || 'UTC' };
}

/**
 * Get all timezones where a specific window is currently active
 * Used for cron notifications
 */
export function getTimezonesWithActiveWindow(windowType: WindowType): string[] {
  const { start } = WINDOWS[windowType];
  const now = new Date();
  const currentUtcHour = now.getUTCHours();

  // Calculate which UTC offset would have the target hour as local time
  // localHour = utcHour + offset
  // offset = localHour - utcHour
  const targetOffset = start - currentUtcHour;

  // Common timezones by offset (simplified list)
  const timezonesByOffset: Record<string, string[]> = {
    '-12': ['Pacific/Baker_Island'],
    '-11': ['Pacific/Pago_Pago'],
    '-10': ['Pacific/Honolulu'],
    '-9': ['America/Anchorage'],
    '-8': ['America/Los_Angeles'],
    '-7': ['America/Denver', 'America/Phoenix'],
    '-6': ['America/Chicago', 'America/Mexico_City'],
    '-5': ['America/New_York', 'America/Toronto'],
    '-4': ['America/Santiago', 'America/Caracas'],
    '-3': ['America/Sao_Paulo', 'America/Buenos_Aires'],
    '-2': ['Atlantic/South_Georgia'],
    '-1': ['Atlantic/Azores'],
    '0': ['Europe/London', 'UTC'],
    '1': ['Europe/Paris', 'Europe/Berlin', 'Europe/Madrid'],
    '2': ['Europe/Helsinki', 'Africa/Cairo'],
    '3': ['Europe/Moscow', 'Asia/Baghdad'],
    '4': ['Asia/Dubai', 'Asia/Baku'],
    '5': ['Asia/Karachi', 'Asia/Tashkent'],
    '5.5': ['Asia/Kolkata'],
    '6': ['Asia/Dhaka', 'Asia/Almaty'],
    '7': ['Asia/Bangkok', 'Asia/Jakarta'],
    '8': ['Asia/Shanghai', 'Asia/Singapore', 'Asia/Hong_Kong'],
    '9': ['Asia/Tokyo', 'Asia/Seoul'],
    '10': ['Australia/Sydney', 'Pacific/Guam'],
    '11': ['Pacific/Noumea'],
    '12': ['Pacific/Auckland', 'Pacific/Fiji'],
  };

  // Normalize offset to -12 to +12 range
  let normalizedOffset = targetOffset;
  while (normalizedOffset < -12) normalizedOffset += 24;
  while (normalizedOffset > 12) normalizedOffset -= 24;

  return timezonesByOffset[normalizedOffset.toString()] || [];
}
