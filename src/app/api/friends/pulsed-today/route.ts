import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { requireUser } from '@/lib/session';

export async function GET(request: NextRequest) {
  const session = requireUser(request);
  if (!session.ok) return session.response;
  const userId = session.userId;

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
