import { NextRequest } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { verifyAdminAuth, unauthorizedResponse } from '@/lib/admin/auth';
import { ITEMS_PER_PAGE } from '@/lib/admin/constants';

export async function GET(request: NextRequest) {
  if (!verifyAdminAuth(request)) {
    return unauthorizedResponse();
  }

    const { searchParams } = new URL(request.url);

  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || String(ITEMS_PER_PAGE));
  const action = searchParams.get('action') || '';
  const resourceType = searchParams.get('resource_type') || '';

  const offset = (page - 1) * limit;

  try {
    let query = supabaseAdmin
      .from('audit_logs')
      .select('*', { count: 'exact' });

    if (action) {
      query = query.eq('action', action);
    }

    if (resourceType) {
      query = query.eq('resource_type', resourceType);
    }

    query = query.order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    const { data: logs, count, error } = await query;

    if (error) {
      console.error('Audit logs fetch error:', error);
      return Response.json({ error: 'Failed to fetch audit logs' }, { status: 500 });
    }

    return Response.json({
      logs: logs || [],
      pagination: {
        page,
        pageSize: limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
      },
    });
  } catch (error) {
    console.error('Audit logs error:', error);
    return Response.json({ error: 'Failed to fetch audit logs' }, { status: 500 });
  }
}
