import { NextRequest } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { verifyAdminAuth, unauthorizedResponse } from '@/lib/admin/auth';
import { logAuditAction } from '@/lib/admin/audit';
import type { CustomWindowStatus } from '@/lib/supabase/types';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!verifyAdminAuth(request)) {
    return unauthorizedResponse();
  }

  const { id } = await params;

  try {
    const body = await request.json();
    const { action } = body; // 'activate', 'deactivate', 'schedule', 'cancel'

    if (!action || !['activate', 'deactivate', 'schedule', 'cancel'].includes(action)) {
      return Response.json(
        { error: 'Invalid action. Use: activate, deactivate, schedule, or cancel' },
        { status: 400 }
      );
    }

    // Get current window
    const { data: window, error: fetchError } = await supabaseAdmin
      .from('custom_windows')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !window) {
      return Response.json({ error: 'Custom window not found' }, { status: 404 });
    }

    let newStatus: CustomWindowStatus;
    const currentStatus = window.status as CustomWindowStatus;

    switch (action) {
      case 'activate':
        // Can activate from draft or scheduled
        if (!['draft', 'scheduled'].includes(currentStatus)) {
          return Response.json(
            { error: `Cannot activate a window with status: ${currentStatus}` },
            { status: 400 }
          );
        }
        newStatus = 'active';
        break;

      case 'deactivate':
        // Can only deactivate active windows
        if (currentStatus !== 'active') {
          return Response.json(
            { error: 'Can only deactivate active windows' },
            { status: 400 }
          );
        }
        newStatus = 'completed';
        break;

      case 'schedule':
        // Can schedule from draft
        if (currentStatus !== 'draft') {
          return Response.json(
            { error: 'Can only schedule draft windows' },
            { status: 400 }
          );
        }
        newStatus = 'scheduled';
        break;

      case 'cancel':
        // Can cancel scheduled or active windows
        if (!['scheduled', 'active'].includes(currentStatus)) {
          return Response.json(
            { error: 'Can only cancel scheduled or active windows' },
            { status: 400 }
          );
        }
        newStatus = 'cancelled';
        break;

      default:
        return Response.json({ error: 'Invalid action' }, { status: 400 });
    }

    const { data: updatedWindow, error: updateError } = await supabaseAdmin
      .from('custom_windows')
      .update({ status: newStatus })
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      console.error('Custom window status update error:', updateError);
      return Response.json({ error: 'Failed to update window status' }, { status: 500 });
    }

    const auditActionMap: Record<string, 'custom_window_activate' | 'custom_window_deactivate' | 'custom_window_schedule' | 'custom_window_cancel'> = {
      activate: 'custom_window_activate',
      deactivate: 'custom_window_deactivate',
      schedule: 'custom_window_schedule',
      cancel: 'custom_window_cancel',
    };

    await logAuditAction({
      request,
      action: auditActionMap[action],
      resourceType: 'custom_window',
      resourceId: id,
      changes: {
        previous_status: currentStatus,
        new_status: newStatus,
        name: window.name,
      },
    });

    return Response.json({
      window: updatedWindow,
      message: `Window ${action}d successfully`,
    });
  } catch (error) {
    console.error('Custom window activate error:', error);
    return Response.json({ error: 'Failed to update window status' }, { status: 500 });
  }
}
