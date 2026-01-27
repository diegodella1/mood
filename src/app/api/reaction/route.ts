import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { supabaseAdmin } from '@/lib/supabase/server';
import { REACTIONS } from '@/lib/constants';
import { checkRateLimit, rateLimitResponse } from '@/lib/api-utils';

const reactionSchema = z.object({
  pulseId: z.string().uuid(),
  fromUserId: z.string().uuid(),
  emoji: z.enum(REACTIONS),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const data = reactionSchema.parse(body);

    // Rate limit check
    const rateLimit = await checkRateLimit(data.fromUserId, 'reaction');
    if (!rateLimit.allowed) {
      return rateLimitResponse(rateLimit.retryAfter);
    }

    // Check if pulse exists
    const { data: pulse, error: pulseError } = await supabaseAdmin
      .from('pulses')
      .select('id, user_id, reaction_count')
      .eq('id', data.pulseId)
      .single();

    if (pulseError || !pulse) {
      return NextResponse.json(
        { error: 'Pulse not found' },
        { status: 404 }
      );
    }

    // Can't react to your own pulse
    if (pulse.user_id === data.fromUserId) {
      return NextResponse.json(
        { error: 'Cannot react to your own pulse' },
        { status: 400 }
      );
    }

    // Insert reaction (unique constraint will catch duplicates)
    const { data: reaction, error: reactionError } = await supabaseAdmin
      .from('reactions')
      .insert({
        pulse_id: data.pulseId,
        from_user_id: data.fromUserId,
        emoji: data.emoji,
      })
      .select()
      .single();

    if (reactionError) {
      if (reactionError.code === '23505') {
        return NextResponse.json(
          { error: 'Already reacted to this pulse' },
          { status: 409 }
        );
      }

      console.error('Reaction insert error:', reactionError);
      return NextResponse.json(
        { error: 'Failed to add reaction' },
        { status: 500 }
      );
    }

    // Update pulse reaction count
    await supabaseAdmin
      .from('pulses')
      .update({ reaction_count: pulse.reaction_count + 1 })
      .eq('id', data.pulseId);

    return NextResponse.json(reaction);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.issues },
        { status: 400 }
      );
    }

    console.error('Reaction error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
