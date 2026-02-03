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
