import { maskEmail } from '@/lib/recovery';

export async function sendVerificationEmail(
  email: string,
  code: string,
  purpose: 'verify' | 'recovery'
): Promise<boolean> {
  const resendApiKey = process.env.RESEND_API_KEY;
  const subject = purpose === 'verify' ? 'Confirm your Global Pulse email' : 'Your Global Pulse Recovery Code';
  const heading = purpose === 'verify' ? 'Confirm your email' : 'Your Recovery Code';

  if (!resendApiKey) {
    if (process.env.NODE_ENV === 'development') {
      console.log(`[DEV] ${purpose} code for ${maskEmail(email)}: ${code}`);
    } else {
      console.error('RESEND_API_KEY not configured');
    }
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
        subject,
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
            <div style="text-align: center; margin-bottom: 40px;">
              <h1 style="font-size: 28px; color: #1a1a2e; margin: 0;">🌍 Global Pulse</h1>
            </div>
            <div style="background: linear-gradient(135deg, #0f0f24 0%, #1a1a3e 100%); border-radius: 16px; padding: 40px; text-align: center;">
              <h2 style="color: #f0f0f5; font-size: 20px; margin: 0 0 20px 0;">${heading}</h2>
              <div style="background: rgba(6, 182, 212, 0.1); border: 2px solid rgba(6, 182, 212, 0.3); border-radius: 12px; padding: 24px; margin: 20px 0;">
                <span style="font-family: monospace; font-size: 32px; font-weight: bold; color: #06b6d4; letter-spacing: 6px;">${code}</span>
              </div>
              <p style="color: #a0a0b8; font-size: 14px; margin: 20px 0 0 0;">
                This code expires in <strong>15 minutes</strong>.
              </p>
            </div>
            <div style="margin-top: 30px; text-align: center;">
              <p style="color: #666; font-size: 13px;">
                If you didn't request this code, you can safely ignore this email.
              </p>
            </div>
          </div>
        `,
      }),
    });

    return response.ok;
  } catch (error) {
    console.error('Email send error:', error);
    return false;
  }
}
