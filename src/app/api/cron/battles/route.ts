import { NextRequest } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { sendBattleNotification } from '@/lib/onesignal/server';
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
    const battlesConfig = config.battles || {};

    if (!battlesConfig.enabled) {
      return Response.json({ skipped: true, reason: 'Battles disabled' });
    }

    const now = new Date();

    // Get battles that need processing
    const { data: battles } = await supabaseAdmin
      .from('city_battles')
      .select('*')
      .in('status', ['scheduled', 'active']);

    if (!battles || battles.length === 0) {
      return Response.json({ skipped: true, reason: 'No active battles' });
    }

    const results = [];

    for (const battle of battles) {
      const startAt = new Date(battle.start_at);
      const endAt = new Date(battle.end_at);

      // Check if battle should start
      if (battle.status === 'scheduled' && now >= startAt) {
        await supabaseAdmin
          .from('city_battles')
          .update({ status: 'active' })
          .eq('id', battle.id);

        // Send start notification
        if (battle.push_schedule?.start) {
          const copy = battle.copy || {};
          const title = (copy.start_title || 'City Battle Begins!')
            .replace('{city_a}', battle.city_a_name)
            .replace('{city_b}', battle.city_b_name);
          const body = (copy.start_body || '{city_a} vs {city_b}!')
            .replace('{city_a}', battle.city_a_name)
            .replace('{city_b}', battle.city_b_name);

          await sendBattleNotification({
            title,
            message: body,
            cityIds: [battle.city_a_id, battle.city_b_id],
            battleId: battle.id,
            phase: 'start',
            ttl: Math.max(0, Math.round((endAt.getTime() - now.getTime()) / 1000)),
          });
        }

        results.push({ battle_id: battle.id, action: 'started' });
        continue;
      }

      // Check if battle should end
      if (battle.status === 'active' && now >= endAt) {
        // Calculate final scores
        const { data: scores } = await supabaseAdmin
          .from('city_battle_scores')
          .select('city_id, raw_pulses, weighted_score')
          .eq('battle_id', battle.id);

        const totals: Record<string, number> = {};
        (scores || []).forEach((s) => {
          totals[s.city_id] = (totals[s.city_id] || 0) + Number(s.weighted_score);
        });

        const scoreA = totals[battle.city_a_id] || 0;
        const scoreB = totals[battle.city_b_id] || 0;
        const winnerId = scoreA > scoreB ? battle.city_a_id : battle.city_b_id;
        const winnerName = scoreA > scoreB ? battle.city_a_name : battle.city_b_name;
        const winnerScore = Math.max(scoreA, scoreB);

        await supabaseAdmin
          .from('city_battles')
          .update({ status: 'completed', winner_city_id: winnerId })
          .eq('id', battle.id);

        // Send end notification
        if (battle.push_schedule?.end) {
          const copy = battle.copy || {};
          const title = (copy.end_title || 'Battle Complete!')
            .replace('{winner}', winnerName)
            .replace('{score}', String(Math.round(winnerScore)));
          const body = (copy.end_body || '{winner} wins!')
            .replace('{winner}', winnerName)
            .replace('{score}', String(Math.round(winnerScore)));

          await sendBattleNotification({
            title,
            message: body,
            cityIds: [battle.city_a_id, battle.city_b_id],
            battleId: battle.id,
            phase: 'end',
            ttl: 7200,
          });
        }

        results.push({ battle_id: battle.id, action: 'completed', winner: winnerName });
        continue;
      }

      // For active battles, compute current scores
      if (battle.status === 'active') {
        const dateStr = now.toISOString().split('T')[0];

        // Get pulse counts for both cities from today
        const { data: cityAggregates } = await supabaseAdmin
          .from('aggregates_city_window')
          .select('*')
          .in('city_id', [battle.city_a_id, battle.city_b_id])
          .like('window_id', `${dateStr}%`);

        // Update scores
        for (const agg of cityAggregates || []) {
          await supabaseAdmin
            .from('city_battle_scores')
            .upsert({
              battle_id: battle.id,
              city_id: agg.city_id,
              window_id: agg.window_id,
              raw_pulses: agg.total_count,
              weighted_score: agg.total_count,
              mood_breakdown: agg.mood_counts,
            }, {
              onConflict: 'battle_id,city_id,window_id',
            });
        }

        // Check for close match mid-battle notification
        const threshold = battle.push_schedule?.mid_close_match_threshold || 10;
        const { data: currentScores } = await supabaseAdmin
          .from('city_battle_scores')
          .select('city_id, weighted_score')
          .eq('battle_id', battle.id);

        const currentTotals: Record<string, number> = {};
        (currentScores || []).forEach((s) => {
          currentTotals[s.city_id] = (currentTotals[s.city_id] || 0) + Number(s.weighted_score);
        });

        const diff = Math.abs(
          (currentTotals[battle.city_a_id] || 0) - (currentTotals[battle.city_b_id] || 0)
        );

        // Send mid-battle notification if close match and not already sent
        if (
          battle.push_schedule?.mid &&
          diff <= threshold &&
          diff > 0 &&
          !battle.mid_notif_sent
        ) {
          const copy = battle.copy || {};
          const title = copy.mid_title || 'Close Battle! 🔥';
          const body = (copy.mid_body || '{city_a} and {city_b} are neck and neck!')
            .replace('{city_a}', battle.city_a_name)
            .replace('{city_b}', battle.city_b_name);

          const midResult = await sendBattleNotification({
            title,
            message: body,
            cityIds: [battle.city_a_id, battle.city_b_id],
            battleId: battle.id,
            phase: 'mid',
            ttl: Math.max(0, Math.round((endAt.getTime() - now.getTime()) / 1000)),
          });

          if (midResult.success) {
            await supabaseAdmin
              .from('city_battles')
              .update({ mid_notif_sent: true })
              .eq('id', battle.id);
          }

          results.push({
            battle_id: battle.id,
            action: 'score_updated',
            close_match: true,
            diff,
            mid_notif_sent: midResult.success,
          });
        } else {
          results.push({ battle_id: battle.id, action: 'score_updated' });
        }
      }
    }

    return Response.json({
      processed: true,
      battles_checked: battles.length,
      results,
    });
  } catch (error) {
    console.error('Battles cron error:', error);
    return Response.json({ error: 'Failed to process battles' }, { status: 500 });
  }
}
