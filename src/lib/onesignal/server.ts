const ONESIGNAL_APP_ID = process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID!;
const ONESIGNAL_REST_API_KEY = process.env.ONESIGNAL_REST_API_KEY!;

interface NotificationOptions {
  title: string;
  message: string;
  url?: string;
  data?: Record<string, unknown>;
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

/**
 * Send notification to all subscribed users
 */
export async function sendNotificationToAll(options: NotificationOptions): Promise<{ success: boolean; id?: string; error?: string }> {
  const response = await fetch('https://onesignal.com/api/v1/notifications', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Basic ${ONESIGNAL_REST_API_KEY}`,
    },
    body: JSON.stringify({
      app_id: ONESIGNAL_APP_ID,
      included_segments: ['All'],
      headings: { en: options.title },
      contents: { en: options.message },
      url: options.url,
      data: options.data,
    }),
  });

  const result = await response.json();

  if (result.errors) {
    return { success: false, error: result.errors.join(', ') };
  }

  return { success: true, id: result.id };
}

/**
 * Send notification to users matching specific tag filters
 */
export async function sendNotificationByTags(
  options: NotificationOptions,
  filter: Filter
): Promise<{ success: boolean; id?: string; error?: string }> {
  const response = await fetch('https://onesignal.com/api/v1/notifications', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Basic ${ONESIGNAL_REST_API_KEY}`,
    },
    body: JSON.stringify({
      app_id: ONESIGNAL_APP_ID,
      filters: filter.filters,
      headings: { en: options.title },
      contents: { en: options.message },
      url: options.url,
      data: options.data,
    }),
  });

  const result = await response.json();

  if (result.errors) {
    return { success: false, error: result.errors.join(', ') };
  }

  return { success: true, id: result.id };
}

/**
 * Send notification to specific users by external user IDs
 */
export async function sendNotificationToUsers(
  options: NotificationOptions,
  externalUserIds: string[]
): Promise<{ success: boolean; id?: string; error?: string }> {
  const response = await fetch('https://onesignal.com/api/v1/notifications', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Basic ${ONESIGNAL_REST_API_KEY}`,
    },
    body: JSON.stringify({
      app_id: ONESIGNAL_APP_ID,
      include_external_user_ids: externalUserIds,
      channel_for_external_user_ids: 'push',
      headings: { en: options.title },
      contents: { en: options.message },
      url: options.url,
      data: options.data,
    }),
  });

  const result = await response.json();

  if (result.errors) {
    return { success: false, error: result.errors.join(', ') };
  }

  return { success: true, id: result.id };
}

/**
 * Send notification to users in a specific timezone when a window opens
 */
export async function sendWindowOpenNotification(
  timezone: string,
  windowType: string
): Promise<{ success: boolean; id?: string; error?: string }> {
  const windowLabels: Record<string, string> = {
    morning: 'Morning',
    afternoon: 'Afternoon',
    night: 'Night',
  };

  return sendNotificationByTags(
    {
      title: `${windowLabels[windowType]} Pulse Open! 🌍`,
      message: "How are you feeling right now? Share your mood with the world.",
      url: '/',
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
): Promise<{ success: boolean; id?: string; error?: string }> {
  const windowLabels: Record<string, string> = {
    morning: 'Morning',
    afternoon: 'Afternoon',
    night: 'Night',
  };

  const urgencyEmoji = minutesRemaining <= 15 ? '⚡' : '⏰';

  return sendNotificationByTags(
    {
      title: `${urgencyEmoji} ${windowLabels[windowType]} Window closing soon!`,
      message: `Only ${minutesRemaining} minutes left to share your mood. Don't miss it!`,
      url: '/',
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
): Promise<{ success: boolean; id?: string; error?: string }> {
  const windowLabels: Record<string, string> = {
    morning: 'Morning',
    afternoon: 'Afternoon',
    night: 'Night',
  };

  return sendNotificationToUsers(
    {
      title: `⏰ ${minutesRemaining} min left in ${windowLabels[windowType]} window`,
      message: "You haven't shared your mood yet. Tap to pulse now!",
      url: '/',
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
  const response = await fetch(`https://onesignal.com/api/v1/apps/${ONESIGNAL_APP_ID}/users/by/external_id/${externalUserId}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Basic ${ONESIGNAL_REST_API_KEY}`,
    },
    body: JSON.stringify({
      properties: {
        tags,
      },
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    return { success: false, error };
  }

  return { success: true };
}

/**
 * Custom Window notification options
 */
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
): Promise<{ success: boolean; id?: string; error?: string }> {
  const title = options.customTitle || `${options.icon} ${options.windowName} is LIVE!`;
  const message = options.customBody ||
    `Special event active now! ${options.xpMultiplier > 1 ? `Earn ${options.xpMultiplier}x XP on your pulse!` : 'Join and share your mood!'}`;

  // Build filters based on targeting
  const filters: (FilterTag | { operator: 'OR' | 'AND' })[] = [];

  if (targetTimezones && targetTimezones.length > 0) {
    targetTimezones.forEach((tz, index) => {
      if (index > 0) {
        filters.push({ operator: 'OR' });
      }
      filters.push({ field: 'tag', key: 'tz', value: tz });
    });
  }

  if (targetCountries && targetCountries.length > 0) {
    // If we have timezone filters, add AND operator
    if (filters.length > 0) {
      filters.push({ operator: 'AND' });
    }

    // Add country filters with OR between them
    const countryFilters: (FilterTag | { operator: 'OR' | 'AND' })[] = [];
    targetCountries.forEach((country, index) => {
      if (index > 0) {
        countryFilters.push({ operator: 'OR' });
      }
      countryFilters.push({ field: 'tag', key: 'country', value: country });
    });
    filters.push(...countryFilters);
  }

  // If no specific targeting, send to all
  if (filters.length === 0) {
    return sendNotificationToAll({
      title,
      message,
      url: '/',
      data: { type: 'custom_window_open' },
    });
  }

  return sendNotificationByTags(
    {
      title,
      message,
      url: '/',
      data: { type: 'custom_window_open' },
    },
    { filters }
  );
}

/**
 * Send notification when a custom window is closing soon
 */
export async function sendCustomWindowClosingNotification(
  options: CustomWindowNotificationOptions,
  minutesRemaining: number,
  targetTimezones?: string[] | null,
  targetCountries?: string[] | null
): Promise<{ success: boolean; id?: string; error?: string }> {
  const urgencyEmoji = minutesRemaining <= 15 ? '⚡' : '⏰';
  const title = `${urgencyEmoji} ${options.windowName} closing soon!`;
  const message = `Only ${minutesRemaining} min left! ${options.xpMultiplier > 1 ? `Don't miss ${options.xpMultiplier}x XP!` : 'Share your mood now!'}`;

  // Build filters based on targeting
  const filters: (FilterTag | { operator: 'OR' | 'AND' })[] = [];

  if (targetTimezones && targetTimezones.length > 0) {
    targetTimezones.forEach((tz, index) => {
      if (index > 0) {
        filters.push({ operator: 'OR' });
      }
      filters.push({ field: 'tag', key: 'tz', value: tz });
    });
  }

  if (targetCountries && targetCountries.length > 0) {
    if (filters.length > 0) {
      filters.push({ operator: 'AND' });
    }

    const countryFilters: (FilterTag | { operator: 'OR' | 'AND' })[] = [];
    targetCountries.forEach((country, index) => {
      if (index > 0) {
        countryFilters.push({ operator: 'OR' });
      }
      countryFilters.push({ field: 'tag', key: 'country', value: country });
    });
    filters.push(...countryFilters);
  }

  // If no specific targeting, send to all
  if (filters.length === 0) {
    return sendNotificationToAll({
      title,
      message,
      url: '/',
      data: { type: 'custom_window_closing' },
    });
  }

  return sendNotificationByTags(
    {
      title,
      message,
      url: '/',
      data: { type: 'custom_window_closing' },
    },
    { filters }
  );
}
