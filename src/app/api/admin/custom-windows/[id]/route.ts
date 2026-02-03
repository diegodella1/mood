import { NextRequest } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { verifyAdminAuth, unauthorizedResponse } from '@/lib/admin/auth';
import { logAuditAction } from '@/lib/admin/audit';
import type { CustomWindowStatus } from '@/lib/supabase/types';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!verifyAdminAuth(request)) {
    return unauthorizedResponse();
  }

  const { id } = await params;

  try {
    const { data: window, error } = await supabaseAdmin
      .from('custom_windows')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !window) {
      return Response.json({ error: 'Custom window not found' }, { status: 404 });
    }

    // Get participation stats
    const { data: participations, count: participantCount } = await supabaseAdmin
      .from('custom_window_participations')
      .select('id, user_id, window_instance_id, xp_earned, created_at, users(timezone, country_code)', { count: 'exact' })
      .eq('custom_window_id', id)
      .order('created_at', { ascending: false })
      .limit(100);

    // Get total XP awarded
    const { data: xpData } = await supabaseAdmin
      .from('custom_window_participations')
      .select('xp_earned')
      .eq('custom_window_id', id);

    const totalXpAwarded = (xpData || []).reduce((sum, p) => sum + (p.xp_earned || 0), 0);

    // Get unique instance IDs for recurring events
    const uniqueInstances = [...new Set((participations || []).map(p => p.window_instance_id))];

    return Response.json({
      window,
      stats: {
        participant_count: participantCount || 0,
        total_xp_awarded: totalXpAwarded,
        instance_count: uniqueInstances.length,
      },
      recent_participations: participations || [],
    });
  } catch (error) {
    console.error('Custom window detail error:', error);
    return Response.json({ error: 'Failed to fetch custom window' }, { status: 500 });
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
      'description',
      'icon',
      'color',
      'banner_url',
      'start_hour',
      'end_hour',
      'event_type',
      'event_date',
      'recurrence_rule',
      'recurrence_start',
      'recurrence_end',
      'xp_multiplier',
      'bonus_badge_id',
      'lucky_drop_boost',
      'notify_on_open',
      'notify_before_close',
      'notify_minutes_before',
      'custom_notification_title',
      'custom_notification_body',
      'target_timezones',
      'target_countries',
      'min_streak_days',
      'status',
      'priority',
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

    // Validate hours if provided
    if (updates.start_hour !== undefined) {
      const hour = updates.start_hour as number;
      if (hour < 0 || hour > 23) {
        return Response.json({ error: 'Start hour must be between 0 and 23' }, { status: 400 });
      }
    }

    if (updates.end_hour !== undefined) {
      const hour = updates.end_hour as number;
      if (hour < 0 || hour > 23) {
        return Response.json({ error: 'End hour must be between 0 and 23' }, { status: 400 });
      }
    }

    const { data: window, error } = await supabaseAdmin
      .from('custom_windows')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Custom window update error:', error);
      return Response.json({ error: 'Failed to update custom window' }, { status: 500 });
    }

    await logAuditAction({
      request,
      action: 'update',
      resourceType: 'custom_window',
      resourceId: id,
      changes: updates,
    });

    return Response.json({ window });
  } catch (error) {
    console.error('Custom window update error:', error);
    return Response.json({ error: 'Failed to update custom window' }, { status: 500 });
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
    // Check if window exists
    const { data: existing } = await supabaseAdmin
      .from('custom_windows')
      .select('id, name, status')
      .eq('id', id)
      .single();

    if (!existing) {
      return Response.json({ error: 'Custom window not found' }, { status: 404 });
    }

    // Don't allow deleting active windows
    if (existing.status === 'active') {
      return Response.json(
        { error: 'Cannot delete an active window. Cancel it first.' },
        { status: 400 }
      );
    }

    const { error } = await supabaseAdmin
      .from('custom_windows')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Custom window delete error:', error);
      return Response.json({ error: 'Failed to delete custom window' }, { status: 500 });
    }

    await logAuditAction({
      request,
      action: 'delete',
      resourceType: 'custom_window',
      resourceId: id,
      changes: { name: existing.name },
    });

    return Response.json({ success: true });
  } catch (error) {
    console.error('Custom window delete error:', error);
    return Response.json({ error: 'Failed to delete custom window' }, { status: 500 });
  }
}
