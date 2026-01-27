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
      .from('city_battles')
      .select('*', { count: 'exact' });

    if (status) {
      query = query.eq('status', status);
    }

    query = query.order('start_at', { ascending: false })
      .range(offset, offset + limit - 1);

    const { data: battles, count, error } = await query;

    if (error) {
      return Response.json({ error: 'Failed to fetch battles' }, { status: 500 });
    }

    return Response.json({
      battles: battles || [],
      pagination: {
        page,
        pageSize: limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
      },
    });
  } catch (error) {
    console.error('Battles fetch error:', error);
    return Response.json({ error: 'Failed to fetch battles' }, { status: 500 });
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
      city_a_id,
      city_a_name,
      city_b_id,
      city_b_name,
      start_at,
      end_at,
      scoring_mode,
      copy,
      push_schedule,
      assets,
    } = body;

    if (!name || !city_a_id || !city_a_name || !city_b_id || !city_b_name || !start_at || !end_at) {
      return Response.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const { data: battle, error } = await supabaseAdmin
      .from('city_battles')
      .insert({
        name,
        city_a_id,
        city_a_name,
        city_b_id,
        city_b_name,
        start_at,
        end_at,
        scoring_mode: scoring_mode || 'per_capita_bucket',
        copy: copy || undefined,
        push_schedule: push_schedule || undefined,
        assets: assets || undefined,
        status: 'scheduled',
      })
      .select()
      .single();

    if (error) {
      console.error('Battle create error:', error);
      return Response.json({ error: 'Failed to create battle' }, { status: 500 });
    }

    await logAuditAction({
      request,
      action: 'create',
      resourceType: 'battle' as never,
      resourceId: battle.id,
      changes: { name, city_a_name, city_b_name },
    });

    return Response.json({ battle }, { status: 201 });
  } catch (error) {
    console.error('Battle create error:', error);
    return Response.json({ error: 'Failed to create battle' }, { status: 500 });
  }
}
