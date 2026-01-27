import { supabaseAdmin } from '@/lib/supabase/server';
import { NextRequest } from 'next/server';

export const revalidate = 60; // Cache for 60 seconds

export async function GET(request: NextRequest) {
  try {
    // Get main app config
    const { data: configRow } = await supabaseAdmin
      .from('app_config')
      .select('config')
      .eq('id', 'main')
      .single();

    const config = configRow?.config || {};

    // Get active battles
    const { data: activeBattles } = await supabaseAdmin
      .from('city_battles')
      .select('id, name, city_a_id, city_a_name, city_b_id, city_b_name, start_at, end_at, status, assets')
      .eq('status', 'active')
      .limit(5);

    // Get window schedules
    const { data: schedules } = await supabaseAdmin
      .from('window_schedules')
      .select('timezone_bucket, window_type, start_hour, end_hour, enabled');

    // Build public config (only expose what frontend needs)
    const publicConfig = {
      features: {
        windows: config.windows?.enabled ?? true,
        flip: config.flip?.enabled ?? true,
        shift: config.shift?.enabled ?? true,
        battles: config.battles?.enabled ?? false,
        a2hs: config.a2hs?.enabled ?? true,
        nudges: config.nudges?.enabled ?? true,
      },
      windows: {
        schedule: config.windows?.schedule ?? {
          morning: { start: 8, end: 11 },
          afternoon: { start: 13, end: 16 },
          night: { start: 20, end: 23 },
        },
        customSchedules: schedules?.filter(s => s.enabled) || [],
      },
      privacy: {
        minCityPulses: config.privacy?.min_city_pulses ?? 10,
      },
      a2hs: {
        cooldownHours: config.a2hs?.cooldown_hours ?? 72,
        triggerAfterPulses: config.a2hs?.trigger_after_pulses ?? 1,
      },
      battles: {
        active: activeBattles || [],
        scoringMode: config.battles?.scoring_mode ?? 'per_capita_bucket',
      },
    };

    return Response.json(publicConfig, {
      headers: {
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120',
      },
    });
  } catch (error) {
    console.error('Config error:', error);
    // Return defaults on error
    return Response.json({
      features: {
        windows: true,
        flip: true,
        shift: true,
        battles: false,
        a2hs: true,
        nudges: true,
      },
      windows: {
        schedule: {
          morning: { start: 8, end: 11 },
          afternoon: { start: 13, end: 16 },
          night: { start: 20, end: 23 },
        },
        customSchedules: [],
      },
      privacy: { minCityPulses: 10 },
      a2hs: { cooldownHours: 72, triggerAfterPulses: 1 },
      battles: { active: [], scoringMode: 'per_capita_bucket' },
    });
  }
}
