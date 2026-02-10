import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { supabaseAdmin } from '@/lib/supabase/server';

const noteSchema = z.object({
  userId: z.string().uuid(),
  pulseId: z.string().uuid(),
  note: z.string().max(280),
});

/**
 * PATCH /api/pulse/note — Save or update a note on an existing pulse
 */
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const data = noteSchema.parse(body);

    // Verify pulse belongs to user
    const { data: pulse, error: fetchErr } = await supabaseAdmin
      .from('pulses')
      .select('id')
      .eq('id', data.pulseId)
      .eq('user_id', data.userId)
      .single();

    if (fetchErr || !pulse) {
      return NextResponse.json(
        { error: 'Pulse not found' },
        { status: 404 }
      );
    }

    const { error: updateErr } = await supabaseAdmin
      .from('pulses')
      .update({ note: data.note })
      .eq('id', data.pulseId);

    if (updateErr) {
      console.error('Note update error:', updateErr);
      return NextResponse.json(
        { error: 'Failed to save note' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.issues },
        { status: 400 }
      );
    }

    console.error('Note error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
