import { NextRequest, NextResponse } from 'next/server';
import { WINDOWS, WindowType } from '@/lib/constants';
import { sendWindowOpenNotification, sendWindowClosingNotification } from '@/lib/onesignal/server';

// Minutes before window end to send closing notification
const WINDOW_CLOSING_ALERT_MINUTES = 30;

// Common timezones by UTC offset
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

function verifyCronSecret(request: NextRequest): boolean {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) {
    console.warn('CRON_SECRET not configured');
    return false;
  }

  return authHeader === `Bearer ${cronSecret}`;
}

export async function GET(request: NextRequest) {
  if (!verifyCronSecret(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const now = new Date();
  const currentUtcHour = now.getUTCHours();
  const currentMinute = now.getUTCMinutes();

  const triggeredOpen: Array<{ timezone: string; window: WindowType }> = [];
  const triggeredClosing: Array<{ timezone: string; window: WindowType; minutesRemaining: number }> = [];

  // Check each timezone group
  for (const [offsetStr, timezones] of Object.entries(TIMEZONE_GROUPS)) {
    const offset = parseFloat(offsetStr);
    let localHour = currentUtcHour + offset;
    const localMinute = currentMinute;

    // Normalize to 0-23
    if (localHour < 0) localHour += 24;
    if (localHour >= 24) localHour -= 24;

    // Check each window for opening and closing
    for (const [windowType, { start, end }] of Object.entries(WINDOWS)) {
      // ====== WINDOW OPENING ======
      // Trigger at the start of each window (within first 5 minutes of the hour)
      if (Math.floor(localHour) === start && localMinute < 5) {
        for (const timezone of timezones) {
          try {
            await sendWindowOpenNotification(timezone, windowType);
            triggeredOpen.push({ timezone, window: windowType as WindowType });
          } catch (error) {
            console.error(`Failed to send OPEN notification for ${timezone}:`, error);
          }
        }
      }

      // ====== WINDOW CLOSING SOON ======
      // First, verify we're inside this window
      const currentHourFloor = Math.floor(localHour);
      const isInWindow = currentHourFloor >= start && currentHourFloor < end;

      if (isInWindow) {
        // Calculate minutes remaining in the window
        // Window ends at 'end' hour (e.g., end=11 means window closes at 11:00)
        const currentTotalMinutes = currentHourFloor * 60 + localMinute;
        const windowEndTotalMinutes = end * 60;

        // Check if we're approaching the end
        const minutesRemaining = windowEndTotalMinutes - currentTotalMinutes;

        // Send closing alert when exactly WINDOW_CLOSING_ALERT_MINUTES remain (within 5 min tolerance)
        // e.g., if WINDOW_CLOSING_ALERT_MINUTES=30, trigger when minutesRemaining is between 26-30
        if (
          minutesRemaining > 0 &&
          minutesRemaining <= WINDOW_CLOSING_ALERT_MINUTES &&
          minutesRemaining > WINDOW_CLOSING_ALERT_MINUTES - 5
        ) {
          for (const timezone of timezones) {
            try {
              await sendWindowClosingNotification(timezone, windowType, WINDOW_CLOSING_ALERT_MINUTES);
              triggeredClosing.push({
                timezone,
                window: windowType as WindowType,
                minutesRemaining: WINDOW_CLOSING_ALERT_MINUTES,
              });
            } catch (error) {
              console.error(`Failed to send CLOSING notification for ${timezone}:`, error);
            }
          }
        }
      }
    }
  }

  return NextResponse.json({
    message: `Triggered ${triggeredOpen.length} open + ${triggeredClosing.length} closing notifications`,
    triggeredOpen,
    triggeredClosing,
  });
}
