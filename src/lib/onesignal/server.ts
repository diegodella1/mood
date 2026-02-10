import { supabaseAdmin } from '@/lib/supabase/server';

const ONESIGNAL_APP_ID = process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID!;
const ONESIGNAL_REST_API_KEY = process.env.ONESIGNAL_REST_API_KEY!;

const ONESIGNAL_API_BASE = 'https://api.onesignal.com';

interface NotificationOptions {
  title: string;
  message: string;
  url?: string;
  data?: Record<string, unknown>;
  ttl?: number;
  web_push_topic?: string;
  idempotency_key?: string;
  web_buttons?: Array<{ id: string; text: string; url: string }>;
}

interface FilterTag {
  field: 'tag';
  key: string;
  value: string;
  relation?: '=' | '!=' | '>' | '<' | '>=' | '<=' | 'exists' | 'not_exists';
}

interface Filter {
  filters: (FilterTag | { operator: 'OR' | 'AND' })[];
}

type NotificationResult = { success: boolean; id?: string; error?: string };

/** Build common headers for OneSignal API calls */
function buildHeaders(idempotencyKey?: string): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Authorization': `Basic ${ONESIGNAL_REST_API_KEY}`,
  };
  if (idempotencyKey) {
    headers['Idempotency-Key'] = idempotencyKey;
  }
  return headers;
}

/** Build common body fields from NotificationOptions */
function buildBody(options: NotificationOptions): Record<string, unknown> {
  const body: Record<string, unknown> = {
    app_id: ONESIGNAL_APP_ID,
    headings: { en: options.title },
    contents: { en: options.message },
  };
  if (options.url) body.url = options.url;
  if (options.data) body.data = options.data;
  if (options.ttl !== undefined) body.ttl = options.ttl;
  if (options.web_push_topic) body.web_push_topic = options.web_push_topic;
  if (options.web_buttons) body.web_buttons = options.web_buttons;
  return body;
}

/** Parse OneSignal API response */
async function parseResponse(response: Response): Promise<NotificationResult> {
  const result = await response.json();
  if (result.errors) {
    const errorMsg = Array.isArray(result.errors)
      ? result.errors.join(', ')
      : JSON.stringify(result.errors);
    return { success: false, error: errorMsg };
  }
  return { success: true, id: result.id };
}

/**
 * Send notification to all subscribed users
 */
export async function sendNotificationToAll(options: NotificationOptions): Promise<NotificationResult> {
  const response = await fetch(`${ONESIGNAL_API_BASE}/notifications`, {
    method: 'POST',
    headers: buildHeaders(options.idempotency_key),
    body: JSON.stringify({
      ...buildBody(options),
      included_segments: ['All'],
    }),
  });
  return parseResponse(response);
}

/**
 * Send notification to users matching specific tag filters
 */
export async function sendNotificationByTags(
  options: NotificationOptions,
  filter: Filter
): Promise<NotificationResult> {
  const response = await fetch(`${ONESIGNAL_API_BASE}/notifications`, {
    method: 'POST',
    headers: buildHeaders(options.idempotency_key),
    body: JSON.stringify({
      ...buildBody(options),
      filters: filter.filters,
    }),
  });
  return parseResponse(response);
}

/**
 * Send notification to specific users by external user IDs
 * Uses the new include_aliases API (replaces deprecated include_external_user_ids)
 */
export async function sendNotificationToUsers(
  options: NotificationOptions,
  externalUserIds: string[]
): Promise<NotificationResult> {
  const response = await fetch(`${ONESIGNAL_API_BASE}/notifications`, {
    method: 'POST',
    headers: buildHeaders(options.idempotency_key),
    body: JSON.stringify({
      ...buildBody(options),
      include_aliases: { external_id: externalUserIds },
      target_channel: 'push',
    }),
  });
  return parseResponse(response);
}

// ── Timezone / date helpers ──────────────────────────────────────────

/** Get today's date string in a given timezone */
function todayInTz(timezone: string): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: timezone }).format(new Date());
}

/**
 * Check if the current local time in the given timezone falls within quiet hours.
 * Default quiet hours: 22:00 – 08:00 local.
 */
export function isInQuietHours(
  timezone: string,
  quietStart = 22,
  quietEnd = 8
): boolean {
  const hour = Number(
    new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      hour: 'numeric',
      hour12: false,
    }).format(new Date())
  );

  if (quietStart > quietEnd) {
    // Wraps midnight (e.g. 22–08)
    return hour >= quietStart || hour < quietEnd;
  }
  return hour >= quietStart && hour < quietEnd;
}

// ── Window notification helpers ──────────────────────────────────────

const windowLabels: Record<string, string> = {
  morning: 'Morning',
  afternoon: 'Afternoon',
  night: 'Night',
};

/**
 * Send notification to users in a specific timezone when a window opens
 */
export async function sendWindowOpenNotification(
  timezone: string,
  windowType: string
): Promise<NotificationResult> {
  const dateStr = todayInTz(timezone);
  return sendNotificationByTags(
    {
      title: `${windowLabels[windowType]} Pulse Open! 🌍`,
      message: "How are you feeling right now? Share your mood with the world.",
      url: '/',
      ttl: 10800,
      web_push_topic: `window-${windowType}`,
      idempotency_key: `window-open-${windowType}-${timezone}-${dateStr}`,
    },
    {
      filters: [
        { field: 'tag', key: 'tz', value: timezone },
      ],
    }
  );
}

/**
 * Send notification to users in a specific timezone when a window is closing soon
 */
export async function sendWindowClosingNotification(
  timezone: string,
  windowType: string,
  minutesRemaining: number
): Promise<NotificationResult> {
  const urgencyEmoji = minutesRemaining <= 15 ? '⚡' : '⏰';
  const dateStr = todayInTz(timezone);

  return sendNotificationByTags(
    {
      title: `${urgencyEmoji} ${windowLabels[windowType]} Window closing soon!`,
      message: `Only ${minutesRemaining} minutes left to share your mood. Don't miss it!`,
      url: '/',
      ttl: minutesRemaining * 60,
      web_push_topic: `window-${windowType}`,
      idempotency_key: `window-closing-${windowType}-${timezone}-${dateStr}`,
    },
    {
      filters: [
        { field: 'tag', key: 'tz', value: timezone },
      ],
    }
  );
}

/**
 * Send notification to a specific user who hasn't pulsed in the current window
 */
export async function sendWindowReminderToUser(
  externalUserId: string,
  windowType: string,
  minutesRemaining: number
): Promise<NotificationResult> {
  const dateStr = todayInTz('UTC');

  return sendNotificationToUsers(
    {
      title: `⏰ ${minutesRemaining} min left in ${windowLabels[windowType]} window`,
      message: "You haven't shared your mood yet. Tap to pulse now!",
      url: '/',
      ttl: minutesRemaining * 60,
      web_push_topic: `window-${windowType}`,
      idempotency_key: `nudge-${externalUserId}-${windowType}-${dateStr}`,
    },
    [externalUserId]
  );
}

/**
 * Update tags for a specific user
 */
export async function updateUserTags(
  externalUserId: string,
  tags: Record<string, string | number>
): Promise<{ success: boolean; error?: string }> {
  const response = await fetch(
    `${ONESIGNAL_API_BASE}/apps/${ONESIGNAL_APP_ID}/users/by/external_id/${externalUserId}`,
    {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${ONESIGNAL_REST_API_KEY}`,
      },
      body: JSON.stringify({
        properties: { tags },
      }),
    }
  );

  if (!response.ok) {
    const error = await response.text();
    return { success: false, error };
  }

  return { success: true };
}

// ── Custom window helpers ────────────────────────────────────────────

interface CustomWindowNotificationOptions {
  windowName: string;
  icon: string;
  xpMultiplier: number;
  customTitle?: string | null;
  customBody?: string | null;
}

/**
 * Send notification when a custom window opens
 */
export async function sendCustomWindowOpenNotification(
  options: CustomWindowNotificationOptions,
  targetTimezones?: string[] | null,
  targetCountries?: string[] | null
): Promise<NotificationResult> {
  const title = options.customTitle || `${options.icon} ${options.windowName} is LIVE!`;
  const message = options.customBody ||
    `Special event active now! ${options.xpMultiplier > 1 ? `Earn ${options.xpMultiplier}x XP on your pulse!` : 'Join and share your mood!'}`;

  const dateStr = todayInTz('UTC');
  const safeName = options.windowName.replace(/\s+/g, '-').toLowerCase();

  const base: NotificationOptions = {
    title,
    message,
    url: '/',
    data: { type: 'custom_window_open' },
    ttl: 14400,
    web_push_topic: `custom-${safeName}`,
    idempotency_key: `custom-open-${safeName}-${dateStr}`,
  };

  // Build filters based on targeting
  const filters: (FilterTag | { operator: 'OR' | 'AND' })[] = [];

  if (targetTimezones && targetTimezones.length > 0) {
    targetTimezones.forEach((tz, index) => {
      if (index > 0) filters.push({ operator: 'OR' });
      filters.push({ field: 'tag', key: 'tz', value: tz });
    });
  }

  if (targetCountries && targetCountries.length > 0) {
    if (filters.length > 0) filters.push({ operator: 'AND' });
    targetCountries.forEach((country, index) => {
      if (index > 0) filters.push({ operator: 'OR' });
      filters.push({ field: 'tag', key: 'country', value: country });
    });
  }

  if (filters.length === 0) {
    return sendNotificationToAll(base);
  }

  return sendNotificationByTags(base, { filters });
}

/**
 * Send notification when a custom window is closing soon
 */
export async function sendCustomWindowClosingNotification(
  options: CustomWindowNotificationOptions,
  minutesRemaining: number,
  targetTimezones?: string[] | null,
  targetCountries?: string[] | null
): Promise<NotificationResult> {
  const urgencyEmoji = minutesRemaining <= 15 ? '⚡' : '⏰';
  const title = `${urgencyEmoji} ${options.windowName} closing soon!`;
  const message = `Only ${minutesRemaining} min left! ${options.xpMultiplier > 1 ? `Don't miss ${options.xpMultiplier}x XP!` : 'Share your mood now!'}`;

  const dateStr = todayInTz('UTC');
  const safeName = options.windowName.replace(/\s+/g, '-').toLowerCase();

  const base: NotificationOptions = {
    title,
    message,
    url: '/',
    data: { type: 'custom_window_closing' },
    ttl: minutesRemaining * 60,
    web_push_topic: `custom-${safeName}`,
    idempotency_key: `custom-closing-${safeName}-${dateStr}`,
  };

  // Build filters based on targeting
  const filters: (FilterTag | { operator: 'OR' | 'AND' })[] = [];

  if (targetTimezones && targetTimezones.length > 0) {
    targetTimezones.forEach((tz, index) => {
      if (index > 0) filters.push({ operator: 'OR' });
      filters.push({ field: 'tag', key: 'tz', value: tz });
    });
  }

  if (targetCountries && targetCountries.length > 0) {
    if (filters.length > 0) filters.push({ operator: 'AND' });
    targetCountries.forEach((country, index) => {
      if (index > 0) filters.push({ operator: 'OR' });
      filters.push({ field: 'tag', key: 'country', value: country });
    });
  }

  if (filters.length === 0) {
    return sendNotificationToAll(base);
  }

  return sendNotificationByTags(base, { filters });
}

// ── Battle notification helper ───────────────────────────────────────

interface BattleNotificationOptions {
  title: string;
  message: string;
  cityIds: string[];
  battleId: string;
  phase: 'start' | 'mid' | 'end';
  ttl?: number;
}

/**
 * Send notification for city battles — links to /leaderboard?type=cities
 */
export async function sendBattleNotification(
  options: BattleNotificationOptions
): Promise<NotificationResult> {
  const filters: (FilterTag | { operator: 'OR' | 'AND' })[] = [];
  options.cityIds.forEach((cityId, index) => {
    if (index > 0) filters.push({ operator: 'OR' });
    filters.push({ field: 'tag', key: 'city_id', value: cityId });
  });

  return sendNotificationByTags(
    {
      title: options.title,
      message: options.message,
      url: '/leaderboard?type=cities',
      data: { type: 'battle', battle_id: options.battleId, phase: options.phase },
      ttl: options.ttl ?? 7200,
      web_push_topic: `battle-${options.battleId}`,
      idempotency_key: `battle-${options.phase}-${options.battleId}`,
    },
    { filters }
  );
}

// ── Guardrails: quiet hours + daily cap ──────────────────────────────

const DEFAULT_DAILY_CAP = 2;
const DEFAULT_QUIET_START = 22;
const DEFAULT_QUIET_END = 8;

/**
 * Send a notification to a single user with quiet hours and daily cap enforcement.
 * Returns { success: false, error: 'quiet_hours' | 'daily_cap' } when blocked.
 */
export async function sendNotificationWithGuardrails(
  options: NotificationOptions,
  userId: string,
  timezone: string,
  dailyCap = DEFAULT_DAILY_CAP,
): Promise<NotificationResult> {
  // 1. Check quiet hours
  if (isInQuietHours(timezone, DEFAULT_QUIET_START, DEFAULT_QUIET_END)) {
    return { success: false, error: 'quiet_hours' };
  }

  // 2. Check daily cap
  const { data: user } = await supabaseAdmin
    .from('users')
    .select('notifications_today')
    .eq('id', userId)
    .single();

  const sentToday = (user?.notifications_today as number) ?? 0;
  if (sentToday >= dailyCap) {
    return { success: false, error: 'daily_cap' };
  }

  // 3. Send
  const result = await sendNotificationToUsers(options, [userId]);

  // 4. Increment counter
  if (result.success) {
    await supabaseAdmin.rpc('increment_notifications_today', { p_user_id: userId });
  }

  return result;
}
