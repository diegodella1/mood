import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { requireUser } from '@/lib/session';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const session = requireUser(request);
  if (!session.ok) return session.response;
  const userId = session.userId;

  try {
    const { data: feed, error } = await supabaseAdmin.rpc('get_friends_feed', {
      p_user_id: userId,
      p_limit: 50,
    });

    if (error) {
      console.error('Feed error:', error);
      return NextResponse.json({ error: 'Failed to get feed' }, { status: 500 });
    }

    return NextResponse.json({
      feed: feed?.map((item: Record<string, unknown>) => ({
        userId: item.user_id,
        displayName: item.display_name || 'Anonymous',
        emoji: item.emoji,
        activityType: item.activity_type,
        createdAt: item.created_at,
        metadata: item.metadata,
      })) || [],
    });
  } catch (error) {
    console.error('Feed error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
