import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId');
  const windowId = searchParams.get('windowId');
  const mood = searchParams.get('mood');

  if (!userId || !windowId || !mood) {
    return NextResponse.json({ error: 'userId, windowId, and mood required' }, { status: 400 });
  }

  try {
    const { data, error } = await supabaseAdmin.rpc('get_friends_same_mood', {
      p_user_id: userId,
      p_window_id: windowId,
      p_mood: mood,
    });

    if (error) {
      console.error('Friends same mood error:', error);
      return NextResponse.json({ error: 'Failed to fetch' }, { status: 500 });
    }

    return NextResponse.json({ friends: data || [] });
  } catch (error) {
    console.error('Friends same mood error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
