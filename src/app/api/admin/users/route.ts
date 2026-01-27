import { NextRequest } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { verifyAdminAuth, unauthorizedResponse } from '@/lib/admin/auth';
import { ITEMS_PER_PAGE, MAX_ITEMS_PER_PAGE } from '@/lib/admin/constants';
import { isValidUUID } from '@/lib/api-utils';

export async function GET(request: NextRequest) {
  if (!verifyAdminAuth(request)) {
    return unauthorizedResponse();
  }

  const { searchParams } = new URL(request.url);

  // Parse and validate pagination params with bounds checking
  let page = parseInt(searchParams.get('page') || '1', 10);
  let limit = parseInt(searchParams.get('limit') || String(ITEMS_PER_PAGE), 10);
  const search = searchParams.get('search') || '';
  const country = searchParams.get('country') || '';
  const pushOptIn = searchParams.get('push_opt_in');
  const sortBy = searchParams.get('sort_by') || 'created_at';
  const sortOrder = (searchParams.get('sort_order') || 'desc') as 'asc' | 'desc';

  // Sanitize pagination values
  if (isNaN(page) || page < 1) page = 1;
  if (isNaN(limit) || limit < 1) limit = ITEMS_PER_PAGE;
  limit = Math.min(limit, MAX_ITEMS_PER_PAGE || 100); // Enforce max limit
  page = Math.min(page, 10000); // Enforce max page to prevent huge offsets

  const offset = (page - 1) * limit;

  try {
    let query = supabaseAdmin
      .from('users')
      .select('*', { count: 'exact' });

    // Filters
    if (search) {
      // If search looks like a UUID, search by exact match
      if (isValidUUID(search)) {
        query = query.eq('id', search);
      } else {
        // Otherwise search by email (partial match)
        query = query.ilike('email', `%${search}%`);
      }
    }

    if (country) {
      query = query.eq('country_code', country);
    }

    if (pushOptIn !== null && pushOptIn !== '') {
      query = query.eq('push_opt_in', pushOptIn === 'true');
    }

    // Sorting
    query = query.order(sortBy, { ascending: sortOrder === 'asc' });

    // Pagination
    query = query.range(offset, offset + limit - 1);

    const { data: users, count, error } = await query;

    if (error) {
      console.error('Users fetch error:', error);
      return Response.json({ error: 'Failed to fetch users' }, { status: 500 });
    }

    // Get pulse counts for each user
    const userIds = (users || []).map(u => u.id);
    const { data: pulseCounts } = await supabaseAdmin
      .from('pulses')
      .select('user_id')
      .in('user_id', userIds);

    const pulseCountMap: Record<string, number> = {};
    (pulseCounts || []).forEach(p => {
      pulseCountMap[p.user_id] = (pulseCountMap[p.user_id] || 0) + 1;
    });

    const usersWithCounts = (users || []).map(user => ({
      ...user,
      pulse_count: pulseCountMap[user.id] || 0,
    }));

    return Response.json({
      users: usersWithCounts,
      pagination: {
        page,
        pageSize: limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
      },
    });
  } catch (error) {
    console.error('Users error:', error);
    return Response.json({ error: 'Failed to fetch users' }, { status: 500 });
  }
}
