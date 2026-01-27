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
  const activeOnly = searchParams.get('active') === 'true';

  const offset = (page - 1) * limit;
  const now = new Date().toISOString();

  try {
    let query = supabaseAdmin
      .from('alerts')
      .select('*', { count: 'exact' });

    if (activeOnly) {
      query = query
        .lte('active_from', now)
        .or(`active_until.is.null,active_until.gte.${now}`);
    }

    query = query.order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    const { data: alerts, count, error } = await query;

    if (error) {
      console.error('Alerts fetch error:', error);
      return Response.json({ error: 'Failed to fetch alerts' }, { status: 500 });
    }

    // Get dismiss counts for each alert
    const alertIds = (alerts || []).map(a => a.id);
    const { data: dismissCounts } = await supabaseAdmin
      .from('user_alerts')
      .select('alert_id')
      .in('alert_id', alertIds)
      .not('dismissed_at', 'is', null);

    const dismissCountMap: Record<string, number> = {};
    (dismissCounts || []).forEach(d => {
      dismissCountMap[d.alert_id] = (dismissCountMap[d.alert_id] || 0) + 1;
    });

    const alertsWithCounts = (alerts || []).map(alert => ({
      ...alert,
      dismiss_count: dismissCountMap[alert.id] || 0,
    }));

    return Response.json({
      alerts: alertsWithCounts,
      pagination: {
        page,
        pageSize: limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
      },
    });
  } catch (error) {
    console.error('Alerts error:', error);
    return Response.json({ error: 'Failed to fetch alerts' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  if (!verifyAdminAuth(request)) {
    return unauthorizedResponse();
  }

  
  try {
    const body = await request.json();
    const {
      title,
      message,
      alert_type,
      severity,
      dismissible,
      active_from,
      active_until,
      target_audience,
    } = body;

    if (!title || !message) {
      return Response.json(
        { error: 'Title and message are required' },
        { status: 400 }
      );
    }

    const { data: alert, error } = await supabaseAdmin
      .from('alerts')
      .insert({
        title,
        message,
        alert_type: alert_type || 'info',
        severity: severity || 'low',
        dismissible: dismissible !== false,
        active_from: active_from || new Date().toISOString(),
        active_until: active_until || null,
        target_audience: target_audience || 'all',
      })
      .select()
      .single();

    if (error) {
      console.error('Alert create error:', error);
      return Response.json({ error: 'Failed to create alert' }, { status: 500 });
    }

    await logAuditAction({
      request,
      action: 'create',
      resourceType: 'alert',
      resourceId: alert.id,
      changes: { title, alert_type, severity },
    });

    return Response.json({ alert }, { status: 201 });
  } catch (error) {
    console.error('Alert create error:', error);
    return Response.json({ error: 'Failed to create alert' }, { status: 500 });
  }
}
