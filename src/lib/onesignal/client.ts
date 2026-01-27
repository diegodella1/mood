import OneSignal from 'react-onesignal';

let isInitialized = false;

export async function initOneSignal(): Promise<void> {
  if (isInitialized || typeof window === 'undefined') return;

  const appId = process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID;
  if (!appId) {
    console.warn('OneSignal App ID not configured');
    return;
  }

  try {
    await OneSignal.init({
      appId,
      allowLocalhostAsSecureOrigin: process.env.NODE_ENV === 'development',
    });
    isInitialized = true;
  } catch (error) {
    console.error('OneSignal init error:', error);
  }
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

export async function requestPushPermission(): Promise<boolean> {
  if (!isInitialized) return false;

  try {
    const permission = await OneSignal.Notifications.requestPermission();
    return permission;
  } catch (error) {
    console.error('OneSignal requestPushPermission error:', error);
    return false;
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
