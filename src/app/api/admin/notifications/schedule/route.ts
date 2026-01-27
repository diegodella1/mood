import { NextRequest } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { verifyAdminAuth, unauthorizedResponse } from '@/lib/admin/auth';
import { logAuditAction } from '@/lib/admin/audit';
import { ITEMS_PER_PAGE } from '@/lib/admin/constants';

export async function GET(request: NextRequest) {
  if (!verifyAdminAuth(request)) {
    return unauthorizedResponse();
  }

    const { searchParams } = new URL(request.url);

  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || String(ITEMS_PER_PAGE));
  const status = searchParams.get('status') || '';

  const offset = (page - 1) * limit;

  try {
    let query = supabaseAdmin
      .from('notification_schedules')
      .select('*', { count: 'exact' });

    if (status) {
      query = query.eq('status', status);
    }

    query = query.order('scheduled_for', { ascending: true })
      .range(offset, offset + limit - 1);

    const { data: schedules, count, error } = await query;

    if (error) {
      console.error('Schedules fetch error:', error);
      return Response.json({ error: 'Failed to fetch schedules' }, { status: 500 });
    }

    return Response.json({
      schedules: schedules || [],
      pagination: {
        page,
        pageSize: limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
      },
    });
  } catch (error) {
    console.error('Schedules error:', error);
    return Response.json({ error: 'Failed to fetch schedules' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  if (!verifyAdminAuth(request)) {
    return unauthorizedResponse();
  }

  
  try {
    const body = await request.json();
    const { title, body: message, scheduled_for, audience_type, audience_payload, template_id } = body;

    if (!title || !message || !scheduled_for) {
      return Response.json(
        { error: 'Title, body, and scheduled_for are required' },
        { status: 400 }
      );
    }

    const scheduledDate = new Date(scheduled_for);
    if (scheduledDate <= new Date()) {
      return Response.json(
        { error: 'Scheduled time must be in the future' },
        { status: 400 }
      );
    }

    const { data: schedule, error } = await supabaseAdmin
      .from('notification_schedules')
      .insert({
        title,
        body: message,
        scheduled_for,
        audience_type: audience_type || 'all',
        audience_payload: audience_payload || {},
        template_id: template_id || null,
        status: 'pending',
      })
      .select()
      .single();

    if (error) {
      console.error('Schedule create error:', error);
      return Response.json({ error: 'Failed to schedule notification' }, { status: 500 });
    }

    await logAuditAction({
      request,
      action: 'schedule_notification',
      resourceType: 'notification_schedule',
      resourceId: schedule.id,
      changes: { title, scheduled_for, audience_type },
    });

    return Response.json({ schedule }, { status: 201 });
  } catch (error) {
    console.error('Schedule create error:', error);
    return Response.json({ error: 'Failed to schedule notification' }, { status: 500 });
  }
}
