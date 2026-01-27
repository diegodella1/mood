import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const windowId = searchParams.get('windowId');
  const cityId = searchParams.get('cityId');

  if (!windowId) {
    return NextResponse.json(
      { error: 'windowId is required' },
      { status: 400 }
    );
  }

  try {
    // Fetch global aggregate
    const { data: global } = await supabaseAdmin
      .from('aggregates_global_window')
      .select()
      .eq('window_id', windowId)
      .single();

    // Fetch city aggregate if cityId provided
    let city = null;
    if (cityId) {
      const { data: cityData } = await supabaseAdmin
        .from('aggregates_city_window')
        .select()
        .eq('window_id', windowId)
        .eq('city_id', cityId)
        .single();

      city = cityData;
    }

    return NextResponse.json({
      global,
      city,
    });
  } catch (error) {
    console.error('Aggregate fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch aggregates' },
      { status: 500 }
    );
  }
}
