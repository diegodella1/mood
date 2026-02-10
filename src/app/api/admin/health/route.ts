import { NextRequest } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { verifyAdminAuth, unauthorizedResponse } from '@/lib/admin/auth';

/**
 * Health check endpoint - verifies DB connection, tables exist, and env vars are set
 * GET /api/admin/health
 */
export async function GET(request: NextRequest) {
  if (!verifyAdminAuth(request)) {
    return unauthorizedResponse();
  }

  const checks: Record<string, { ok: boolean; detail?: string }> = {};

  // 1. Check env vars
  const envVars = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'SUPABASE_SERVICE_ROLE_KEY',
    'NEXT_PUBLIC_ONESIGNAL_APP_ID',
    'ONESIGNAL_REST_API_KEY',
    'CRON_SECRET',
    'ADMIN_SECRET',
  ];

  for (const v of envVars) {
    const value = process.env[v];
    checks[`env_${v}`] = {
      ok: !!value && value.length > 5,
      detail: value ? `set (${value.length} chars)` : 'MISSING',
    };
  }

  // 2. Check DB connection
  try {
    const { error } = await supabaseAdmin.from('users').select('id').limit(1);
    checks['db_connection'] = error
      ? { ok: false, detail: error.message }
      : { ok: true, detail: 'connected' };
  } catch (e) {
    checks['db_connection'] = { ok: false, detail: String(e) };
  }

  // 3. Check required tables exist
  const tables = [
    'users',
    'pulses',
    'events',
    'event_participations',
    'custom_windows',
    'custom_window_participations',
    'audit_logs',
    'notification_templates',
    'notification_schedules',
    'alerts',
    'badges',
  ];

  for (const table of tables) {
    try {
      const { error } = await supabaseAdmin.from(table).select('*').limit(0);
      checks[`table_${table}`] = error
        ? { ok: false, detail: error.message }
        : { ok: true };
    } catch (e) {
      checks[`table_${table}`] = { ok: false, detail: String(e) };
    }
  }

  // 4. Check OneSignal API connectivity
  try {
    const appId = process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID;
    const apiKey = process.env.ONESIGNAL_REST_API_KEY;
    if (appId && apiKey) {
      const response = await fetch(`https://api.onesignal.com/apps/${appId}`, {
        headers: { Authorization: `Basic ${apiKey}` },
      });
      const data = await response.json();
      checks['onesignal_api'] = response.ok
        ? { ok: true, detail: `app: ${data.name}, players: ${data.players}` }
        : { ok: false, detail: `HTTP ${response.status}: ${JSON.stringify(data)}` };
    } else {
      checks['onesignal_api'] = { ok: false, detail: 'Missing env vars' };
    }
  } catch (e) {
    checks['onesignal_api'] = { ok: false, detail: String(e) };
  }

  const allOk = Object.values(checks).every((c) => c.ok);

  return Response.json({
    healthy: allOk,
    checks,
    timestamp: new Date().toISOString(),
  });
}
