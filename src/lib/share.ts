// Share utilities for Global Pulse
// Enhanced for viral growth

import { AuraType } from './auras';

export interface ShareData {
  emoji: string;
  streakDays: number;
  aura: AuraType;
  cityMatchPercentage?: number;
  cityName?: string;
  // New fields for enhanced sharing
  referralCode?: string;
  userId?: string;
  globalActiveToday?: number;
  userRank?: number;
  badgeId?: string;
  badgeName?: string;
}

export type ShareType = 'pulse' | 'badge' | 'streak' | 'profile' | 'leaderboard' | 'referral';

/**
 * Generate a share card URL with the given data
 */
export function getShareCardUrl(data: ShareData): string {
  const params = new URLSearchParams();
  params.set('emoji', data.emoji);
  params.set('streak', data.streakDays.toString());

  if (data.aura) {
    params.set('aura', data.aura);
  }

  if (data.cityMatchPercentage !== undefined && data.cityName) {
    params.set('cityMatch', data.cityMatchPercentage.toString());
    params.set('city', data.cityName);
  }

  // Add social proof
  if (data.globalActiveToday) {
    params.set('active', data.globalActiveToday.toString());
  }

  if (data.userRank) {
    params.set('rank', data.userRank.toString());
  }

  // Add referral code for viral loop
  if (data.referralCode) {
    params.set('ref', data.referralCode);
  }

  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://globalpulse.app';
  return `${origin}/api/share?${params.toString()}`;
}

/**
 * Get the share URL with referral code embedded
 */
export function getShareUrl(referralCode?: string): string {
  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://globalpulse.app';

  if (referralCode) {
    return `${origin}?ref=${referralCode}`;
  }

  return origin;
}

/**
 * Get shareable text based on the pulse data - optimized for virality
 */
export function getShareText(data: ShareData, type: ShareType = 'pulse'): string {
  let text = '';

  switch (type) {
    case 'badge':
      text = `🏆 Just unlocked "${data.badgeName}" on Global Pulse!`;
      if (data.streakDays > 0) {
        text += ` (${data.streakDays} day streak)`;
      }
      break;

    case 'streak':
      if (data.aura === 'diamond') {
        text = `💎 CENTURION! I just hit ${data.streakDays} days on Global Pulse!`;
      } else if (data.aura === 'lightning') {
        text = `⚡ ${data.streakDays} day streak on Global Pulse!`;
      } else if (data.aura === 'fire') {
        text = `🔥 ${data.streakDays} day streak on Global Pulse!`;
      } else {
        text = `📈 ${data.streakDays} day streak on Global Pulse!`;
      }
      break;

    case 'leaderboard':
      if (data.userRank && data.cityName) {
        text = `🏅 I'm #${data.userRank} in ${data.cityName} on Global Pulse!`;
      } else if (data.userRank) {
        text = `🏅 I'm ranked #${data.userRank} globally on Global Pulse!`;
      }
      break;

    case 'referral':
      text = `Join me on Global Pulse! Use my code ${data.referralCode} to get a free shield 🛡️`;
      break;

    default: // 'pulse'
      text = `I'm feeling ${data.emoji}`;

      if (data.streakDays > 0) {
        text += ` • ${data.streakDays}d`;
        if (data.aura === 'diamond') text += ' 💎';
        else if (data.aura === 'lightning') text += ' ⚡';
        else if (data.aura === 'fire') text += ' 🔥';
      }

      if (data.cityMatchPercentage !== undefined && data.cityName) {
        text += ` • ${data.cityMatchPercentage}% of ${data.cityName}`;
      }
  }

  // Add social proof
  if (data.globalActiveToday && data.globalActiveToday > 100) {
    const formatted = data.globalActiveToday > 1000
      ? `${(data.globalActiveToday / 1000).toFixed(1)}K`
      : data.globalActiveToday.toString();
    text += `\n\n${formatted}+ people feeling the pulse today`;
  }

  // Add CTA with referral code
  text += '\n\n🌍 globalpulse.app';
  if (data.referralCode) {
    text += `?ref=${data.referralCode}`;
  }

  return text;
}

/**
 * Track share event (fire and forget)
 */
async function trackShare(
  userId: string | undefined,
  shareType: ShareType,
  context: Record<string, unknown> = {},
  platform: string = 'unknown'
): Promise<void> {
  if (!userId) return;

  try {
    fetch('/api/share/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId,
        shareType,
        context,
        platform,
      }),
    }).catch(() => {}); // Silent fail
  } catch {
    // Silent fail
  }
}

/**
 * Share using Web Share API or fallback - with tracking
 */
export async function sharePulse(
  data: ShareData,
  type: ShareType = 'pulse'
): Promise<{ success: boolean; method: 'native' | 'clipboard' | 'failed' }> {
  const shareUrl = getShareUrl(data.referralCode);
  const shareText = getShareText(data, type);

  // Track the share attempt
  trackShare(data.userId, type, {
    emoji: data.emoji,
    streakDays: data.streakDays,
    aura: data.aura,
  }, 'native');

  // Try native share API first
  if (typeof navigator !== 'undefined' && navigator.share) {
    try {
      await navigator.share({
        title: 'Global Pulse',
        text: shareText,
        url: shareUrl,
      });
      return { success: true, method: 'native' };
    } catch (err) {
      if ((err as Error).name === 'AbortError') {
        return { success: false, method: 'failed' };
      }
    }
  }

  // Fallback: copy to clipboard
  if (typeof navigator !== 'undefined' && navigator.clipboard) {
    try {
      await navigator.clipboard.writeText(`${shareText}\n${shareUrl}`);
      trackShare(data.userId, type, { emoji: data.emoji }, 'clipboard');
      return { success: true, method: 'clipboard' };
    } catch {
      // Continue to failed
    }
  }

  return { success: false, method: 'failed' };
}

/**
 * Share a badge unlock
 */
export async function shareBadge(
  badgeId: string,
  badgeName: string,
  streakDays: number,
  referralCode?: string,
  userId?: string
): Promise<{ success: boolean; method: 'native' | 'clipboard' | 'failed' }> {
  return sharePulse(
    {
      emoji: '🏆',
      streakDays,
      aura: null,
      badgeId,
      badgeName,
      referralCode,
      userId,
    },
    'badge'
  );
}

/**
 * Share leaderboard position
 */
export async function shareLeaderboard(
  userRank: number,
  cityName: string | undefined,
  streakDays: number,
  referralCode?: string,
  userId?: string
): Promise<{ success: boolean; method: 'native' | 'clipboard' | 'failed' }> {
  return sharePulse(
    {
      emoji: '🏅',
      streakDays,
      aura: null,
      userRank,
      cityName,
      referralCode,
      userId,
    },
    'leaderboard'
  );
}

/**
 * Share referral code directly
 */
export async function shareReferral(
  referralCode: string,
  userId?: string
): Promise<{ success: boolean; method: 'native' | 'clipboard' | 'failed' }> {
  return sharePulse(
    {
      emoji: '🤝',
      streakDays: 0,
      aura: null,
      referralCode,
      userId,
    },
    'referral'
  );
}

/**
 * Download the share card as an image
 */
export async function downloadShareCard(data: ShareData): Promise<boolean> {
  const imageUrl = getShareCardUrl(data);

  try {
    const response = await fetch(imageUrl);
    const blob = await response.blob();

    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `global-pulse-${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    // Track download
    trackShare(data.userId, 'pulse', { method: 'download' }, 'download');

    return true;
  } catch (err) {
    console.error('Download failed:', err);
    return false;
  }
}
