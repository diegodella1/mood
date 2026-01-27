import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { supabaseAdmin } from '@/lib/supabase/server';

const notifySchema = z.object({
  userId: z.string().uuid(),
  emoji: z.string(),
  displayName: z.string().optional(),
});

/**
 * Send push notification to followers when a user pulses
 * Called from the pulse API (fire and forget)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const data = notifySchema.parse(body);

    // Get user's followers who have push enabled
    const { data: followers, error: followersError } = await supabaseAdmin
      .from('follows')
      .select(`
        follower_id,
        follower:users!follows_follower_id_fkey (
          id,
          onesignal_player_id,
          push_opt_in
        )
      `)
      .eq('following_id', data.userId);

    if (followersError || !followers || followers.length === 0) {
      return NextResponse.json({ sent: 0 });
    }

    // Filter followers with push enabled
    const pushEnabledFollowers = followers.filter((f) => {
      const follower = f.follower as { onesignal_player_id?: string; push_opt_in?: boolean } | null;
      return follower?.push_opt_in && follower?.onesignal_player_id;
    });

    if (pushEnabledFollowers.length === 0) {
      return NextResponse.json({ sent: 0 });
    }

    // Get OneSignal player IDs
    const playerIds = pushEnabledFollowers
      .map((f) => {
        const follower = f.follower as { onesignal_player_id?: string } | null;
        return follower?.onesignal_player_id;
      })
      .filter(Boolean) as string[];

    if (playerIds.length === 0) {
      return NextResponse.json({ sent: 0 });
    }

    // Send notification via OneSignal
    const displayName = data.displayName || 'Someone you follow';
    const oneSignalAppId = process.env.ONESIGNAL_APP_ID;
    const oneSignalApiKey = process.env.ONESIGNAL_REST_API_KEY;

    if (!oneSignalAppId || !oneSignalApiKey) {
      console.error('OneSignal credentials not configured');
      return NextResponse.json({ sent: 0, error: 'Push not configured' });
    }

    const notification = {
      app_id: oneSignalAppId,
      include_player_ids: playerIds,
      contents: {
        en: `${displayName} just shared their vibe ${data.emoji}`,
        es: `${displayName} compartió su vibe ${data.emoji}`,
      },
      headings: {
        en: 'Friend Activity',
        es: 'Actividad de Amigo',
      },
      data: {
        type: 'friend_pulse',
        userId: data.userId,
        emoji: data.emoji,
      },
      // iOS specific
      ios_badgeType: 'Increase',
      ios_badgeCount: 1,
      // Android specific
      android_channel_id: 'friend_activity',
      small_icon: 'ic_stat_pulse',
      // TTL - expire after 1 hour
      ttl: 3600,
    };

    const response = await fetch('https://onesignal.com/api/v1/notifications', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${oneSignalApiKey}`,
      },
      body: JSON.stringify(notification),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('OneSignal error:', error);
      return NextResponse.json({ sent: 0, error: 'Push failed' });
    }

    const result = await response.json();

    return NextResponse.json({
      sent: result.recipients || playerIds.length,
      notificationId: result.id,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    }
    console.error('Friend notification error:', error);
    return NextResponse.json({ sent: 0, error: 'Internal error' });
  }
}
