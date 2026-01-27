import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: userId } = await params;

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(userId)) {
      return NextResponse.json(
        { error: 'Invalid user ID format' },
        { status: 400 }
      );
    }

    // Auth check: Only allow users to fetch their own reactions
    // Get userId from header (set by client) or query param
    const requestingUserId = request.headers.get('x-user-id') ||
      request.nextUrl.searchParams.get('requesterId');

    if (requestingUserId !== userId) {
      return NextResponse.json(
        { error: 'Forbidden: Can only view your own reactions' },
        { status: 403 }
      );
    }

    // Use database function for efficient aggregation (avoids N+1 queries)
    // First, check if the function exists, otherwise fall back to limited query
    const { data: statsData, error: statsError } = await supabaseAdmin.rpc(
      'get_user_reactions_received',
      { p_user_id: userId }
    );

    // If function exists and works, use it
    if (!statsError && statsData) {
      return NextResponse.json(statsData);
    }

    // Fallback: Limited query approach with pagination
    // Get only the most recent 500 pulses to prevent query bomb
    const { data: userPulses, error: pulsesError } = await supabaseAdmin
      .from('pulses')
      .select('id')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(500);

    if (pulsesError) {
      console.error('Error fetching user pulses:', pulsesError);
      return NextResponse.json(
        { error: 'Failed to fetch user data' },
        { status: 500 }
      );
    }

    if (!userPulses || userPulses.length === 0) {
      return NextResponse.json({
        totalReactions: 0,
        reactionsByType: {},
        uniqueReactors: 0,
      });
    }

    const pulseIds = userPulses.map(p => p.id);

    // Batch query with limit to prevent memory exhaustion
    const { data: reactions, error: reactionsError } = await supabaseAdmin
      .from('reactions')
      .select('emoji, user_id')
      .in('pulse_id', pulseIds)
      .limit(5000); // Cap at 5000 reactions

    if (reactionsError) {
      console.error('Error fetching reactions:', reactionsError);
      return NextResponse.json(
        { error: 'Failed to fetch reactions' },
        { status: 500 }
      );
    }

    // Calculate stats
    const totalReactions = reactions?.length || 0;
    const uniqueReactors = new Set(reactions?.map(r => r.user_id)).size;

    // Count by type (limit to top 10 emojis)
    const reactionsByType: Record<string, number> = {};
    reactions?.forEach(r => {
      reactionsByType[r.emoji] = (reactionsByType[r.emoji] || 0) + 1;
    });

    // Sort by count and limit to top 10
    const sortedReactions = Object.entries(reactionsByType)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .reduce((acc, [emoji, count]) => {
        acc[emoji] = count;
        return acc;
      }, {} as Record<string, number>);

    return NextResponse.json({
      totalReactions,
      reactionsByType: sortedReactions,
      uniqueReactors,
    });
  } catch (error) {
    console.error('Reactions received error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
