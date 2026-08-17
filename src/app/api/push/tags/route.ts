import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { updateUserTags } from '@/lib/onesignal/server';
import { requireUser } from '@/lib/session';

const tagsSchema = z.object({
  userId: z.string().uuid().optional(),
  tags: z.record(z.string(), z.string()),
});

export async function POST(request: NextRequest) {
  try {
    const session = requireUser(request);
    if (!session.ok) return session.response;
    const userId = session.userId;

    const body = await request.json();
    const data = tagsSchema.parse(body);

    const result = await updateUserTags(userId, data.tags);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to update tags' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.issues },
        { status: 400 }
      );
    }

    console.error('Push tags error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
