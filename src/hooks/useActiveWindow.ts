'use client';

import { useState, useEffect, useCallback } from 'react';
import { getActiveWindow, getNextWindow, getWindowRemainingTime, getCurrentDateInTimezone, generateWindowId } from '@/lib/timezone';
import { WindowType } from '@/lib/constants';
import { useUser } from '@/providers/UserProvider';

interface WindowState {
  isActive: boolean;
  currentWindow: WindowType | null;
  windowId: string | null;
  remainingTime: { minutes: number; seconds: number } | null;
  nextWindow: { windowType: WindowType; startsAt: Date } | null;
}

export function useActiveWindow() {
  const { user } = useUser();
  const [windowState, setWindowState] = useState<WindowState>({
    isActive: false,
    currentWindow: null,
    windowId: null,
    remainingTime: null,
    nextWindow: null,
  });

  const updateWindowState = useCallback(() => {
    if (!user?.timezone) return;

    const timezone = user.timezone;
    const activeWindow = getActiveWindow(timezone);

    if (activeWindow) {
      const date = getCurrentDateInTimezone(timezone);
      const windowId = generateWindowId(date, activeWindow, timezone);
      const remainingTime = getWindowRemainingTime(timezone);

      setWindowState({
        isActive: true,
        currentWindow: activeWindow,
        windowId,
        remainingTime,
        nextWindow: null,
      });
    } else {
      const nextWindow = getNextWindow(timezone);

      setWindowState({
        isActive: false,
        currentWindow: null,
        windowId: null,
        remainingTime: null,
        nextWindow,
      });
    }
  }, [user?.timezone]);

  // Update window state every second for countdown
  useEffect(() => {
    updateWindowState();

    const interval = setInterval(updateWindowState, 1000);

    return () => clearInterval(interval);
  }, [updateWindowState]);

  return windowState;
}
