import { NextRequest } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { verifyAdminAuth, unauthorizedResponse } from '@/lib/admin/auth';
import { logAuditAction } from '@/lib/admin/audit';
import { ITEMS_PER_PAGE } from '@/lib/admin/constants';
import {
  sendNotificationToAll,
  sendNotificationByTags,
  sendNotificationToUsers,
} from '@/lib/onesignal/server';

interface TagFilter {
  key: string;
  value: string;
  relation: string;
}

export async function GET(request: NextRequest) {
  if (!verifyAdminAuth(request)) {
    return unauthorizedResponse();
  }

    const { searchParams } = new URL(request.url);

  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || String(ITEMS_PER_PAGE));

  const offset = (page - 1) * limit;

  try {
    // Get notification jobs (sent notifications)
    const { data: notifications, count, error } = await supabaseAdmin
      .from('notification_jobs')
      .select('*, notification_templates(*)', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('Notifications fetch error:', error);
      return Response.json({ error: 'Failed to fetch notifications' }, { status: 500 });
    }

    return Response.json({
      notifications: notifications || [],
      pagination: {
        page,
        pageSize: limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
      },
    });
  } catch (error) {
    console.error('Notifications error:', error);
    return Response.json({ error: 'Failed to fetch notifications' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  if (!verifyAdminAuth(request)) {
    return unauthorizedResponse();
  }

  
  try {
    const body = await request.json();
    const { title, body: message, audience_type, audience_payload } = body;

    if (!title || !message) {
      return Response.json(
        { error: 'Title and body are required' },
        { status: 400 }
      );
    }

    let result;
    const notificationOptions = { title, message };

    // Send notification based on audience type
    switch (audience_type) {
      case 'all':
        result = await sendNotificationToAll(notificationOptions);
        break;

      case 'country':
        if (!audience_payload?.country_codes?.length) {
          return Response.json(
            { error: 'Country codes are required for country audience' },
            { status: 400 }
          );
        }
        // Build filter for OR between multiple countries
        const countryFilters: (TagFilter | { operator: 'OR' })[] = [];
        audience_payload.country_codes.forEach((code: string, index: number) => {
          if (index > 0) countryFilters.push({ operator: 'OR' });
          countryFilters.push({ key: 'country_code', value: code, relation: '=' });
        });
        result = await sendNotificationByTags(notificationOptions, { filters: countryFilters as never[] });
        break;

      case 'city':
        if (!audience_payload?.city_ids?.length) {
          return Response.json(
            { error: 'City IDs are required for city audience' },
            { status: 400 }
          );
        }
        const cityFilters: (TagFilter | { operator: 'OR' })[] = [];
        audience_payload.city_ids.forEach((id: string, index: number) => {
          if (index > 0) cityFilters.push({ operator: 'OR' });
          cityFilters.push({ key: 'city_id', value: id, relation: '=' });
        });
        result = await sendNotificationByTags(notificationOptions, { filters: cityFilters as never[] });
        break;

      case 'users':
        if (!audience_payload?.user_ids?.length) {
          return Response.json(
            { error: 'User IDs are required for users audience' },
            { status: 400 }
          );
        }
        result = await sendNotificationToUsers(notificationOptions, audience_payload.user_ids);
        break;

      default:
        result = await sendNotificationToAll(notificationOptions);
    }

    // Log the notification job
    const { data: job } = await supabaseAdmin
      .from('notification_jobs')
      .insert({
        audience_type: audience_type || 'all',
        status: result.success ? 'sent' : 'failed',
        dedupe_key: `admin_${Date.now()}`,
      })
      .select()
      .single();

    await logAuditAction({
      request,
      action: 'send_notification',
      resourceType: 'notification',
      resourceId: job?.id,
      changes: { title, audience_type, audience_payload },
    });

    return Response.json({
      success: result.success,
      notification_id: result.id,
      job_id: job?.id,
    });
  } catch (error) {
    console.error('Send notification error:', error);
    return Response.json({ error: 'Failed to send notification' }, { status: 500 });
  }
}
