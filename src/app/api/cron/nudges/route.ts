import { NextRequest } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { sendNotificationToUsers } from '@/lib/onesignal/server';
import { getActiveWindow, generateWindowId, getCurrentDateInTimezone } from '@/lib/timezone';
import { validateCronAuth } from '@/lib/api-utils';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  // Validate cron authentication
  const auth = validateCronAuth(request);
  if (!auth.valid) return auth.error;

  try {
    // Get config
    const { data: configRow } = await supabaseAdmin
      .from('app_config')
      .select('config')
      .eq('id', 'main')
      .single();

    const config = configRow?.config || {};
    const nudgesConfig = config.nudges || {};

    if (!nudgesConfig.enabled) {
      return Response.json({ skipped: true, reason: 'Nudges disabled' });
    }

    const dedupeWindowMinutes = nudgesConfig.dedupe_window_minutes || 180;

    // Get enabled nudge rules
    const { data: rules } = await supabaseAdmin
      .from('nudge_rules')
      .select('*')
      .eq('enabled', true)
      .order('priority', { ascending: true });

    if (!rules || rules.length === 0) {
      return Response.json({ skipped: true, reason: 'No active rules' });
    }

    const now = new Date();
    const results = [];

    for (const rule of rules) {
      const conditions = rule.conditions || {};

      // Check if window is active (if required by rule)
      if (conditions.window_active) {
        // Get users in active windows
        const { data: users } = await supabaseAdmin
          .from('users')
          .select('id, timezone, streak_days')
          .eq('push_opt_in', true);

        const usersToNudge: Array<{ userId: string; windowId: string }> = [];

        for (const user of users || []) {
          const activeWindow = getActiveWindow(user.timezone || 'UTC');
          if (!activeWindow) continue;

          const tz = user.timezone || 'UTC';
          const dateStr = getCurrentDateInTimezone(tz);
          const windowId = generateWindowId(dateStr, activeWindow, tz);

          // Check if user has already pulsed in this window
          if (conditions.user_has_not_pulsed) {
            const { data: pulses } = await supabaseAdmin
              .from('pulses')
              .select('id')
              .eq('user_id', user.id)
              .eq('window_id', windowId)
              .limit(1);

            if (pulses && pulses.length > 0) continue;
          }

          // Check streak condition
          if (conditions.has_streak && user.streak_days === 0) {
            continue;
          }

          // Check if it's "streak at risk" situation (last window of day + has streak + hasn't pulsed today)
          if (conditions.streak_at_risk) {
            // Must have a streak to be at risk
            if (user.streak_days === 0) continue;

            // Check if it's the last window (night)
            if (activeWindow !== 'night') continue;

            // Check if user has pulsed at all today
            const { data: todayPulses } = await supabaseAdmin
              .from('pulses')
              .select('id')
              .eq('user_id', user.id)
              .like('window_id', `${dateStr}|%`)
              .limit(1);

            // If user already pulsed today, streak is safe
            if (todayPulses && todayPulses.length > 0) continue;
          }

          // Check if we've already nudged this user recently
          const { data: recentNudges } = await supabaseAdmin
            .from('nudge_deliveries')
            .select('id')
            .eq('user_id', user.id)
            .eq('rule_id', rule.id)
            .gte('sent_at', new Date(now.getTime() - dedupeWindowMinutes * 60 * 1000).toISOString())
            .limit(1);

          if (recentNudges && recentNudges.length > 0) continue;

          // Check max per window
          const { data: windowNudges } = await supabaseAdmin
            .from('nudge_deliveries')
            .select('id')
            .eq('user_id', user.id)
            .eq('window_id', windowId)
            .eq('rule_id', rule.id);

          if ((windowNudges?.length || 0) >= (rule.max_per_window || 1)) continue;

          usersToNudge.push({ userId: user.id, windowId });
        }

        if (usersToNudge.length === 0) continue;

        // Get template
        const template = rule.inline_template || {};
        let title = template.title || 'Time to pulse!';
        let body = template.body || 'Share how you are feeling';

        // Note: For now, batch notifications can't be fully personalized per-user
        // The {{streak}} placeholder would need individual sends to personalize
        // We remove the placeholder for batch sends
        title = title.replace('{{streak}}', '').replace(/\s+/g, ' ').trim();
        body = body.replace('{{streak}}', '').replace(/\s+/g, ' ').trim();

        // Send notifications in batches
        const batchSize = 100;
        let sent = 0;

        for (let i = 0; i < usersToNudge.length; i += batchSize) {
          const batch = usersToNudge.slice(i, i + batchSize);
          const userIds = batch.map((u) => u.userId);

          const result = await sendNotificationToUsers(
            { title, message: body, url: '/' },
            userIds
          );

          if (result.success) {
            sent += batch.length;

            // Record deliveries
            const deliveries = batch.map((u) => ({
              rule_id: rule.id,
              user_id: u.userId,
              window_id: u.windowId,
            }));

            await supabaseAdmin.from('nudge_deliveries').insert(deliveries);
          }
        }

        results.push({
          rule: rule.name,
          users_targeted: usersToNudge.length,
          sent,
        });
      }
    }

    return Response.json({
      processed: true,
      rules_checked: rules.length,
      results,
    });
  } catch (error) {
    console.error('Nudges cron error:', error);
    return Response.json({ error: 'Failed to process nudges' }, { status: 500 });
  }
}
