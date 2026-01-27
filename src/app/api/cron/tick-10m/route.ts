import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { sendNotificationByTags } from '@/lib/onesignal/server';
import { normalizeToEmoji, getEmojiLabel } from '@/lib/constants';

interface CityAggregate {
  window_id: string;
  city_id: string;
  mood_counts: Record<string, number>;
  total_count: number;
  updated_at: string;
}

function verifyCronSecret(request: NextRequest): boolean {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) {
    console.warn('CRON_SECRET not configured');
    return false;
  }

  return authHeader === `Bearer ${cronSecret}`;
}

function getDominantMood(moodCounts: Record<string, number>): string {
  let maxCount = 0;
  let dominant = '';

  for (const [mood, count] of Object.entries(moodCounts)) {
    if (count > maxCount) {
      maxCount = count;
      dominant = mood;
    }
  }

  return dominant;
}

export async function GET(request: NextRequest) {
  if (!verifyCronSecret(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Get recent city aggregates that have changed
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();

    const { data: recentCityAggs } = await supabaseAdmin
      .from('aggregates_city_window')
      .select('*')
      .gte('updated_at', tenMinutesAgo)
      .order('total_count', { ascending: false })
      .limit(10) as { data: CityAggregate[] | null };

    if (!recentCityAggs || recentCityAggs.length === 0) {
      return NextResponse.json({ message: 'No recent city updates', notifications: 0 });
    }

    let notificationsSent = 0;

    for (const cityAgg of recentCityAggs) {
      // Only notify if city has significant activity (>= 10 pulses)
      if (cityAgg.total_count < 10) continue;

      const dominantMood = getDominantMood(cityAgg.mood_counts as Record<string, number>);
      const moodPercentage = Math.round(
        ((cityAgg.mood_counts as Record<string, number>)[dominantMood] / cityAgg.total_count) * 100
      );

      // Only notify if mood is dominant (>= 40%)
      if (moodPercentage < 40) continue;

      try {
        const moodEmoji = normalizeToEmoji(dominantMood);
        const moodLabel = getEmojiLabel(dominantMood);
        await sendNotificationByTags(
          {
            title: `${cityAgg.city_id} is feeling ${moodEmoji}`,
            message: `${moodPercentage}% of people in your city are ${moodLabel} right now`,
            url: '/results',
          },
          {
            filters: [
              { field: 'tag', key: 'city_id', value: cityAgg.city_id },
            ],
          }
        );
        notificationsSent++;
      } catch (error) {
        console.error(`Failed to send city notification for ${cityAgg.city_id}:`, error);
      }
    }

    return NextResponse.json({
      message: `Sent ${notificationsSent} city trend notifications`,
      notifications: notificationsSent,
    });
  } catch (error) {
    console.error('City trends cron error:', error);
    return NextResponse.json(
      { error: 'Failed to process city trends' },
      { status: 500 }
    );
  }
}
