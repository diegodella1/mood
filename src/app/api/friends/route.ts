import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { supabaseAdmin } from '@/lib/supabase/server';
import { isValidUUID } from '@/lib/api-utils';

// Follow a user
const followSchema = z.object({
  followerId: z.string().uuid(),
  followingId: z.string().uuid(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const data = followSchema.parse(body);

    const { data: result, error } = await supabaseAdmin.rpc('follow_user', {
      p_follower_id: data.followerId,
      p_following_id: data.followingId,
    });

    if (error) {
      console.error('Follow error:', error);
      return NextResponse.json({ error: 'Failed to follow' }, { status: 500 });
    }

    if (!result?.success) {
      return NextResponse.json(
        { error: result?.error || 'Failed to follow' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      isMutual: result.is_mutual,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    }
    console.error('Follow error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

// Unfollow a user
export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    const data = followSchema.parse(body);

    const { data: result, error } = await supabaseAdmin.rpc('unfollow_user', {
      p_follower_id: data.followerId,
      p_following_id: data.followingId,
    });

    if (error) {
      console.error('Unfollow error:', error);
      return NextResponse.json({ error: 'Failed to unfollow' }, { status: 500 });
    }

    return NextResponse.json({ success: result?.success || false });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    }
    console.error('Unfollow error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

// Get followers/following lists
export async function GET(request: NextRequest) {
  const userId = request.nextUrl.searchParams.get('userId');
  const type = request.nextUrl.searchParams.get('type') || 'following'; // 'followers' | 'following' | 'mutual'

  if (!userId || !isValidUUID(userId)) {
    return NextResponse.json({ error: 'Invalid userId' }, { status: 400 });
  }

  try {
    if (type === 'followers') {
      const { data: followers, error } = await supabaseAdmin
        .from('follows')
        .select(`
          follower_id,
          created_at,
          follower:users!follows_follower_id_fkey (
            id,
            display_name,
            aura,
            streak_days
          )
        `)
        .eq('following_id', userId)
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;

      return NextResponse.json({
        followers: followers?.map((f) => {
          const follower = f.follower as { display_name?: string; aura?: string; streak_days?: number } | null;
          return {
            id: f.follower_id,
            displayName: follower?.display_name || 'Anonymous',
            aura: follower?.aura,
            streakDays: follower?.streak_days || 0,
            followedAt: f.created_at,
          };
        }) || [],
      });
    }

    if (type === 'following') {
      const { data: following, error } = await supabaseAdmin
        .from('follows')
        .select(`
          following_id,
          created_at,
          following:users!follows_following_id_fkey (
            id,
            display_name,
            aura,
            streak_days
          )
        `)
        .eq('follower_id', userId)
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;

      return NextResponse.json({
        following: following?.map((f) => {
          const followingUser = f.following as { display_name?: string; aura?: string; streak_days?: number } | null;
          return {
            id: f.following_id,
            displayName: followingUser?.display_name || 'Anonymous',
            aura: followingUser?.aura,
            streakDays: followingUser?.streak_days || 0,
            followedAt: f.created_at,
          };
        }) || [],
      });
    }

    if (type === 'mutual') {
      // Get mutual follows (friends)
      const { data: following } = await supabaseAdmin
        .from('follows')
        .select('following_id')
        .eq('follower_id', userId);

      const { data: followers } = await supabaseAdmin
        .from('follows')
        .select('follower_id')
        .eq('following_id', userId);

      const followingIds = new Set(following?.map((f) => f.following_id) || []);
      const mutualIds = (followers?.map((f) => f.follower_id) || []).filter((id) =>
        followingIds.has(id)
      );

      if (mutualIds.length === 0) {
        return NextResponse.json({ mutual: [] });
      }

      const { data: mutualUsers } = await supabaseAdmin
        .from('users')
        .select('id, display_name, aura, streak_days')
        .in('id', mutualIds);

      return NextResponse.json({
        mutual: mutualUsers?.map((u) => ({
          id: u.id,
          displayName: u.display_name || 'Anonymous',
          aura: u.aura,
          streakDays: u.streak_days || 0,
        })) || [],
      });
    }

    return NextResponse.json({ error: 'Invalid type' }, { status: 400 });
  } catch (error) {
    console.error('Get friends error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
