import { NextRequest } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { verifyAdminAuth, unauthorizedResponse } from '@/lib/admin/auth';
import { logAuditAction } from '@/lib/admin/audit';
import { ITEMS_PER_PAGE } from '@/lib/admin/constants';
import type { CustomWindowStatus, CustomWindowEventType, RecurrenceRule } from '@/lib/supabase/types';

export async function GET(request: NextRequest) {
  if (!verifyAdminAuth(request)) {
    return unauthorizedResponse();
  }

  const { searchParams } = new URL(request.url);

  const page = parseInt(searchParams.get('page') || '1');
  const limit = Math.min(
    parseInt(searchParams.get('limit') || String(ITEMS_PER_PAGE)),
    100
  );
  const status = searchParams.get('status') || '';
  const eventType = searchParams.get('event_type') || '';

  const offset = (page - 1) * limit;

  try {
    let query = supabaseAdmin
      .from('custom_windows')
      .select('*', { count: 'exact' });

    if (status) {
      query = query.eq('status', status);
    }

    if (eventType) {
      query = query.eq('event_type', eventType);
    }

    query = query
      .order('priority', { ascending: false })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    const { data: windows, count, error } = await query;

    if (error) {
      console.error('Custom windows fetch error:', error);
      return Response.json({ error: `Failed to fetch custom windows: ${error.message}` }, { status: 500 });
    }

    // Get participant counts for each window
    const windowIds = (windows || []).map(w => w.id);
    const { data: participantCounts } = await supabaseAdmin
      .from('custom_window_participations')
      .select('custom_window_id')
      .in('custom_window_id', windowIds);

    const participantCountMap: Record<string, number> = {};
    (participantCounts || []).forEach(p => {
      participantCountMap[p.custom_window_id] = (participantCountMap[p.custom_window_id] || 0) + 1;
    });

    const windowsWithCounts = (windows || []).map(window => ({
      ...window,
      participant_count: participantCountMap[window.id] || 0,
    }));

    return Response.json({
      windows: windowsWithCounts,
      pagination: {
        page,
        pageSize: limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
      },
    });
  } catch (error) {
    console.error('Custom windows error:', error);
    return Response.json({ error: 'Failed to fetch custom windows' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  if (!verifyAdminAuth(request)) {
    return unauthorizedResponse();
  }

  try {
    const body = await request.json();

    const {
      name,
      description,
      icon,
      color,
      banner_url,
      start_hour,
      end_hour,
      event_type,
      event_date,
      recurrence_rule,
      recurrence_start,
      recurrence_end,
      xp_multiplier,
      bonus_badge_id,
      lucky_drop_boost,
      notify_on_open,
      notify_before_close,
      notify_minutes_before,
      custom_notification_title,
      custom_notification_body,
      target_timezones,
      target_countries,
      min_streak_days,
      status,
      priority,
    } = body;

    // Validation
    if (!name || start_hour === undefined || end_hour === undefined) {
      return Response.json(
        { error: 'Name, start_hour, and end_hour are required' },
        { status: 400 }
      );
    }

    if (start_hour < 0 || start_hour > 23 || end_hour < 0 || end_hour > 23) {
      return Response.json(
        { error: 'Hours must be between 0 and 23' },
        { status: 400 }
      );
    }

    const eventTypeValue: CustomWindowEventType = event_type || 'one_time';

    // Validate one_time requires event_date
    if (eventTypeValue === 'one_time' && !event_date) {
      return Response.json(
        { error: 'Event date is required for one-time events' },
        { status: 400 }
      );
    }

    // Validate recurring requires recurrence_rule and recurrence_start
    if (eventTypeValue === 'recurring') {
      if (!recurrence_rule || !recurrence_start) {
        return Response.json(
          { error: 'Recurrence rule and start date are required for recurring events' },
          { status: 400 }
        );
      }

      // Validate recurrence_rule structure
      const rule = recurrence_rule as RecurrenceRule;
      if (!['daily', 'weekly', 'monthly'].includes(rule.frequency)) {
        return Response.json(
          { error: 'Invalid recurrence frequency' },
          { status: 400 }
        );
      }

      if (rule.frequency === 'weekly' && (!rule.daysOfWeek || rule.daysOfWeek.length === 0)) {
        return Response.json(
          { error: 'Days of week are required for weekly recurrence' },
          { status: 400 }
        );
      }

      if (rule.frequency === 'monthly' && (rule.dayOfMonth === undefined || rule.dayOfMonth < 1 || rule.dayOfMonth > 31)) {
        return Response.json(
          { error: 'Day of month (1-31) is required for monthly recurrence' },
          { status: 400 }
        );
      }
    }

    const insertData = {
      name,
      description: description || null,
      icon: icon || '🎉',
      color: color || '#8B5CF6',
      banner_url: banner_url || null,
      start_hour,
      end_hour,
      event_type: eventTypeValue,
      event_date: eventTypeValue === 'one_time' ? event_date : null,
      recurrence_rule: eventTypeValue === 'recurring' ? recurrence_rule : null,
      recurrence_start: eventTypeValue === 'recurring' ? recurrence_start : null,
      recurrence_end: recurrence_end || null,
      xp_multiplier: xp_multiplier ?? 1.0,
      bonus_badge_id: bonus_badge_id || null,
      lucky_drop_boost: lucky_drop_boost ?? 1.0,
      notify_on_open: notify_on_open ?? true,
      notify_before_close: notify_before_close ?? true,
      notify_minutes_before: notify_minutes_before ?? 30,
      custom_notification_title: custom_notification_title || null,
      custom_notification_body: custom_notification_body || null,
      target_timezones: target_timezones || null,
      target_countries: target_countries || null,
      min_streak_days: min_streak_days ?? 0,
      status: (status as CustomWindowStatus) || 'draft',
      priority: priority ?? 100,
    };

    const { data: window, error } = await supabaseAdmin
      .from('custom_windows')
      .insert(insertData)
      .select()
      .single();

    if (error) {
      console.error('Custom window create error:', error);
      return Response.json({ error: `Failed to create custom window: ${error.message}` }, { status: 500 });
    }

    await logAuditAction({
      request,
      action: 'create',
      resourceType: 'custom_window',
      resourceId: window.id,
      changes: { name, event_type: eventTypeValue, status: insertData.status },
    });

    return Response.json({ window }, { status: 201 });
  } catch (error) {
    console.error('Custom window create error:', error);
    return Response.json({ error: 'Failed to create custom window' }, { status: 500 });
  }
}
