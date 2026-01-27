import { NextRequest } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { verifyAdminAuth, unauthorizedResponse } from '@/lib/admin/auth';

export async function GET(request: NextRequest) {
  if (!verifyAdminAuth(request)) {
    return unauthorizedResponse();
  }


  try {
    // Get date ranges
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    // Parallel queries for stats
    const [
      totalUsersResult,
      newUsersThisWeekResult,
      newUsersPrevWeekResult,
      totalPulsesResult,
      pulsesThisWeekResult,
      pulsesPrevWeekResult,
      pushOptInResult,
      moodDistributionResult,
      dailyPulsesResult,
      topCountriesResult,
    ] = await Promise.all([
      // Total users
      supabaseAdmin.from('users').select('id', { count: 'exact', head: true }),

      // New users this week
      supabaseAdmin
        .from('users')
        .select('id', { count: 'exact', head: true })
        .gte('created_at', weekAgo),

      // New users previous week
      supabaseAdmin
        .from('users')
        .select('id', { count: 'exact', head: true })
        .gte('created_at', twoWeeksAgo)
        .lt('created_at', weekAgo),

      // Total pulses
      supabaseAdmin.from('pulses').select('id', { count: 'exact', head: true }),

      // Pulses this week
      supabaseAdmin
        .from('pulses')
        .select('id', { count: 'exact', head: true })
        .gte('created_at', weekAgo),

      // Pulses previous week
      supabaseAdmin
        .from('pulses')
        .select('id', { count: 'exact', head: true })
        .gte('created_at', twoWeeksAgo)
        .lt('created_at', weekAgo),

      // Push opt-in count
      supabaseAdmin
        .from('users')
        .select('id', { count: 'exact', head: true })
        .eq('push_opt_in', true),

      // Mood distribution (last 7 days)
      supabaseAdmin
        .from('pulses')
        .select('mood')
        .gte('created_at', weekAgo),

      // Daily pulses (last 7 days)
      supabaseAdmin
        .from('pulses')
        .select('created_at')
        .gte('created_at', weekAgo)
        .order('created_at', { ascending: true }),

      // Top countries
      supabaseAdmin
        .from('pulses')
        .select('country_code')
        .gte('created_at', weekAgo),
    ]);

    // Calculate stats
    const totalUsers = totalUsersResult.count || 0;
    const newUsersThisWeek = newUsersThisWeekResult.count || 0;
    const newUsersPrevWeek = newUsersPrevWeekResult.count || 0;
    const userGrowth = newUsersPrevWeek > 0
      ? Math.round(((newUsersThisWeek - newUsersPrevWeek) / newUsersPrevWeek) * 100)
      : 0;

    const totalPulses = totalPulsesResult.count || 0;
    const pulsesThisWeek = pulsesThisWeekResult.count || 0;
    const pulsesPrevWeek = pulsesPrevWeekResult.count || 0;
    const pulseGrowth = pulsesPrevWeek > 0
      ? Math.round(((pulsesThisWeek - pulsesPrevWeek) / pulsesPrevWeek) * 100)
      : 0;

    const pushOptIns = pushOptInResult.count || 0;
    const pushOptInRate = totalUsers > 0
      ? Math.round((pushOptIns / totalUsers) * 100)
      : 0;

    // Calculate mood distribution
    const moodCounts: Record<string, number> = {};
    (moodDistributionResult.data || []).forEach((pulse) => {
      moodCounts[pulse.mood] = (moodCounts[pulse.mood] || 0) + 1;
    });

    const moodDistribution = Object.entries(moodCounts)
      .map(([mood, count]) => ({ name: mood, value: count }))
      .sort((a, b) => b.value - a.value);

    // Calculate daily pulses for chart
    const dailyPulseMap: Record<string, number> = {};
    (dailyPulsesResult.data || []).forEach((pulse) => {
      const date = pulse.created_at.split('T')[0];
      dailyPulseMap[date] = (dailyPulseMap[date] || 0) + 1;
    });

    // Fill in missing days
    const dailyPulses: { name: string; pulses: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const dateStr = date.toISOString().split('T')[0];
      const dayName = date.toLocaleDateString('en', { weekday: 'short' });
      dailyPulses.push({
        name: dayName,
        pulses: dailyPulseMap[dateStr] || 0,
      });
    }

    // Calculate top countries
    const countryCounts: Record<string, number> = {};
    (topCountriesResult.data || []).forEach((pulse) => {
      if (pulse.country_code) {
        countryCounts[pulse.country_code] = (countryCounts[pulse.country_code] || 0) + 1;
      }
    });

    const topCountries = Object.entries(countryCounts)
      .map(([country, count]) => ({ name: country, value: count }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);

    // Active events count
    const { count: activeEvents } = await supabaseAdmin
      .from('events')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'active')
      .lte('start_at', now.toISOString())
      .gte('end_at', now.toISOString());

    // Pending notifications
    const { count: pendingNotifications } = await supabaseAdmin
      .from('notification_schedules')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'pending');

    // Active alerts
    const { count: activeAlerts } = await supabaseAdmin
      .from('alerts')
      .select('id', { count: 'exact', head: true })
      .lte('active_from', now.toISOString())
      .or(`active_until.is.null,active_until.gte.${now.toISOString()}`);

    return Response.json({
      overview: {
        totalUsers,
        userGrowth,
        totalPulses,
        pulseGrowth,
        pushOptIns,
        pushOptInRate,
        activeEvents: activeEvents || 0,
        pendingNotifications: pendingNotifications || 0,
        activeAlerts: activeAlerts || 0,
        avgDailyPulses: Math.round(pulsesThisWeek / 7),
      },
      charts: {
        dailyPulses,
        moodDistribution,
        topCountries,
      },
      lastUpdated: today,
    });
  } catch (error) {
    console.error('Stats error:', error);
    return Response.json(
      { error: 'Failed to fetch stats' },
      { status: 500 }
    );
  }
}
