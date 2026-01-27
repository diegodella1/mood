import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { sendNotificationToAll, sendNotificationByTags, sendNotificationToUsers } from '@/lib/onesignal/server';

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

function verifyCronSecret(request: NextRequest): boolean {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) {
    console.warn('CRON_SECRET not configured');
    return false;
  }

  return authHeader === `Bearer ${cronSecret}`;
}

export async function GET(request: NextRequest) {
  if (!verifyCronSecret(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
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
      message: `Processed ${processed} jobs, ${failed} failed`,
      processed,
      failed,
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
