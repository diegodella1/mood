import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId');

  if (!userId) {
    return NextResponse.json({ error: 'userId required' }, { status: 400 });
  }

  try {
    const { data, error } = await supabaseAdmin.rpc('count_friends_pulsed_today', {
      p_user_id: userId,
    });

    if (error) {
      console.error('Friends pulsed today error:', error);
      return NextResponse.json({ error: 'Failed to fetch' }, { status: 500 });
    }

    return NextResponse.json({ count: data || 0 });
  } catch (error) {
    console.error('Friends pulsed today error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
