import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  const windowId = request.nextUrl.searchParams.get('windowId');

  if (!windowId) {
    return NextResponse.json({ error: 'Window ID required' }, { status: 400 });
  }

  try {
    // Fetch global aggregates for this window
    const { data: aggregate } = await supabaseAdmin
      .from('aggregates_global_window')
      .select('mood_counts, total_count')
      .eq('window_id', windowId)
      .single();

    // Get recent pulses for social proof (last 10)
    const { data: recentPulses } = await supabaseAdmin
      .from('pulses')
      .select('mood, city_id, created_at')
      .eq('window_id', windowId)
      .order('created_at', { ascending: false })
      .limit(10);

    // Calculate top mood
    let topMood = '';
    let topMoodCount = 0;

    if (aggregate?.mood_counts) {
      const moodCounts = aggregate.mood_counts as Record<string, number>;
      for (const [mood, count] of Object.entries(moodCounts)) {
        if (count > topMoodCount) {
          topMood = mood;
          topMoodCount = count;
        }
      }
    }

    // Format recent pulses
    const formattedPulses = (recentPulses || []).map((pulse) => ({
      mood: pulse.mood,
      city: pulse.city_id, // Could be enriched with city name lookup
      timestamp: new Date(pulse.created_at).getTime(),
    }));

    return NextResponse.json({
      totalPulses: aggregate?.total_count || 0,
      topMood,
      topMoodCount,
      recentPulses: formattedPulses,
    });
  } catch (error) {
    console.error('Live activity error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch activity' },
      { status: 500 }
    );
  }
}
