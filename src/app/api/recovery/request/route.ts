import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { supabaseAdmin } from '@/lib/supabase/server';
import { checkRateLimit, rateLimitResponse } from '@/lib/api-utils';

const requestSchema = z.object({
  email: z.string().email(),
  userId: z.string().uuid().optional(), // Optional: current user ID for rate limiting
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const data = requestSchema.parse(body);
    const email = data.email.toLowerCase();

    // Rate limit by IP or user ID (prevents email enumeration/spam)
    // Use a hash of the email as fallback identifier
    const rateLimitId = data.userId || `email:${Buffer.from(email).toString('base64').slice(0, 32)}`;
    const rateLimit = await checkRateLimit(rateLimitId, 'recovery_request');
    if (!rateLimit.allowed) {
      return rateLimitResponse(rateLimit.retryAfter);
    }

    // Find user with this email
    const { data: user, error: userError } = await supabaseAdmin
      .from('users')
      .select('id, email')
      .eq('email', email)
      .single();

    // Always return success to prevent email enumeration
    if (userError || !user) {
      // Wait a bit to prevent timing attacks
      await new Promise((r) => setTimeout(r, 500));
      return NextResponse.json({ success: true });
    }

    // Generate recovery code using database function
    const { data: codeResult, error: codeError } = await supabaseAdmin.rpc(
      'generate_recovery_code',
      { p_user_id: user.id }
    );

    if (codeError) {
      console.error('Code generation error:', codeError);
      return NextResponse.json(
        { error: 'Failed to generate code' },
        { status: 500 }
      );
    }

    const code = codeResult;

    // Send email with code
    const emailSent = await sendRecoveryEmail(email, code);

    if (!emailSent) {
      console.error('Failed to send recovery email');
      // Still return success to prevent enumeration
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      );
    }

    console.error('Recovery request error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

async function sendRecoveryEmail(email: string, code: string): Promise<boolean> {
  const resendApiKey = process.env.RESEND_API_KEY;

  if (!resendApiKey) {
    console.error('RESEND_API_KEY not configured');
    // In development, log the code
    console.log(`[DEV] Recovery code for ${email}: ${code}`);
    return true;
  }

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${resendApiKey}`,
      },
      body: JSON.stringify({
        from: process.env.EMAIL_FROM || 'Global Pulse <noreply@globalpulse.app>',
        to: email,
        subject: 'Your Global Pulse Recovery Code',
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
            <div style="text-align: center; margin-bottom: 40px;">
              <h1 style="font-size: 28px; color: #1a1a2e; margin: 0;">🌍 Global Pulse</h1>
            </div>

            <div style="background: linear-gradient(135deg, #0f0f24 0%, #1a1a3e 100%); border-radius: 16px; padding: 40px; text-align: center;">
              <h2 style="color: #f0f0f5; font-size: 20px; margin: 0 0 20px 0;">Your Recovery Code</h2>

              <div style="background: rgba(6, 182, 212, 0.1); border: 2px solid rgba(6, 182, 212, 0.3); border-radius: 12px; padding: 24px; margin: 20px 0;">
                <span style="font-family: monospace; font-size: 36px; font-weight: bold; color: #06b6d4; letter-spacing: 8px;">${code}</span>
              </div>

              <p style="color: #a0a0b8; font-size: 14px; margin: 20px 0 0 0;">
                This code expires in <strong>15 minutes</strong>.
              </p>
            </div>

            <div style="margin-top: 30px; text-align: center;">
              <p style="color: #666; font-size: 13px;">
                If you didn't request this code, you can safely ignore this email.
              </p>
              <p style="color: #999; font-size: 12px; margin-top: 20px;">
                Global Pulse - Share how you feel. See how the world feels.
              </p>
            </div>
          </div>
        `,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('Resend API error:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Email send error:', error);
    return false;
  }
}
