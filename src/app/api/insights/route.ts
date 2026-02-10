import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId');

  if (!userId) {
    return NextResponse.json({ error: 'userId required' }, { status: 400 });
  }

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
