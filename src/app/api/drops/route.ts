import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { supabaseAdmin } from '@/lib/supabase/server';
import { requireUser } from '@/lib/session';

// Get unclaimed drops for a user
export async function GET(request: NextRequest) {
  const session = requireUser(request);
  if (!session.ok) return session.response;
  const userId = session.userId;

  try {
    const { data: drops, error } = await supabaseAdmin
      .from('lucky_drops')
      .select('*')
      .eq('user_id', userId)
      .eq('claimed', false)
      .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Drops error:', error);
      return NextResponse.json({ error: 'Failed to get drops' }, { status: 500 });
    }

    return NextResponse.json({
      drops: drops?.map((d) => ({
        id: d.id,
        type: d.drop_type,
        value: d.drop_value,
        createdAt: d.created_at,
        expiresAt: d.expires_at,
      })) || [],
    });
  } catch (error) {
    console.error('Drops error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

// Claim a drop
const claimSchema = z.object({
  userId: z.string().uuid().optional(),
  dropId: z.string().uuid(),
});

export async function POST(request: NextRequest) {
  try {
    const session = requireUser(request);
    if (!session.ok) return session.response;
    const userId = session.userId;

    const body = await request.json();
    const data = claimSchema.parse(body);

    const { data: result, error } = await supabaseAdmin.rpc('claim_lucky_drop', {
      p_user_id: userId,
      p_drop_id: data.dropId,
    });

    if (error) {
      console.error('Claim error:', error);
      return NextResponse.json({ error: 'Failed to claim' }, { status: 500 });
    }

    if (!result?.success) {
      return NextResponse.json(
        { error: result?.error || 'Failed to claim' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      type: result.type,
      value: result.value,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    }
    console.error('Claim error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
