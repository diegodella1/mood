import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import {
  sendCustomWindowOpenNotification,
  sendCustomWindowClosingNotification,
} from '@/lib/onesignal/server';
import { validateCronAuth } from '@/lib/api-utils';
import type { CustomWindow, RecurrenceRule } from '@/lib/supabase/types';

// Dedupe key prefix for notification tracking
const NOTIF_DEDUPE_PREFIX = 'custom_window';

// Common timezones by UTC offset (same as tick-5m)
const TIMEZONE_GROUPS: Record<number, string[]> = {
  [-12]: ['Etc/GMT+12'],
  [-11]: ['Pacific/Pago_Pago'],
  [-10]: ['Pacific/Honolulu'],
  [-9]: ['America/Anchorage'],
  [-8]: ['America/Los_Angeles', 'America/Vancouver'],
  [-7]: ['America/Denver', 'America/Phoenix'],
  [-6]: ['America/Chicago', 'America/Mexico_City'],
  [-5]: ['America/New_York', 'America/Toronto'],
  [-4]: ['America/Santiago', 'America/Caracas'],
  [-3]: ['America/Sao_Paulo', 'America/Buenos_Aires'],
  [-2]: ['Atlantic/South_Georgia'],
  [-1]: ['Atlantic/Azores'],
  [0]: ['Europe/London', 'UTC', 'Africa/Casablanca'],
  [1]: ['Europe/Paris', 'Europe/Berlin', 'Europe/Madrid', 'Europe/Rome'],
  [2]: ['Europe/Helsinki', 'Africa/Cairo', 'Europe/Athens'],
  [3]: ['Europe/Moscow', 'Asia/Baghdad', 'Africa/Nairobi'],
  [4]: ['Asia/Dubai', 'Asia/Baku'],
  [5]: ['Asia/Karachi', 'Asia/Tashkent'],
  [5.5]: ['Asia/Kolkata'],
  [6]: ['Asia/Dhaka', 'Asia/Almaty'],
  [7]: ['Asia/Bangkok', 'Asia/Jakarta', 'Asia/Ho_Chi_Minh'],
  [8]: ['Asia/Shanghai', 'Asia/Singapore', 'Asia/Hong_Kong', 'Asia/Taipei'],
  [9]: ['Asia/Tokyo', 'Asia/Seoul'],
  [10]: ['Australia/Sydney', 'Pacific/Guam'],
  [11]: ['Pacific/Noumea'],
  [12]: ['Pacific/Auckland', 'Pacific/Fiji'],
};

/**
 * Check if a recurring window should be active on a given date
 */
function isRecurringWindowActiveOnDate(
  rule: RecurrenceRule,
  targetDate: Date,
  startDate: Date,
  endDate?: Date | null
): boolean {
  // Check if we're within the valid date range
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
 * Get the window instance ID for tracking participations
 */
function getWindowInstanceId(windowId: string, date: Date): string {
  const dateStr = date.toISOString().split('T')[0];
  return `${windowId}_${dateStr}`;
}

/**
 * Get local hour for a given UTC time and timezone offset
 */
function getLocalHour(utcHour: number, offsetHours: number): number {
  let localHour = utcHour + offsetHours;
  if (localHour < 0) localHour += 24;
  if (localHour >= 24) localHour -= 24;
  return localHour;
}

export async function GET(request: NextRequest) {
  const auth = validateCronAuth(request);
  if (!auth.valid) return auth.error;

  const now = new Date();
  const currentUtcHour = now.getUTCHours();
  const currentMinute = now.getUTCMinutes();
  const todayDateStr = now.toISOString().split('T')[0];

  const results = {
    activated: [] as string[],
    completed: [] as string[],
    openNotifications: [] as string[],
    closingNotifications: [] as string[],
    errors: [] as string[],
  };

  try {
    // Fetch all relevant windows (scheduled or active)
    const { data: windows, error: fetchError } = await supabaseAdmin
      .from('custom_windows')
      .select('*')
      .in('status', ['scheduled', 'active']);

    if (fetchError) {
      console.error('Failed to fetch custom windows:', fetchError);
      return NextResponse.json({ error: 'Failed to fetch windows' }, { status: 500 });
    }

    if (!windows || windows.length === 0) {
      return NextResponse.json({ message: 'No active or scheduled windows', results });
    }

    // Track which notifications we've sent this run to avoid duplicates
    const sentOpenNotifications = new Set<string>();
    const sentClosingNotifications = new Set<string>();

    // Process each window
    for (const window of windows as CustomWindow[]) {
      const {
        id,
        name,
        icon,
        event_type,
        event_date,
        recurrence_rule,
        recurrence_start,
        recurrence_end,
        start_hour,
        end_hour,
        status,
        xp_multiplier,
        notify_on_open,
        notify_before_close,
        notify_minutes_before,
        custom_notification_title,
        custom_notification_body,
        target_timezones,
        target_countries,
      } = window;

      // Determine if this window should be active today
      let shouldBeActiveToday = false;

      if (event_type === 'one_time' && event_date === todayDateStr) {
        shouldBeActiveToday = true;
      } else if (event_type === 'recurring' && recurrence_rule && recurrence_start) {
        shouldBeActiveToday = isRecurringWindowActiveOnDate(
          recurrence_rule,
          now,
          new Date(recurrence_start),
          recurrence_end ? new Date(recurrence_end) : null
        );
      }

      // Process based on timezone groups
      for (const [offsetStr, timezones] of Object.entries(TIMEZONE_GROUPS)) {
        const offset = parseFloat(offsetStr);
        const localHour = getLocalHour(currentUtcHour, offset);
        const localMinuteInDay = localHour * 60 + currentMinute;

        // Check if this timezone group should see this window
        // Filter by target_timezones if specified
        const relevantTimezones =
          target_timezones && target_timezones.length > 0
            ? timezones.filter((tz) => target_timezones.includes(tz))
            : timezones;

        if (relevantTimezones.length === 0) continue;

        // Calculate window times for this local hour
        const windowStartMinute = start_hour * 60;
        const windowEndMinute = end_hour * 60;
        const isWithinWindowHours =
          localMinuteInDay >= windowStartMinute && localMinuteInDay < windowEndMinute;
        const isJustOpened =
          localMinuteInDay >= windowStartMinute && localMinuteInDay < windowStartMinute + 5;
        const minutesRemaining = windowEndMinute - localMinuteInDay;
        const isClosingSoon =
          minutesRemaining > 0 &&
          minutesRemaining <= notify_minutes_before &&
          minutesRemaining > notify_minutes_before - 5;

        // Handle status transitions
        if (status === 'scheduled' && shouldBeActiveToday && isWithinWindowHours) {
          // Activate the window
          const { error: updateError } = await supabaseAdmin
            .from('custom_windows')
            .update({ status: 'active' })
            .eq('id', id);

          if (updateError) {
            results.errors.push(`Failed to activate ${name}: ${updateError.message}`);
          } else {
            results.activated.push(name);
          }
        }

        // Handle notifications for active windows
        if ((status === 'active' || results.activated.includes(name)) && shouldBeActiveToday) {
          // Send open notification
          if (notify_on_open && isJustOpened) {
            const dedupeKey = `${NOTIF_DEDUPE_PREFIX}_open_${id}_${todayDateStr}_${offset}`;

            if (!sentOpenNotifications.has(dedupeKey)) {
              try {
                await sendCustomWindowOpenNotification(
                  {
                    windowName: name,
                    icon,
                    xpMultiplier: xp_multiplier,
                    customTitle: custom_notification_title,
                    customBody: custom_notification_body,
                  },
                  relevantTimezones,
                  target_countries
                );
                sentOpenNotifications.add(dedupeKey);
                results.openNotifications.push(`${name} (offset: ${offset})`);
              } catch (error) {
                results.errors.push(`Failed to send open notification for ${name}: ${error}`);
              }
            }
          }

          // Send closing notification
          if (notify_before_close && isClosingSoon) {
            const dedupeKey = `${NOTIF_DEDUPE_PREFIX}_closing_${id}_${todayDateStr}_${offset}`;

            if (!sentClosingNotifications.has(dedupeKey)) {
              try {
                await sendCustomWindowClosingNotification(
                  {
                    windowName: name,
                    icon,
                    xpMultiplier: xp_multiplier,
                    customTitle: custom_notification_title,
                    customBody: custom_notification_body,
                  },
                  notify_minutes_before,
                  relevantTimezones,
                  target_countries
                );
                sentClosingNotifications.add(dedupeKey);
                results.closingNotifications.push(`${name} (offset: ${offset})`);
              } catch (error) {
                results.errors.push(`Failed to send closing notification for ${name}: ${error}`);
              }
            }
          }
        }

        // Complete one-time windows after they end (only check once per window, not per timezone)
        if (
          status === 'active' &&
          event_type === 'one_time' &&
          event_date === todayDateStr &&
          offset === 0 // Only check for UTC
        ) {
          // For one-time events, complete after all timezones have passed the end hour
          // We use a conservative check: UTC + 14 (furthest timezone)
          const furthestLocalHour = getLocalHour(currentUtcHour, 14);
          const furthestLocalMinute = furthestLocalHour * 60 + currentMinute;

          if (furthestLocalMinute >= windowEndMinute) {
            const { error: completeError } = await supabaseAdmin
              .from('custom_windows')
              .update({ status: 'completed' })
              .eq('id', id);

            if (completeError) {
              results.errors.push(`Failed to complete ${name}: ${completeError.message}`);
            } else {
              results.completed.push(name);
            }
          }
        }
      }
    }

    return NextResponse.json({
      message: `Processed ${windows.length} windows`,
      results,
      timestamp: now.toISOString(),
    });
  } catch (error) {
    console.error('Custom windows cron error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
