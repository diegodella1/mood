import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { supabaseAdmin } from '@/lib/supabase/server';
import { sendNotificationToUsers } from '@/lib/onesignal/server';

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
          push_opt_in
        )
      `)
      .eq('following_id', data.userId);

    if (followersError || !followers || followers.length === 0) {
      return NextResponse.json({ sent: 0 });
    }

    // Filter followers with push enabled — use external_id (user.id) instead of player_ids
    const followerIds = followers
      .filter((f) => {
        const follower = f.follower as unknown as { id?: string; push_opt_in?: boolean } | null;
        return follower?.push_opt_in && follower?.id;
      })
      .map((f) => {
        const follower = f.follower as unknown as { id: string };
        return follower.id;
      });

    if (followerIds.length === 0) {
      return NextResponse.json({ sent: 0 });
    }

    const displayName = data.displayName || 'Someone you follow';

    const result = await sendNotificationToUsers(
      {
        title: 'Friend Activity',
        message: `${displayName} just shared their vibe ${data.emoji}`,
        url: '/',
        data: {
          type: 'friend_pulse',
          userId: data.userId,
          emoji: data.emoji,
        },
        ttl: 3600,
        web_push_topic: `friend-pulse-${data.userId}`,
      },
      followerIds
    );

    if (!result.success) {
      console.error('OneSignal error:', result.error);
      return NextResponse.json({ sent: 0, error: 'Push failed' });
    }

    return NextResponse.json({
      sent: followerIds.length,
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
