import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { supabaseAdmin } from '@/lib/supabase/server';
import { sendNotificationToUsers } from '@/lib/onesignal/server';

const optinSchema = z.object({
  userId: z.string().uuid(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const data = optinSchema.parse(body);

    const { error } = await supabaseAdmin
      .from('users')
      .update({
        push_opt_in: true,
        updated_at: new Date().toISOString(),
      })
      .eq('id', data.userId);

    if (error) {
      console.error('Push opt-in error:', error);
      return NextResponse.json(
        { error: 'Failed to update push opt-in' },
        { status: 500 }
      );
    }

    // Send welcome push notification (delayed slightly so SDK registers)
    setTimeout(async () => {
      try {
        await sendNotificationToUsers(
          {
            title: 'You\'re in! 🌍',
            message: 'Your first pulse earns 2x XP. How are you feeling right now?',
            url: '/',
            ttl: 86400,
            web_push_topic: 'welcome',
            idempotency_key: `welcome-${data.userId}`,
          },
          [data.userId],
        );
      } catch (err) {
        console.error('Welcome push error:', err);
      }
    }, 5000);

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.issues },
        { status: 400 }
      );
    }

    console.error('Push opt-in error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
