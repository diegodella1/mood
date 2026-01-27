import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const windowId = searchParams.get('windowId');

  if (!windowId) {
    return NextResponse.json(
      { error: 'windowId is required' },
      { status: 400 }
    );
  }

  try {
    // Fetch all city aggregates for this window
    const { data: cities, error } = await supabaseAdmin
      .from('aggregates_city_window')
      .select('city_id, mood_counts, total_count')
      .eq('window_id', windowId)
      .order('total_count', { ascending: false })
      .limit(100);

    if (error) {
      throw error;
    }

    // Transform to include dominant mood
    const citiesWithMood = (cities || []).map((city) => {
      const moodCounts = city.mood_counts as Record<string, number>;
      let dominantMood = '';
      let maxCount = 0;

      for (const [mood, count] of Object.entries(moodCounts)) {
        if (count > maxCount) {
          maxCount = count;
          dominantMood = mood;
        }
      }

      return {
        cityId: city.city_id,
        totalCount: city.total_count,
        dominantMood,
        moodCounts,
      };
    });

    return NextResponse.json({ cities: citiesWithMood });
  } catch (error) {
    console.error('Cities aggregate fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch city aggregates' },
      { status: 500 }
    );
  }
}
