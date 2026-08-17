import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import { supabaseAdmin } from '@/lib/supabase/server';
import { applyUserSessionCookie, getSessionUserId } from '@/lib/session';
import { normalizeCityId } from '@/lib/cities-geo';

const bootstrapSchema = z.object({
  timezone: z.string().min(1).max(100),
  userId: z.string().uuid().optional(),
  legacyUserId: z.string().uuid().optional(),
  countryCode: z.string().max(8).nullable().optional(),
  cityId: z.string().max(64).nullable().optional(),
  displayName: z.string().max(20).nullable().optional(),
});

function generateReferralCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

async function ensureReferralCode(existingCode: string | null | undefined): Promise<string | null> {
  if (existingCode) return existingCode;

  for (let attempts = 0; attempts < 5; attempts++) {
    const newCode = generateReferralCode();
    const { data: codeExists } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('referral_code', newCode)
      .maybeSingle();

    if (!codeExists) {
      return newCode;
    }
  }

  return null;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const data = bootstrapSchema.parse(body);

    const sessionUserId = getSessionUserId(request);
    const migrationId = data.legacyUserId || data.userId;

    let userId = sessionUserId;

    if (!userId && migrationId) {
      const { data: existing } = await supabaseAdmin
        .from('users')
        .select('id')
        .eq('id', migrationId)
        .maybeSingle();

      if (existing?.id) {
        userId = existing.id;
      }
    }

    if (!userId) {
      userId = uuidv4();
    }

    const { data: existingUser } = await supabaseAdmin
      .from('users')
      .select('id, referral_code, city_id, country_code')
      .eq('id', userId)
      .maybeSingle();

    const referralCode = await ensureReferralCode(existingUser?.referral_code);

    const headerCountry =
      request.headers.get('x-vercel-ip-country') ||
      request.headers.get('cf-ipcountry') ||
      null;

    const explicitCity = data.cityId !== undefined ? normalizeCityId(data.cityId) : undefined;
    const headerCity = normalizeCityId(
      request.headers.get('x-vercel-ip-city') || request.headers.get('cf-ipcity')
    );

    const countryCode =
      data.countryCode !== undefined
        ? (data.countryCode || null)
        : (existingUser?.country_code ?? headerCountry);

    const cityId =
      explicitCity !== undefined
        ? explicitCity
        : (existingUser?.city_id ?? headerCity);

    const updateData: Record<string, unknown> = {
      id: userId,
      timezone: data.timezone,
      updated_at: new Date().toISOString(),
    };

    if (!existingUser) {
      updateData.country_code = countryCode;
      updateData.city_id = cityId;
    } else {
      if (data.countryCode !== undefined) {
        updateData.country_code = data.countryCode || null;
      }
      if (data.cityId !== undefined) {
        updateData.city_id = explicitCity;
      }
    }

    if (referralCode && !existingUser?.referral_code) {
      updateData.referral_code = referralCode;
    }

    if (data.displayName !== undefined) {
      updateData.display_name = data.displayName || null;
    }

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

    const response = NextResponse.json(user);
    return applyUserSessionCookie(response, user.id);
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
