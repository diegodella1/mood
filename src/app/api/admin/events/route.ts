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
  const eventType = searchParams.get('event_type') || '';

  const offset = (page - 1) * limit;

  try {
    let query = supabaseAdmin
      .from('events')
      .select('*', { count: 'exact' });

    if (status) {
      query = query.eq('status', status);
    }

    if (eventType) {
      query = query.eq('event_type', eventType);
    }

    query = query.order('start_at', { ascending: false })
      .range(offset, offset + limit - 1);

    const { data: events, count, error } = await query;

    if (error) {
      console.error('Events fetch error:', error);
      return Response.json({ error: `Failed to fetch events: ${error.message}` }, { status: 500 });
    }

    // Get participant counts for each event
    const eventIds = (events || []).map(e => e.id);
    const { data: participantCounts } = await supabaseAdmin
      .from('event_participations')
      .select('event_id')
      .in('event_id', eventIds);

    const participantCountMap: Record<string, number> = {};
    (participantCounts || []).forEach(p => {
      participantCountMap[p.event_id] = (participantCountMap[p.event_id] || 0) + 1;
    });

    const eventsWithCounts = (events || []).map(event => ({
      ...event,
      participant_count: participantCountMap[event.id] || 0,
    }));

    return Response.json({
      events: eventsWithCounts,
      pagination: {
        page,
        pageSize: limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
      },
    });
  } catch (error) {
    console.error('Events error:', error);
    return Response.json({ error: 'Failed to fetch events' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  if (!verifyAdminAuth(request)) {
    return unauthorizedResponse();
  }

  
  try {
    const body = await request.json();

    const { title, description, start_at, end_at, banner_url, event_type, status } = body;

    if (!title || !start_at || !end_at) {
      return Response.json(
        { error: 'Title, start_at, and end_at are required' },
        { status: 400 }
      );
    }

    const { data: event, error } = await supabaseAdmin
      .from('events')
      .insert({
        title,
        description: description || null,
        start_at,
        end_at,
        banner_url: banner_url || null,
        event_type: event_type || 'general',
        status: status || 'draft',
      })
      .select()
      .single();

    if (error) {
      console.error('Event create error:', error);
      return Response.json({ error: `Failed to create event: ${error.message}` }, { status: 500 });
    }

    await logAuditAction({
      request,
      action: 'create',
      resourceType: 'event',
      resourceId: event.id,
      changes: { title, event_type, status },
    });

    return Response.json({ event }, { status: 201 });
  } catch (error) {
    console.error('Event create error:', error);
    return Response.json({ error: 'Failed to create event' }, { status: 500 });
  }
}
