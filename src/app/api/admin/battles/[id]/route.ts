import { NextRequest } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { verifyAdminAuth, unauthorizedResponse } from '@/lib/admin/auth';
import { logAuditAction } from '@/lib/admin/audit';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!verifyAdminAuth(request)) {
    return unauthorizedResponse();
  }

  const { id } = await params;

  try {
    const { data: battle, error } = await supabaseAdmin
      .from('city_battles')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !battle) {
      return Response.json({ error: 'Battle not found' }, { status: 404 });
    }

    // Get scores
    const { data: scores } = await supabaseAdmin
      .from('city_battle_scores')
      .select('*')
      .eq('battle_id', id)
      .order('computed_at', { ascending: false });

    // Calculate totals per city
    const cityTotals: Record<string, { pulses: number; score: number }> = {};
    (scores || []).forEach((s) => {
      if (!cityTotals[s.city_id]) {
        cityTotals[s.city_id] = { pulses: 0, score: 0 };
      }
      cityTotals[s.city_id].pulses += s.raw_pulses;
      cityTotals[s.city_id].score += Number(s.weighted_score);
    });

    return Response.json({
      battle,
      scores: scores || [],
      totals: cityTotals,
    });
  } catch (error) {
    console.error('Battle detail error:', error);
    return Response.json({ error: 'Failed to fetch battle' }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!verifyAdminAuth(request)) {
    return unauthorizedResponse();
  }

  const { id } = await params;

  try {
    const body = await request.json();

    const allowedFields = [
      'name',
      'city_a_id',
      'city_a_name',
      'city_b_id',
      'city_b_name',
      'start_at',
      'end_at',
      'scoring_mode',
      'status',
      'copy',
      'push_schedule',
      'assets',
      'winner_city_id',
    ];

    const updates: Record<string, unknown> = {};
    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updates[field] = body[field];
      }
    }

    if (Object.keys(updates).length === 0) {
      return Response.json({ error: 'No valid fields to update' }, { status: 400 });
    }

    const { data: battle, error } = await supabaseAdmin
      .from('city_battles')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return Response.json({ error: 'Failed to update battle' }, { status: 500 });
    }

    await logAuditAction({
      request,
      action: 'update',
      resourceType: 'battle' as never,
      resourceId: id,
      changes: updates,
    });

    return Response.json({ battle });
  } catch (error) {
    console.error('Battle update error:', error);
    return Response.json({ error: 'Failed to update battle' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!verifyAdminAuth(request)) {
    return unauthorizedResponse();
  }

  const { id } = await params;

  try {
    const { error } = await supabaseAdmin
      .from('city_battles')
      .delete()
      .eq('id', id);

    if (error) {
      return Response.json({ error: 'Failed to delete battle' }, { status: 500 });
    }

    await logAuditAction({
      request,
      action: 'delete',
      resourceType: 'battle' as never,
      resourceId: id,
    });

    return Response.json({ success: true });
  } catch (error) {
    console.error('Battle delete error:', error);
    return Response.json({ error: 'Failed to delete battle' }, { status: 500 });
  }
}
