import { NextRequest } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { sendNotificationWithGuardrails } from '@/lib/onesignal/server';
import { validateCronAuth } from '@/lib/api-utils';
import { getEscalationCopy } from '@/lib/notification-copy';

export const dynamic = 'force-dynamic';

/**
 * Escalation cron — runs daily at 12:00 UTC.
 *
 * 1. Updates `days_inactive` and `escalation_level` for every user.
 * 2. Sends Duolingo-style escalation push notifications to inactive users.
 *
 * Escalation levels:
 *   0 — active (pulsed today or yesterday)
 *   1 — 1 day missed  → friendly nudge
 *   2 — 2 days missed → social proof
 *   3 — 3 days missed → loss aversion
 *   4 — 5 days missed → breakup / reverse psychology
 *   5 — 14+ days missed → win-back (only once)
 */
export async function GET(request: NextRequest) {
  const auth = validateCronAuth(request);
  if (!auth.valid) return auth.error;

  try {
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];

    // Get all users with push enabled
    const { data: users } = await supabaseAdmin
      .from('users')
      .select('id, timezone, streak_days, display_name, city_id, last_pulse_date, days_inactive, escalation_level, winback_sent_at, push_opt_in')
      .eq('push_opt_in', true);

    if (!users || users.length === 0) {
      return Response.json({ skipped: true, reason: 'No push users' });
    }

    let updated = 0;
    let notified = 0;
    let skipped = 0;

    for (const user of users) {
      const lastPulseDate = user.last_pulse_date;

      // Calculate days since last pulse
      let daysInactive = 0;
      if (lastPulseDate) {
        const lastPulse = new Date(lastPulseDate);
        const today = new Date(todayStr);
        daysInactive = Math.floor((today.getTime() - lastPulse.getTime()) / (1000 * 60 * 60 * 24));
        if (daysInactive < 0) daysInactive = 0;
      } else {
        // Never pulsed — treat as 1 day inactive if they signed up before today
        daysInactive = 1;
      }

      // Determine escalation level
      let newLevel = 0;
      if (daysInactive === 0) newLevel = 0;
      else if (daysInactive === 1) newLevel = 1;
      else if (daysInactive === 2) newLevel = 2;
      else if (daysInactive >= 3 && daysInactive <= 4) newLevel = 3;
      else if (daysInactive >= 5 && daysInactive <= 13) newLevel = 4;
      else if (daysInactive >= 14) newLevel = 5;

      // Update user
      const updateData: Record<string, unknown> = {
        days_inactive: daysInactive,
        escalation_level: newLevel,
      };

      // For win-back (level 5), only send once
      if (newLevel === 5 && user.winback_sent_at) {
        // Already sent win-back, skip notification but still update days_inactive
        await supabaseAdmin.from('users').update(updateData).eq('id', user.id);
        updated++;
        skipped++;
        continue;
      }

      await supabaseAdmin.from('users').update(updateData).eq('id', user.id);
      updated++;

      // Get escalation copy
      if (newLevel === 0) continue; // Active users don't get escalation

      // Get city name for copy
      let cityName: string | undefined;
      if (user.city_id) {
        const { data: city } = await supabaseAdmin
          .from('cities')
          .select('name')
          .eq('id', user.city_id)
          .single();
        cityName = city?.name;
      }

      // Get friend count
      const { count: friendCount } = await supabaseAdmin
        .from('friendships')
        .select('id', { count: 'exact', head: true })
        .or(`user_id.eq.${user.id},friend_id.eq.${user.id}`)
        .eq('status', 'accepted');

      const copy = getEscalationCopy(newLevel, {
        streakDays: user.streak_days ?? 0,
        displayName: user.display_name ?? undefined,
        cityName,
        friendCount: friendCount ?? 0,
      });

      if (!copy) {
        skipped++;
        continue;
      }

      // Send with guardrails
      const result = await sendNotificationWithGuardrails(
        {
          title: copy.title,
          message: copy.message,
          url: '/',
          ttl: 86400,
          web_push_topic: 'escalation',
          idempotency_key: `escalation-${user.id}-${todayStr}-L${newLevel}`,
        },
        user.id,
        user.timezone || 'UTC',
        supabaseAdmin,
      );

      if (result.success) {
        notified++;
        // Mark win-back as sent
        if (newLevel === 5) {
          await supabaseAdmin
            .from('users')
            .update({ winback_sent_at: now.toISOString() })
            .eq('id', user.id);
        }
      }
    }

    return Response.json({
      processed: true,
      users_checked: users.length,
      updated,
      notified,
      skipped,
    });
  } catch (error) {
    console.error('Escalation cron error:', error);
    return Response.json({ error: 'Failed to process escalation' }, { status: 500 });
  }
}
