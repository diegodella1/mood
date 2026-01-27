import { supabaseAdmin } from '@/lib/supabase/server';
import { NextRequest } from 'next/server';
import { getAdminIdentifier, getClientIP } from './auth';

type AuditAction =
  | 'create'
  | 'update'
  | 'delete'
  | 'send_notification'
  | 'schedule_notification'
  | 'cancel_notification'
  | 'view';

type ResourceType =
  | 'user'
  | 'event'
  | 'alert'
  | 'notification'
  | 'notification_schedule';

interface AuditLogParams {
  request: NextRequest;
  action: AuditAction;
  resourceType: ResourceType;
  resourceId?: string;
  changes?: Record<string, unknown>;
}

/**
 * Log an admin action for audit trail
 */
export async function logAuditAction({
  request,
  action,
  resourceType,
  resourceId,
  changes = {},
}: AuditLogParams): Promise<void> {
  try {
    await supabaseAdmin.from('audit_logs').insert({
      action,
      resource_type: resourceType,
      resource_id: resourceId,
      admin_id: getAdminIdentifier(request),
      changes,
      ip_address: getClientIP(request),
      user_agent: request.headers.get('user-agent') || 'unknown',
    });
  } catch (error) {
    // Don't fail the main operation if audit logging fails
    console.error('Failed to log audit action:', error);
  }
}
