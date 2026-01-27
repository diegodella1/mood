import { NextRequest } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { verifyAdminAuth, unauthorizedResponse } from '@/lib/admin/auth';
import { logAuditAction } from '@/lib/admin/audit';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!verifyAdminAuth(request)) {
    return unauthorizedResponse();
  }

  const { id } = await params;
  
  try {
    // First check if the schedule exists and is pending
    const { data: schedule, error: fetchError } = await supabaseAdmin
      .from('notification_schedules')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !schedule) {
      return Response.json({ error: 'Schedule not found' }, { status: 404 });
    }

    if (schedule.status !== 'pending') {
      return Response.json(
        { error: 'Only pending schedules can be cancelled' },
        { status: 400 }
      );
    }

    // Update status to cancelled
    const { error } = await supabaseAdmin
      .from('notification_schedules')
      .update({ status: 'cancelled' })
      .eq('id', id);

    if (error) {
      return Response.json({ error: 'Failed to cancel schedule' }, { status: 500 });
    }

    await logAuditAction({
      request,
      action: 'cancel_notification',
      resourceType: 'notification_schedule',
      resourceId: id,
    });

    return Response.json({ success: true });
  } catch (error) {
    console.error('Schedule cancel error:', error);
    return Response.json({ error: 'Failed to cancel schedule' }, { status: 500 });
  }
}
