'use client';

import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import {
  initOneSignal,
  setExternalUserId,
  setUserTags,
  requestPushPermission,
  isPushEnabled,
  getInitializationStatus,
  getBrowserPermissionState,
  type PermissionResult
} from '@/lib/onesignal/client';
import { useUser } from './UserProvider';

interface OneSignalContextType {
  isInitialized: boolean;
  isSubscribed: boolean;
  initError: string | null;
  browserPermission: 'granted' | 'denied' | 'default' | 'unsupported';
  requestPermission: () => Promise<PermissionResult>;
  updateTags: (tags: Record<string, string>) => Promise<void>;
}

const OneSignalContext = createContext<OneSignalContextType | null>(null);

export function OneSignalProvider({ children }: { children: ReactNode }) {
  const { user } = useUser();
  const [isInitialized, setIsInitialized] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [initError, setInitError] = useState<string | null>(null);
  const [browserPermission, setBrowserPermission] = useState<'granted' | 'denied' | 'default' | 'unsupported'>('default');

  // Initialize OneSignal
  useEffect(() => {
    const init = async () => {
      await initOneSignal();
      const status = getInitializationStatus();
      setIsInitialized(status.initialized);
      setInitError(status.error);

      // Check browser permission state
      setBrowserPermission(getBrowserPermissionState());

      // Check subscription status
      const subscribed = await isPushEnabled();
      setIsSubscribed(subscribed);
    };

    init();
  }, []);

  // Set external user ID when user is available
  useEffect(() => {
    if (isInitialized && user?.id) {
      setExternalUserId(user.id);

      // Set initial tags
      const tags: Record<string, string> = {
        tz: user.timezone,
      };

      if (user.countryCode) {
        tags.country = user.countryCode;
      }

      if (user.cityId) {
        tags.city_id = user.cityId;
      }

      setUserTags(tags);
    }
  }, [isInitialized, user?.id, user?.timezone, user?.countryCode, user?.cityId]);

  const requestPermission = useCallback(async (): Promise<PermissionResult> => {
    const result = await requestPushPermission();
    setIsSubscribed(result.granted);

    // Update browser permission state after request
    setBrowserPermission(getBrowserPermissionState());

    if (result.granted && user?.id) {
      // Update server with push opt-in
      await fetch('/api/push/optin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id }),
      });
    }

    return result;
  }, [user?.id]);

  const updateTags = useCallback(async (tags: Record<string, string>): Promise<void> => {
    await setUserTags(tags);

    if (user?.id) {
      // Also update server
      await fetch('/api/push/tags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, tags }),
      });
    }
  }, [user?.id]);

  return (
    <OneSignalContext.Provider value={{ isInitialized, isSubscribed, initError, browserPermission, requestPermission, updateTags }}>
      {children}
    </OneSignalContext.Provider>
  );
}

export function useOneSignal() {
  const context = useContext(OneSignalContext);
  if (!context) {
    throw new Error('useOneSignal must be used within a OneSignalProvider');
  }
  return context;
}
