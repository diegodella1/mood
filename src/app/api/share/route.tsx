import { ImageResponse } from 'next/og';
import { NextRequest } from 'next/server';

export const runtime = 'edge';

// Sanitize text input to prevent XSS
function sanitize(input: string, maxLength = 50): string {
  return input
    .replace(/[<>"'&]/g, '') // Remove potentially dangerous chars
    .slice(0, maxLength)
    .trim();
}

// Validate emoji (only allow actual emoji characters)
function isValidEmoji(str: string): boolean {
  const emojiRegex = /^[\p{Emoji}\u200d]+$/u;
  return emojiRegex.test(str) && str.length <= 10;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  // Get and sanitize parameters
  const rawEmoji = searchParams.get('emoji') || '😌';
  const emoji = isValidEmoji(rawEmoji) ? rawEmoji : '😌';
  const streak = Math.min(Math.max(parseInt(searchParams.get('streak') || '0', 10), 0), 9999);
  const rawAura = searchParams.get('aura') || '';
  const aura = ['fire', 'lightning', 'diamond', ''].includes(rawAura) ? rawAura : '';
  const cityMatch = sanitize(searchParams.get('cityMatch') || '', 5).replace(/\D/g, ''); // Only digits
  const city = sanitize(searchParams.get('city') || '', 30);

  // Aura colors
  const auraColors: Record<string, { bg: string; glow: string }> = {
    fire: { bg: 'linear-gradient(135deg, #fb923c 0%, #ef4444 100%)', glow: '#fb923c' },
    lightning: { bg: 'linear-gradient(135deg, #facc15 0%, #fb923c 100%)', glow: '#facc15' },
    diamond: { bg: 'linear-gradient(135deg, #93c5fd 0%, #c4b5fd 50%, #93c5fd 100%)', glow: '#93c5fd' },
  };

  const auraStyle = auraColors[aura] || null;

  // Aura icons
  const auraIcons: Record<string, string> = {
    fire: '🔥',
    lightning: '⚡',
    diamond: '💎',
  };

  return new ImageResponse(
    (
      <div
        style={{
          height: '100%',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#050510',
          backgroundImage:
            'radial-gradient(ellipse 80% 50% at 20% -20%, rgba(6, 182, 212, 0.15) 0%, transparent 50%), radial-gradient(ellipse 60% 40% at 80% 100%, rgba(139, 92, 246, 0.12) 0%, transparent 50%)',
        }}
      >
        {/* Card */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '60px 80px',
            borderRadius: '32px',
            backgroundColor: 'rgba(15, 15, 36, 0.9)',
            border: '2px solid rgba(6, 182, 212, 0.3)',
            boxShadow: auraStyle
              ? `0 0 60px -10px ${auraStyle.glow}`
              : '0 0 60px -10px rgba(6, 182, 212, 0.5)',
          }}
        >
          {/* Emoji */}
          <div
            style={{
              fontSize: 120,
              marginBottom: 20,
            }}
          >
            {emoji}
          </div>

          {/* "I'm feeling" text */}
          <div
            style={{
              fontSize: 28,
              color: '#a0a0b8',
              marginBottom: 8,
            }}
          >
            I&apos;m feeling
          </div>

          {/* Streak with aura */}
          {streak > 0 && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 16,
                marginTop: 30,
                padding: '16px 32px',
                borderRadius: '20px',
                background: auraStyle?.bg || 'rgba(22, 22, 51, 0.8)',
                boxShadow: auraStyle ? `0 0 30px -5px ${auraStyle.glow}` : 'none',
              }}
            >
              {aura && auraIcons[aura] && (
                <span style={{ fontSize: 36 }}>{auraIcons[aura]}</span>
              )}
              <span
                style={{
                  fontSize: 48,
                  fontWeight: 'bold',
                  color: '#f0f0f5',
                  fontFamily: 'monospace',
                }}
              >
                {streak}
              </span>
              <span
                style={{
                  fontSize: 24,
                  color: '#a0a0b8',
                }}
              >
                day streak
              </span>
            </div>
          )}

          {/* City match */}
          {cityMatch && city && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                marginTop: 24,
                fontSize: 22,
                color: '#a0a0b8',
              }}
            >
              <span>Matched with</span>
              <span style={{ color: '#06b6d4', fontWeight: 'bold' }}>{cityMatch}%</span>
              <span>of {city}</span>
            </div>
          )}
        </div>

        {/* Logo / Branding */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            marginTop: 40,
          }}
        >
          <span style={{ fontSize: 24, color: '#606080' }}>🌍</span>
          <span
            style={{
              fontSize: 24,
              fontWeight: 'bold',
              background: 'linear-gradient(135deg, #06b6d4 0%, #14b8a6 50%, #8b5cf6 100%)',
              backgroundClip: 'text',
              color: 'transparent',
            }}
          >
            Global Pulse
          </span>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    }
  );
}
