import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { isValidUUID } from '@/lib/api-utils';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get('q');
  const userId = request.nextUrl.searchParams.get('userId');

  if (!query || query.length < 2) {
    return NextResponse.json({ users: [] });
  }

  try {
    // Search by display_name (case insensitive, partial match)
    const { data: users, error } = await supabaseAdmin
      .from('users')
      .select('id, display_name, aura, streak_days')
      .not('display_name', 'is', null)
      .ilike('display_name', `%${query}%`)
      .limit(20);

    if (error) {
      console.error('Search error:', error);
      return NextResponse.json({ error: 'Search failed' }, { status: 500 });
    }

    // Filter out the searching user
    let results = users || [];
    if (userId && isValidUUID(userId)) {
      results = results.filter((u) => u.id !== userId);
    }

    return NextResponse.json({ users: results });
  } catch (error) {
    console.error('Search error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
