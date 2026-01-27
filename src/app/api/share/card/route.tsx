import { ImageResponse } from 'next/og';
import { NextRequest } from 'next/server';

export const runtime = 'edge';

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;

  const emoji = searchParams.get('emoji') || '🌍';
  const streak = parseInt(searchParams.get('streak') || '0', 10);
  const aura = searchParams.get('aura') || '';
  const cityMatch = searchParams.get('cityMatch');
  const city = searchParams.get('city');
  const active = searchParams.get('active');
  const rank = searchParams.get('rank');
  const displayName = searchParams.get('name') || 'Anonymous';
  const type = searchParams.get('type') || 'pulse'; // pulse, streak, badge, leaderboard

  // Aura colors
  const auraGradients: Record<string, string[]> = {
    fire: ['#FF6B35', '#F7931A'],
    lightning: ['#FFD700', '#FFA500'],
    diamond: ['#00D4FF', '#7B68EE'],
    default: ['#06B6D4', '#8B5CF6'],
  };

  const gradient = auraGradients[aura] || auraGradients.default;

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
          background: `linear-gradient(135deg, #0a0a1a 0%, #1a1a3a 50%, #0a0a1a 100%)`,
          fontFamily: 'system-ui, sans-serif',
        }}
      >
        {/* Glow effect behind main content */}
        <div
          style={{
            position: 'absolute',
            width: '300px',
            height: '300px',
            background: `radial-gradient(circle, ${gradient[0]}40 0%, transparent 70%)`,
            borderRadius: '50%',
            filter: 'blur(60px)',
          }}
        />

        {/* Card container */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            padding: '60px 80px',
            borderRadius: '32px',
            background: 'rgba(255, 255, 255, 0.05)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            backdropFilter: 'blur(20px)',
          }}
        >
          {/* Type-specific content */}
          {type === 'pulse' && (
            <>
              {/* Emoji */}
              <div style={{ fontSize: 120, marginBottom: 20 }}>{emoji}</div>

              {/* User info */}
              <div
                style={{
                  fontSize: 24,
                  color: 'rgba(255, 255, 255, 0.7)',
                  marginBottom: 8,
                }}
              >
                {displayName}
              </div>

              {/* City match if available */}
              {cityMatch && city && (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    fontSize: 20,
                    color: gradient[0],
                    marginBottom: 16,
                  }}
                >
                  <span>{cityMatch}% of {city}</span>
                </div>
              )}

              {/* Streak with aura */}
              {streak > 0 && (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    padding: '12px 24px',
                    borderRadius: '16px',
                    background: `linear-gradient(90deg, ${gradient[0]}30, ${gradient[1]}30)`,
                    border: `1px solid ${gradient[0]}50`,
                  }}
                >
                  <span style={{ fontSize: 32, fontWeight: 'bold', color: 'white' }}>
                    {streak}
                  </span>
                  <span style={{ fontSize: 18, color: 'rgba(255,255,255,0.7)' }}>
                    day streak
                  </span>
                  {aura && auraIcons[aura] && (
                    <span style={{ fontSize: 28 }}>{auraIcons[aura]}</span>
                  )}
                </div>
              )}
            </>
          )}

          {type === 'streak' && (
            <>
              {/* Big streak number */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'baseline',
                  gap: 8,
                }}
              >
                <span
                  style={{
                    fontSize: 140,
                    fontWeight: 'bold',
                    background: `linear-gradient(135deg, ${gradient[0]}, ${gradient[1]})`,
                    backgroundClip: 'text',
                    color: 'transparent',
                  }}
                >
                  {streak}
                </span>
                <span style={{ fontSize: 40, color: 'rgba(255,255,255,0.7)' }}>days</span>
              </div>

              {/* Aura badge */}
              {aura && auraIcons[aura] && (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    marginTop: 20,
                    padding: '12px 32px',
                    borderRadius: '20px',
                    background: `linear-gradient(90deg, ${gradient[0]}40, ${gradient[1]}40)`,
                    border: `2px solid ${gradient[0]}`,
                  }}
                >
                  <span style={{ fontSize: 36 }}>{auraIcons[aura]}</span>
                  <span
                    style={{
                      fontSize: 24,
                      fontWeight: 'bold',
                      color: 'white',
                      textTransform: 'uppercase',
                      letterSpacing: 2,
                    }}
                  >
                    {aura} aura
                  </span>
                </div>
              )}
            </>
          )}

          {type === 'leaderboard' && rank && (
            <>
              {/* Rank */}
              <div
                style={{
                  fontSize: 24,
                  color: 'rgba(255,255,255,0.5)',
                  textTransform: 'uppercase',
                  letterSpacing: 4,
                  marginBottom: 8,
                }}
              >
                Ranked
              </div>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'baseline',
                }}
              >
                <span style={{ fontSize: 32, color: gradient[0] }}>#</span>
                <span
                  style={{
                    fontSize: 100,
                    fontWeight: 'bold',
                    background: `linear-gradient(135deg, ${gradient[0]}, ${gradient[1]})`,
                    backgroundClip: 'text',
                    color: 'transparent',
                  }}
                >
                  {rank}
                </span>
              </div>
              {city && (
                <div style={{ fontSize: 28, color: 'white', marginTop: 8 }}>in {city}</div>
              )}
            </>
          )}

          {/* Social proof */}
          {active && parseInt(active, 10) > 100 && (
            <div
              style={{
                marginTop: 24,
                fontSize: 16,
                color: 'rgba(255,255,255,0.5)',
              }}
            >
              {parseInt(active, 10) > 1000
                ? `${(parseInt(active, 10) / 1000).toFixed(1)}K`
                : active}{' '}
              people feeling the pulse today
            </div>
          )}
        </div>

        {/* Branding */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            marginTop: 40,
          }}
        >
          <span style={{ fontSize: 28 }}>🌍</span>
          <span
            style={{
              fontSize: 24,
              fontWeight: 'bold',
              background: `linear-gradient(90deg, ${gradient[0]}, ${gradient[1]})`,
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
      width: 600,
      height: 600,
    }
  );
}
