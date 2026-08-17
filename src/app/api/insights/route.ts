import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { requireUser } from '@/lib/session';

export async function GET(request: NextRequest) {
  const session = requireUser(request);
  if (!session.ok) return session.response;
  const userId = session.userId;

  try {
    const { data, error } = await supabaseAdmin.rpc('get_personal_insights', {
      p_user_id: userId,
    });

    if (error) {
      console.error('Insights RPC error:', error);
      return NextResponse.json({ error: 'Failed to fetch insights' }, { status: 500 });
    }

    return NextResponse.json({ insights: data });
  } catch (error) {
    console.error('Insights error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
