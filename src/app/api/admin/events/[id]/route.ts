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
    const { data: event, error } = await supabaseAdmin
      .from('events')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !event) {
      return Response.json({ error: 'Event not found' }, { status: 404 });
    }

    // Get participants
    const { data: participants } = await supabaseAdmin
      .from('event_participations')
      .select('user_id, joined_at, completion_data, users(country_code, timezone)')
      .eq('event_id', id)
      .order('joined_at', { ascending: false })
      .limit(100);

    return Response.json({
      event,
      participants: participants || [],
    });
  } catch (error) {
    console.error('Event detail error:', error);
    return Response.json({ error: 'Failed to fetch event' }, { status: 500 });
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

    const allowedFields = ['title', 'description', 'start_at', 'end_at', 'banner_url', 'event_type', 'status'];
    const updates: Record<string, unknown> = {};

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updates[field] = body[field];
      }
    }

    if (Object.keys(updates).length === 0) {
      return Response.json({ error: 'No valid fields to update' }, { status: 400 });
    }

    const { data: event, error } = await supabaseAdmin
      .from('events')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return Response.json({ error: 'Failed to update event' }, { status: 500 });
    }

    await logAuditAction({
      request,
      action: 'update',
      resourceType: 'event',
      resourceId: id,
      changes: updates,
    });

    return Response.json({ event });
  } catch (error) {
    console.error('Event update error:', error);
    return Response.json({ error: 'Failed to update event' }, { status: 500 });
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
      .from('events')
      .delete()
      .eq('id', id);

    if (error) {
      return Response.json({ error: 'Failed to delete event' }, { status: 500 });
    }

    await logAuditAction({
      request,
      action: 'delete',
      resourceType: 'event',
      resourceId: id,
    });

    return Response.json({ success: true });
  } catch (error) {
    console.error('Event delete error:', error);
    return Response.json({ error: 'Failed to delete event' }, { status: 500 });
  }
}
