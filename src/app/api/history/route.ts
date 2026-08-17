import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { requireUser } from '@/lib/session';

export async function GET(request: NextRequest) {
  const session = requireUser(request);
  if (!session.ok) return session.response;
  const userId = session.userId;

  const { searchParams } = new URL(request.url);
  const year = parseInt(searchParams.get('year') || String(new Date().getFullYear()));
  const month = parseInt(searchParams.get('month') || String(new Date().getMonth() + 1));

  try {
    const [historyResult, insightsResult] = await Promise.all([
      supabaseAdmin.rpc('get_pulse_history', {
        p_user_id: userId,
        p_year: year,
        p_month: month,
      }),
      supabaseAdmin.rpc('get_personal_insights', {
        p_user_id: userId,
      }),
    ]);

    if (historyResult.error) {
      console.error('History RPC error:', historyResult.error);
      return NextResponse.json({ error: 'Failed to fetch history' }, { status: 500 });
    }

    // Group pulses by date
    const pulses: Record<string, Array<{
      id: string;
      mood: string;
      note: string | null;
      window_id: string;
      created_at: string;
    }>> = {};

    for (const row of historyResult.data || []) {
      const date = row.pulse_date;
      if (!pulses[date]) pulses[date] = [];
      pulses[date].push({
        id: row.pulse_id,
        mood: row.mood,
        note: row.note,
        window_id: row.window_id,
        created_at: row.created_at,
      });
    }

    return NextResponse.json({
      pulses,
      stats: insightsResult.data || null,
    });
  } catch (error) {
    console.error('History error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
