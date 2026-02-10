import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'Global Pulse — How Is the World Feeling?';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function OgImage() {
  return new ImageResponse(
    (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          width: '100%',
          height: '100%',
          background: 'linear-gradient(135deg, #050510 0%, #1a1040 50%, #050510 100%)',
          color: '#fff',
          fontFamily: 'sans-serif',
        }}
      >
        <div style={{ fontSize: 120, marginBottom: 16 }}>🌍</div>
        <div
          style={{
            fontSize: 64,
            fontWeight: 800,
            letterSpacing: '-0.02em',
            marginBottom: 12,
          }}
        >
          Global Pulse
        </div>
        <div
          style={{
            fontSize: 28,
            opacity: 0.8,
            maxWidth: 700,
            textAlign: 'center',
          }}
        >
          Pick an emoji. Build streaks. See how the world feels.
        </div>
      </div>
    ),
    { ...size },
  );
}
