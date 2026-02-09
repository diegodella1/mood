import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { sendNotificationToAll, sendNotificationByTags, sendNotificationToUsers } from '@/lib/onesignal/server';
import { validateCronAuth } from '@/lib/api-utils';

interface NotificationTemplate {
  id: string;
  type: string;
  title: string;
  body: string;
  cooldown_minutes: number;
}

interface NotificationJob {
  id: string;
  template_id: string;
  audience_type: string;
  audience_payload: Record<string, unknown>;
  status: string;
  notification_templates: NotificationTemplate | null;
}

export async function GET(request: NextRequest) {
  const auth = validateCronAuth(request);
  if (!auth.valid) return auth.error;

  try {
    // ── Process notification_schedules (admin scheduled notifs) ──
    const nowISO = new Date().toISOString();
    const { data: schedules } = await supabaseAdmin
      .from('notification_schedules')
      .select('*')
      .eq('status', 'pending')
      .lte('scheduled_for', nowISO)
      .limit(20);

    let schedulesProcessed = 0;
    let schedulesFailed = 0;

    for (const sched of schedules || []) {
      try {
        const opts = {
          title: sched.title as string,
          message: sched.body as string,
          url: (sched.url as string) || '/',
        };

        let result: { success: boolean; error?: string };

        if (sched.audience_type === 'all') {
          result = await sendNotificationToAll(opts);
        } else if (sched.audience_type === 'tags' && sched.audience_payload?.filters) {
          result = await sendNotificationByTags(opts, { filters: sched.audience_payload.filters });
        } else if (sched.audience_type === 'users' && sched.audience_payload?.user_ids) {
          result = await sendNotificationToUsers(opts, sched.audience_payload.user_ids as string[]);
        } else {
          result = { success: false, error: `Unknown audience: ${sched.audience_type}` };
        }

        await supabaseAdmin
          .from('notification_schedules')
          .update({
            status: result.success ? 'sent' : 'failed',
            processed_at: new Date().toISOString(),
          })
          .eq('id', sched.id);

        if (result.success) schedulesProcessed++;
        else schedulesFailed++;
      } catch {
        await supabaseAdmin
          .from('notification_schedules')
          .update({ status: 'failed', processed_at: new Date().toISOString() })
          .eq('id', sched.id);
        schedulesFailed++;
      }
    }

    // ── Process notification_jobs queue ──
    // Get pending notification jobs
    const { data: jobs } = await supabaseAdmin
      .from('notification_jobs')
      .select('*, notification_templates(*)')
      .eq('status', 'pending')
      .order('created_at', { ascending: true })
      .limit(50) as { data: NotificationJob[] | null };

    if (!jobs || jobs.length === 0) {
      return NextResponse.json({ message: 'No pending jobs', processed: 0 });
    }

    let processed = 0;
    let failed = 0;

    for (const job of jobs) {
      try {
        const template = job.notification_templates;
        if (!template) {
          await markJobFailed(job.id);
          failed++;
          continue;
        }

        const payload = job.audience_payload as Record<string, unknown>;
        let result: { success: boolean; error?: string };

        switch (job.audience_type) {
          case 'all':
            result = await sendNotificationToAll({
              title: template.title,
              message: template.body,
            });
            break;

          case 'tags':
            result = await sendNotificationByTags(
              {
                title: template.title,
                message: template.body,
              },
              { filters: payload.filters as Array<{ field: 'tag'; key: string; value: string }> }
            );
            break;

          case 'users':
            result = await sendNotificationToUsers(
              {
                title: template.title,
                message: template.body,
              },
              payload.user_ids as string[]
            );
            break;

          default:
            result = { success: false, error: `Unknown audience type: ${job.audience_type}` };
        }

        if (result.success) {
          await markJobSent(job.id);
          processed++;
        } else {
          await markJobFailed(job.id);
          failed++;
        }
      } catch (error) {
        console.error(`Failed to process job ${job.id}:`, error);
        await markJobFailed(job.id);
        failed++;
      }
    }

    return NextResponse.json({
      message: `Processed ${processed} jobs, ${failed} failed. Schedules: ${schedulesProcessed} sent, ${schedulesFailed} failed.`,
      processed,
      failed,
      schedulesProcessed,
      schedulesFailed,
    });
  } catch (error) {
    console.error('Notification queue cron error:', error);
    return NextResponse.json(
      { error: 'Failed to process notification queue' },
      { status: 500 }
    );
  }
}

async function markJobSent(jobId: string) {
  await supabaseAdmin
    .from('notification_jobs')
    .update({
      status: 'sent',
      processed_at: new Date().toISOString(),
    })
    .eq('id', jobId);
}

async function markJobFailed(jobId: string) {
  await supabaseAdmin
    .from('notification_jobs')
    .update({
      status: 'failed',
      processed_at: new Date().toISOString(),
    })
    .eq('id', jobId);
}
