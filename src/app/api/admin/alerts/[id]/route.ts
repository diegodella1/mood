import { NextRequest } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { verifyAdminAuth, unauthorizedResponse } from '@/lib/admin/auth';
import { logAuditAction } from '@/lib/admin/audit';

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
      'title',
      'message',
      'alert_type',
      'severity',
      'dismissible',
      'active_from',
      'active_until',
      'target_audience',
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

    const { data: alert, error } = await supabaseAdmin
      .from('alerts')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return Response.json({ error: 'Failed to update alert' }, { status: 500 });
    }

    await logAuditAction({
      request,
      action: 'update',
      resourceType: 'alert',
      resourceId: id,
      changes: updates,
    });

    return Response.json({ alert });
  } catch (error) {
    console.error('Alert update error:', error);
    return Response.json({ error: 'Failed to update alert' }, { status: 500 });
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
      .from('alerts')
      .delete()
      .eq('id', id);

    if (error) {
      return Response.json({ error: 'Failed to delete alert' }, { status: 500 });
    }

    await logAuditAction({
      request,
      action: 'delete',
      resourceType: 'alert',
      resourceId: id,
    });

    return Response.json({ success: true });
  } catch (error) {
    console.error('Alert delete error:', error);
    return Response.json({ error: 'Failed to delete alert' }, { status: 500 });
  }
}
