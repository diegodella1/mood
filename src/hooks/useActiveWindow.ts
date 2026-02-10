'use client';

import { useState, useEffect, useCallback } from 'react';
import { getActiveWindow, getNextWindow, getWindowRemainingTime, getCurrentDateInTimezone, generateWindowId, WindowsConfig } from '@/lib/timezone';
import { useUser } from '@/providers/UserProvider';
import { useConfig, CustomWindowConfig } from '@/providers/ConfigProvider';
import type { RecurrenceRule } from '@/lib/supabase/types';

interface WindowState {
  isActive: boolean;
  currentWindow: string | null;
  windowId: string | null;
  remainingTime: { minutes: number; seconds: number } | null;
  nextWindow: { windowType: string; startsAt: Date } | null;
  // Custom window info (when active)
  customWindow: CustomWindowConfig | null;
  isCustomWindow: boolean;
}

/**
 * Check if a recurring window should be active on a given date
 */
function isRecurringWindowActiveOnDate(
  rule: RecurrenceRule,
  targetDate: Date,
  startDate: Date,
  endDate?: Date | null
): boolean {
  if (targetDate < startDate) return false;
  if (endDate && targetDate > endDate) return false;

  const dayOfWeek = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][
    targetDate.getDay()
  ];
  const dayOfMonth = targetDate.getDate();

  switch (rule.frequency) {
    case 'daily':
      return true;
    case 'weekly':
      return rule.daysOfWeek?.includes(dayOfWeek) ?? false;
    case 'monthly':
      return rule.dayOfMonth === dayOfMonth;
    default:
      return false;
  }
}

/**
 * Check if a custom window is currently active
 */
function getActiveCustomWindow(
  customWindows: CustomWindowConfig[],
  timezone: string,
  countryCode: string | null,
  streakDays: number
): CustomWindowConfig | null {
  if (!customWindows || customWindows.length === 0) return null;

  const now = new Date();
  const localTime = new Date(now.toLocaleString('en-US', { timeZone: timezone }));
  const localHour = localTime.getHours();
  const todayDateStr = localTime.toISOString().split('T')[0];

  // Sort by priority (higher first)
  const sortedWindows = [...customWindows].sort((a, b) => b.priority - a.priority);

  for (const window of sortedWindows) {
    // Check targeting filters
    if (window.target_timezones && window.target_timezones.length > 0) {
      if (!window.target_timezones.includes(timezone)) continue;
    }

    if (window.target_countries && window.target_countries.length > 0) {
      if (!countryCode || !window.target_countries.includes(countryCode)) continue;
    }

    if (window.min_streak_days > 0 && streakDays < window.min_streak_days) {
      continue;
    }

    // Check if within time window
    const isWithinHours = localHour >= window.start_hour && localHour < window.end_hour;
    if (!isWithinHours) continue;

    // Check if active today based on event type
    if (window.event_type === 'one_time') {
      if (window.event_date === todayDateStr) {
        return window;
      }
    } else if (window.event_type === 'recurring' && window.recurrence_rule) {
      const recurrenceStart = window.recurrence_start
        ? new Date(window.recurrence_start)
        : window.event_date
          ? new Date(window.event_date)
          : new Date(0);
      const recurrenceEnd = window.recurrence_end ? new Date(window.recurrence_end) : null;
      if (isRecurringWindowActiveOnDate(window.recurrence_rule, localTime, recurrenceStart, recurrenceEnd)) {
        return window;
      }
    }
  }

  return null;
}

export function useActiveWindow() {
  const { user } = useUser();
  const config = useConfig();
  const [windowState, setWindowState] = useState<WindowState>({
    isActive: false,
    currentWindow: null,
    windowId: null,
    remainingTime: null,
    nextWindow: null,
    customWindow: null,
    isCustomWindow: false,
  });

  const updateWindowState = useCallback(() => {
    if (!user?.timezone) return;

    const timezone = user.timezone;
    const windows = config.windows.schedule as WindowsConfig;

    // First check for active custom windows (they have priority)
    const activeCustomWindow = config.features.customWindows
      ? getActiveCustomWindow(
          config.customWindows,
          timezone,
          user.countryCode || null,
          user.streakDays || 0
        )
      : null;

    if (activeCustomWindow) {
      // Custom window is active - it replaces normal windows
      const now = new Date();
      const localTime = new Date(now.toLocaleString('en-US', { timeZone: timezone }));
      const localHour = localTime.getHours();
      const localMinute = localTime.getMinutes();
      const localSecond = localTime.getSeconds();

      // Calculate remaining time for custom window
      const windowEndMinute = activeCustomWindow.end_hour * 60;
      const currentMinuteInDay = localHour * 60 + localMinute;
      const remainingTotalMinutes = windowEndMinute - currentMinuteInDay;
      const remainingMinutes = Math.max(0, remainingTotalMinutes - 1);
      const remainingSeconds = Math.max(0, 60 - localSecond);

      // Generate unique window instance ID
      const dateStr = localTime.toISOString().split('T')[0];
      const windowId = `custom_${activeCustomWindow.id}_${dateStr}`;

      setWindowState({
        isActive: true,
        currentWindow: activeCustomWindow.name,
        windowId,
        remainingTime: {
          minutes: remainingMinutes,
          seconds: remainingSeconds,
        },
        nextWindow: getNextWindow(timezone, windows),
        customWindow: activeCustomWindow,
        isCustomWindow: true,
      });
    } else {
      // Fall back to normal window logic
      const activeWindow = getActiveWindow(timezone, windows);

      if (activeWindow) {
        const date = getCurrentDateInTimezone(timezone);
        const windowId = generateWindowId(date, activeWindow, timezone);
        const remainingTime = getWindowRemainingTime(timezone, windows);

        setWindowState({
          isActive: true,
          currentWindow: activeWindow,
          windowId,
          remainingTime,
          nextWindow: getNextWindow(timezone, windows),
          customWindow: null,
          isCustomWindow: false,
        });
      } else {
        const nextWindow = getNextWindow(timezone, windows);

        setWindowState({
          isActive: false,
          currentWindow: null,
          windowId: null,
          remainingTime: null,
          nextWindow,
          customWindow: null,
          isCustomWindow: false,
        });
      }
    }
  }, [user?.timezone, user?.countryCode, user?.streakDays, config.windows.schedule, config.customWindows, config.features.customWindows]);

  // Update window state every second for countdown
  useEffect(() => {
    updateWindowState();

    const interval = setInterval(updateWindowState, 1000);

    return () => clearInterval(interval);
  }, [updateWindowState]);

  return windowState;
}
