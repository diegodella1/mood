import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { supabaseAdmin } from '@/lib/supabase/server';

const trackShareSchema = z.object({
  userId: z.string().uuid(),
  shareType: z.enum(['pulse', 'badge', 'streak', 'profile', 'leaderboard', 'referral']),
  context: z.record(z.string(), z.unknown()).optional(),
  platform: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const data = trackShareSchema.parse(body);

    const { data: shareId, error } = await supabaseAdmin.rpc('track_share', {
      p_user_id: data.userId,
      p_share_type: data.shareType,
      p_share_context: data.context || {},
      p_platform: data.platform || 'unknown',
    });

    if (error) {
      console.error('Share tracking error:', error);
      // Don't fail the request, just log
      return NextResponse.json({ tracked: false });
    }

    return NextResponse.json({ tracked: true, shareId });
  } catch (error) {
    // Silent fail - tracking shouldn't break the app
    console.error('Share track error:', error);
    return NextResponse.json({ tracked: false });
  }
}
