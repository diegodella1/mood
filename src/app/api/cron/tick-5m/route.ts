import { NextRequest, NextResponse } from 'next/server';
import { WINDOWS, WindowType } from '@/lib/constants';
import { sendWindowOpenNotification } from '@/lib/onesignal/server';

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

  // Only trigger at the start of each window (within first 5 minutes)
  if (currentMinute >= 5) {
    return NextResponse.json({ message: 'Not at window boundary', triggered: [] });
  }

  const triggered: Array<{ timezone: string; window: WindowType }> = [];

  // Check each timezone group
  for (const [offsetStr, timezones] of Object.entries(TIMEZONE_GROUPS)) {
    const offset = parseFloat(offsetStr);
    let localHour = currentUtcHour + offset;

    // Normalize to 0-23
    if (localHour < 0) localHour += 24;
    if (localHour >= 24) localHour -= 24;

    // Check if any window starts at this hour
    for (const [windowType, { start }] of Object.entries(WINDOWS)) {
      if (Math.floor(localHour) === start) {
        // Send notifications to all timezones in this group
        for (const timezone of timezones) {
          try {
            await sendWindowOpenNotification(timezone, windowType);
            triggered.push({ timezone, window: windowType as WindowType });
          } catch (error) {
            console.error(`Failed to send notification for ${timezone}:`, error);
          }
        }
      }
    }
  }

  return NextResponse.json({
    message: `Triggered ${triggered.length} notifications`,
    triggered,
  });
}
