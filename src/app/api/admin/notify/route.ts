import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { sendNotificationToAll, sendNotificationByTags } from '@/lib/onesignal/server';

const notifySchema = z.object({
  title: z.string().min(1).max(100),
  message: z.string().min(1).max(500),
  url: z.string().url().optional(),
  filters: z.array(z.object({
    field: z.literal('tag'),
    key: z.string(),
    value: z.string(),
    relation: z.enum(['=', '!=', '>', '<', '>=', '<=']).optional(),
  })).optional(),
});

function verifyAdminSecret(request: NextRequest): boolean {
  const authHeader = request.headers.get('authorization');
  const adminSecret = process.env.ADMIN_SECRET;

  if (!adminSecret) {
    console.warn('ADMIN_SECRET not configured');
    return false;
  }

  return authHeader === `Bearer ${adminSecret}`;
}

export async function POST(request: NextRequest) {
  if (!verifyAdminSecret(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const data = notifySchema.parse(body);

    let result: { success: boolean; id?: string; error?: string };

    if (data.filters && data.filters.length > 0) {
      result = await sendNotificationByTags(
        {
          title: data.title,
          message: data.message,
          url: data.url,
        },
        { filters: data.filters }
      );
    } else {
      result = await sendNotificationToAll({
        title: data.title,
        message: data.message,
        url: data.url,
      });
    }

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to send notification' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      notificationId: result.id,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.issues },
        { status: 400 }
      );
    }

    console.error('Admin notify error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
