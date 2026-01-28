'use client';

import { useState, useEffect, useCallback } from 'react';
import { getActiveWindow, getNextWindow, getWindowRemainingTime, getCurrentDateInTimezone, generateWindowId, WindowsConfig } from '@/lib/timezone';
import { useUser } from '@/providers/UserProvider';
import { useConfig } from '@/providers/ConfigProvider';

interface WindowState {
  isActive: boolean;
  currentWindow: string | null;
  windowId: string | null;
  remainingTime: { minutes: number; seconds: number } | null;
  nextWindow: { windowType: string; startsAt: Date } | null;
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
  });

  const updateWindowState = useCallback(() => {
    if (!user?.timezone) return;

    const timezone = user.timezone;
    const windows = config.windows.schedule as WindowsConfig;
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
      });
    } else {
      const nextWindow = getNextWindow(timezone, windows);

      setWindowState({
        isActive: false,
        currentWindow: null,
        windowId: null,
        remainingTime: null,
        nextWindow,
      });
    }
  }, [user?.timezone, config.windows.schedule]);

  // Update window state every second for countdown
  useEffect(() => {
    updateWindowState();

    const interval = setInterval(updateWindowState, 1000);

    return () => clearInterval(interval);
  }, [updateWindowState]);

  return windowState;
}
