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
    // Get user details
    const { data: user, error: userError } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('id', id)
      .single();

    if (userError || !user) {
      return Response.json({ error: 'User not found' }, { status: 404 });
    }

    // Get user's pulses
    const { data: pulses } = await supabaseAdmin
      .from('pulses')
      .select('*')
      .eq('user_id', id)
      .order('created_at', { ascending: false })
      .limit(50);

    // Get user's badges
    const { data: badges } = await supabaseAdmin
      .from('user_badges')
      .select('*, badges(*)')
      .eq('user_id', id);

    // Get user's event participations
    const { data: events } = await supabaseAdmin
      .from('event_participations')
      .select('*, events(*)')
      .eq('user_id', id);

    return Response.json({
      user,
      pulses: pulses || [],
      badges: badges || [],
      events: events || [],
    });
  } catch (error) {
    console.error('User detail error:', error);
    return Response.json({ error: 'Failed to fetch user' }, { status: 500 });
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

    // Only allow updating certain fields
    const allowedFields = ['country_code', 'city_id', 'push_opt_in', 'streak_days'];
    const updates: Record<string, unknown> = {};

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updates[field] = body[field];
      }
    }

    if (Object.keys(updates).length === 0) {
      return Response.json({ error: 'No valid fields to update' }, { status: 400 });
    }

    const { data: user, error } = await supabaseAdmin
      .from('users')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return Response.json({ error: 'Failed to update user' }, { status: 500 });
    }

    await logAuditAction({
      request,
      action: 'update',
      resourceType: 'user',
      resourceId: id,
      changes: updates,
    });

    return Response.json({ user });
  } catch (error) {
    console.error('User update error:', error);
    return Response.json({ error: 'Failed to update user' }, { status: 500 });
  }
}
