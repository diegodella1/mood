import OneSignal from 'react-onesignal';

let isInitialized = false;
let initializationError: string | null = null;

export async function initOneSignal(): Promise<void> {
  if (isInitialized || typeof window === 'undefined') return;

  const appId = process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID;
  if (!appId) {
    console.warn('[OneSignal] App ID not configured');
    initializationError = 'Push notifications not configured';
    return;
  }

  // Check if running in a secure context (HTTPS or localhost)
  if (typeof window !== 'undefined' && !window.isSecureContext) {
    console.warn('[OneSignal] Not in secure context - HTTPS required');
    initializationError = 'HTTPS required for push notifications';
    return;
  }

  // Check if service workers are supported
  if (typeof navigator !== 'undefined' && !('serviceWorker' in navigator)) {
    console.warn('[OneSignal] Service workers not supported');
    initializationError = 'Browser does not support push notifications';
    return;
  }

  try {
    console.log('[OneSignal] Initializing with appId:', appId.substring(0, 8) + '...');
    await OneSignal.init({
      appId,
      allowLocalhostAsSecureOrigin: process.env.NODE_ENV === 'development',
      serviceWorkerPath: '/OneSignalSDKWorker.js',
      autoResubscribe: true,
    });
    isInitialized = true;
    initializationError = null;
    console.log('[OneSignal] Initialized successfully');
  } catch (error) {
    console.error('[OneSignal] Init error:', error);
    initializationError = error instanceof Error ? error.message : 'Failed to initialize push notifications';
  }
}

export function getInitializationStatus(): { initialized: boolean; error: string | null } {
  return { initialized: isInitialized, error: initializationError };
}

export async function setExternalUserId(userId: string): Promise<void> {
  if (!isInitialized) return;

  try {
    await OneSignal.login(userId);
  } catch (error) {
    console.error('OneSignal setExternalUserId error:', error);
  }
}

export async function setUserTags(tags: Record<string, string>): Promise<void> {
  if (!isInitialized) return;

  try {
    await OneSignal.User.addTags(tags);
  } catch (error) {
    console.error('OneSignal setUserTags error:', error);
  }
}

export type PermissionResult = {
  granted: boolean;
  error?: string;
  browserDenied?: boolean;
};

export async function requestPushPermission(): Promise<PermissionResult> {
  console.log('[OneSignal] requestPushPermission called, isInitialized:', isInitialized);

  if (!isInitialized) {
    console.log('[OneSignal] Not initialized, error:', initializationError);
    return {
      granted: false,
      error: initializationError || 'Push notifications not available'
    };
  }

  // Check if browser has already denied permission
  if (typeof window !== 'undefined' && 'Notification' in window) {
    const browserPermission = Notification.permission;
    console.log('[OneSignal] Browser permission state:', browserPermission);
    if (browserPermission === 'denied') {
      return {
        granted: false,
        error: 'Notifications blocked in browser settings',
        browserDenied: true,
      };
    }
  }

  try {
    console.log('[OneSignal] Requesting permission via OneSignal SDK...');
    const permission = await OneSignal.Notifications.requestPermission();
    console.log('[OneSignal] Permission result:', permission);
    return { granted: permission };
  } catch (error) {
    console.error('[OneSignal] requestPushPermission error:', error);
    return {
      granted: false,
      error: error instanceof Error ? error.message : 'Failed to request permission'
    };
  }
}

export async function isPushEnabled(): Promise<boolean> {
  if (!isInitialized) return false;

  try {
    return OneSignal.Notifications.permission;
  } catch (error) {
    console.error('OneSignal isPushEnabled error:', error);
    return false;
  }
}

export function getBrowserPermissionState(): 'granted' | 'denied' | 'default' | 'unsupported' {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'unsupported';
  }
  return Notification.permission;
}

/**
 * Register notification event listeners for deep linking, foreground suppression,
 * and permission change tracking. Returns a cleanup function.
 */
export function registerNotificationListeners(callbacks?: {
  onPermissionChange?: (granted: boolean) => void;
}): () => void {
  if (!isInitialized) return () => {};

  // Deep linking on notification click
  const handleClick = (event: { notification: { launchURL?: string; url?: string } }) => {
    const url = event.notification?.launchURL || event.notification?.url;
    if (url && typeof window !== 'undefined') {
      // Only navigate if it's a relative path (same origin)
      try {
        const parsed = new URL(url, window.location.origin);
        if (parsed.origin === window.location.origin) {
          window.location.href = parsed.pathname + parsed.search;
        }
      } catch {
        // If URL parsing fails, ignore
      }
    }
  };

  // Suppress in-app display when app is in foreground
  const handleForeground = (event: { preventDefault?: () => void }) => {
    // Prevent showing the notification popup if the app is visible
    if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
      event.preventDefault?.();
    }
  };

  // Permission change tracking
  const handlePermissionChange = (granted: boolean) => {
    console.log('[OneSignal] Permission changed:', granted);
    callbacks?.onPermissionChange?.(granted);
  };

  try {
    OneSignal.Notifications.addEventListener('click', handleClick);
    OneSignal.Notifications.addEventListener('foregroundWillDisplay', handleForeground);
    OneSignal.Notifications.addEventListener('permissionChange', handlePermissionChange);
  } catch (error) {
    console.error('[OneSignal] Failed to register listeners:', error);
  }

  return () => {
    try {
      OneSignal.Notifications.removeEventListener('click', handleClick);
      OneSignal.Notifications.removeEventListener('foregroundWillDisplay', handleForeground);
      OneSignal.Notifications.removeEventListener('permissionChange', handlePermissionChange);
    } catch {
      // Cleanup errors are non-critical
    }
  };
}
