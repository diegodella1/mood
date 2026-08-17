import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { supabaseAdmin } from '@/lib/supabase/server';
import { requireUser } from '@/lib/session';

export const dynamic = 'force-dynamic';
export const revalidate = 5; // Cache for 5 seconds

// Get live pulse count
export async function GET() {
  try {
    const { data: stats, error } = await supabaseAdmin.rpc('get_live_pulse_count');

    if (error) {
      console.error('Live count error:', error);
      return NextResponse.json({ error: 'Failed to get count' }, { status: 500 });
    }

    return NextResponse.json({
      activeNow: stats?.active_now || 0,
      pulsingNow: stats?.pulsing_now || 0,
      pulsesLastHour: stats?.pulses_last_hour || 0,
      timestamp: stats?.timestamp || new Date().toISOString(),
    });
  } catch (error) {
    console.error('Live count error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

// Update user's active session (heartbeat)
const heartbeatSchema = z.object({
  userId: z.string().uuid().optional(),
  window: z.string().optional(),
  isPulsing: z.boolean().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const session = requireUser(request);
    if (!session.ok) return session.response;
    const userId = session.userId;

    const body = await request.json();
    const data = heartbeatSchema.parse(body);

    await supabaseAdmin.rpc('update_active_session', {
      p_user_id: userId,
      p_window: data.window || null,
      p_is_pulsing: data.isPulsing || false,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    }
    // Silent fail for heartbeat - don't break the app
    return NextResponse.json({ success: false });
  }
}
