import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { supabaseAdmin } from '@/lib/supabase/server';

const bootstrapSchema = z.object({
  userId: z.string().uuid(),
  timezone: z.string(),
  countryCode: z.string().optional(),
  cityId: z.string().optional(),
  displayName: z.string().max(20).optional(),
});

// Generate a unique referral code
function generateReferralCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Removed ambiguous chars
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const data = bootstrapSchema.parse(body);

    // Try to detect country from request headers (Vercel/Cloudflare provide this)
    const countryCode = data.countryCode ||
      request.headers.get('x-vercel-ip-country') ||
      request.headers.get('cf-ipcountry') ||
      null;

    const cityId = data.cityId ||
      request.headers.get('x-vercel-ip-city') ||
      request.headers.get('cf-ipcity') ||
      null;

    // Check if user exists and needs referral code
    const { data: existingUser } = await supabaseAdmin
      .from('users')
      .select('id, referral_code')
      .eq('id', data.userId)
      .single();

    // Generate referral code for new users or existing users without one
    let referralCode = existingUser?.referral_code;
    if (!referralCode) {
      // Generate unique referral code with retry
      for (let attempts = 0; attempts < 5; attempts++) {
        const newCode = generateReferralCode();
        const { data: codeExists } = await supabaseAdmin
          .from('users')
          .select('id')
          .eq('referral_code', newCode)
          .single();

        if (!codeExists) {
          referralCode = newCode;
          break;
        }
      }
    }

    // Build update object
    const updateData: Record<string, unknown> = {
      id: data.userId,
      timezone: data.timezone,
      country_code: countryCode,
      city_id: cityId,
      updated_at: new Date().toISOString(),
    };

    // Only update referral_code if we generated one
    if (referralCode && !existingUser?.referral_code) {
      updateData.referral_code = referralCode;
    }

    // Only update display_name if provided
    if (data.displayName !== undefined) {
      updateData.display_name = data.displayName || null;
    }

    // Upsert user
    const { data: user, error } = await supabaseAdmin
      .from('users')
      .upsert(updateData, {
        onConflict: 'id',
        ignoreDuplicates: false,
      })
      .select()
      .single();

    if (error) {
      console.error('User bootstrap error:', error);
      return NextResponse.json(
        { error: 'Failed to bootstrap user' },
        { status: 500 }
      );
    }

    return NextResponse.json(user);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.issues },
        { status: 400 }
      );
    }

    console.error('Bootstrap error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
