import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { getCurrentDateInTimezone } from '@/lib/timezone';
import { requireUser } from '@/lib/session';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = requireUser(request);
  if (!session.ok) return session.response;

  const { id: userId } = await params;

  if (session.userId !== userId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    // Get user's timezone
    const { data: user, error: userError } = await supabaseAdmin
      .from('users')
      .select('timezone')
      .eq('id', userId)
      .single();

    if (userError || !user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const today = getCurrentDateInTimezone(user.timezone);

    // Count pulses for today
    const { data: pulses, error: pulsesError } = await supabaseAdmin
      .from('pulses')
      .select('window_id')
      .eq('user_id', userId)
      .like('window_id', `${today}|%`);

    if (pulsesError) {
      console.error('Error fetching today pulses:', pulsesError);
      return NextResponse.json({ windowsCompleted: 0 });
    }

    // Count unique windows completed today
    const uniqueWindows = new Set(pulses?.map((p) => p.window_id) || []);

    return NextResponse.json({
      windowsCompleted: uniqueWindows.size,
      date: today,
    });
  } catch (error) {
    console.error('Today progress error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
