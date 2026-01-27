import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { supabaseAdmin } from '@/lib/supabase/server';

const optinSchema = z.object({
  userId: z.string().uuid(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const data = optinSchema.parse(body);

    const { error } = await supabaseAdmin
      .from('users')
      .update({
        push_opt_in: true,
        updated_at: new Date().toISOString(),
      })
      .eq('id', data.userId);

    if (error) {
      console.error('Push opt-in error:', error);
      return NextResponse.json(
        { error: 'Failed to update push opt-in' },
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

    console.error('Push opt-in error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
