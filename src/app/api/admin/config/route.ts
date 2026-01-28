import { NextRequest } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { verifyAdminAuth, unauthorizedResponse } from '@/lib/admin/auth';
import { logAuditAction } from '@/lib/admin/audit';

export async function GET(request: NextRequest) {
  if (!verifyAdminAuth(request)) {
    return unauthorizedResponse();
  }

  try {
    const { data: configRow, error } = await supabaseAdmin
      .from('app_config')
      .select('*')
      .eq('id', 'main')
      .single();

    if (error) {
      return Response.json({ error: 'Failed to fetch config' }, { status: 500 });
    }

    return Response.json({ config: configRow?.config || {} });
  } catch (error) {
    console.error('Config fetch error:', error);
    return Response.json({ error: 'Failed to fetch config' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  if (!verifyAdminAuth(request)) {
    return unauthorizedResponse();
  }

  try {
    const body = await request.json();

    // Get current config
    const { data: current } = await supabaseAdmin
      .from('app_config')
      .select('config')
      .eq('id', 'main')
      .single();

    // Deep merge with new values, but replace windows.schedule entirely (to handle deletions)
    const mergedConfig = deepMerge(current?.config || {}, body);

    // If windows.schedule is provided, replace it entirely instead of merging
    if (body.windows?.schedule) {
      mergedConfig.windows = {
        ...(mergedConfig.windows as Record<string, unknown>),
        schedule: body.windows.schedule,
      };
    }

    const { data: updated, error } = await supabaseAdmin
      .from('app_config')
      .upsert({ id: 'main', config: mergedConfig })
      .select()
      .single();

    if (error) {
      return Response.json({ error: 'Failed to update config' }, { status: 500 });
    }

    await logAuditAction({
      request,
      action: 'update',
      resourceType: 'config' as never,
      resourceId: 'main',
      changes: body,
    });

    return Response.json({ config: updated?.config });
  } catch (error) {
    console.error('Config update error:', error);
    return Response.json({ error: 'Failed to update config' }, { status: 500 });
  }
}

function deepMerge(target: Record<string, unknown>, source: Record<string, unknown>): Record<string, unknown> {
  const result = { ...target };

  for (const key of Object.keys(source)) {
    if (
      source[key] &&
      typeof source[key] === 'object' &&
      !Array.isArray(source[key]) &&
      target[key] &&
      typeof target[key] === 'object' &&
      !Array.isArray(target[key])
    ) {
      result[key] = deepMerge(
        target[key] as Record<string, unknown>,
        source[key] as Record<string, unknown>
      );
    } else {
      result[key] = source[key];
    }
  }

  return result;
}
