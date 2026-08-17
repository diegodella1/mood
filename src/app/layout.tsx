import type { Metadata, Viewport } from 'next';
import { Sora, Plus_Jakarta_Sans, JetBrains_Mono } from 'next/font/google';
import './globals.css';
import { UserProvider } from '@/providers/UserProvider';
import { OneSignalProvider } from '@/providers/OneSignalProvider';
import { TourProvider } from '@/providers/TourProvider';
import { ConfigProvider } from '@/providers/ConfigProvider';
import { InstallPrompt } from '@/components/InstallPrompt';

// Display font - geometric, modern, distinctive
const sora = Sora({
  variable: '--font-display',
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
});

// Body font - warm, readable, professional
const plusJakarta = Plus_Jakarta_Sans({
  variable: '--font-body',
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
});

// Mono font - for timers and codes
const jetbrainsMono = JetBrains_Mono({
  variable: '--font-mono',
  subsets: ['latin'],
  weight: ['400', '500', '600'],
});

export const metadata: Metadata = {
  metadataBase: new URL('https://globalmood.vercel.app'),
  title: {
    default: 'Global Pulse — How Is the World Feeling?',
    template: '%s | Global Pulse',
  },
  description:
    'A real-time mood tracker game. Pick an emoji 3 times a day, build streaks, climb leaderboards, and see how the world feels right now.',
  keywords: [
    'mood tracker',
    'how is the world feeling',
    'daily emoji check-in',
    'mood tracker game',
    'global mood map',
    'real-time mood',
    'streak game',
    'casual game',
    'emoji game',
  ],
  category: 'games',
  manifest: '/manifest.json',
  alternates: { canonical: '/' },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Global Pulse',
  },
  openGraph: {
    title: 'Global Pulse — How Is the World Feeling?',
    description:
      'Pick an emoji, build streaks, and see how the planet feels in real time.',
    url: '/',
    siteName: 'Global Pulse',
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Global Pulse — How Is the World Feeling?',
    description:
      'Pick an emoji, build streaks, and see how the planet feels in real time.',
  },
};

export const viewport: Viewport = {
  themeColor: '#050510',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="apple-touch-icon" href="/icons/icon-192.svg" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'WebApplication',
              name: 'Global Pulse',
              url: 'https://globalmood.vercel.app',
              description:
                'A real-time mood tracker game. Pick an emoji 3 times a day, build streaks, climb leaderboards, and see how the world feels right now.',
              applicationCategory: 'GameApplication',
              operatingSystem: 'Any',
              offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
            }),
          }}
        />
      </head>
      <body
        className={`${sora.variable} ${plusJakarta.variable} ${jetbrainsMono.variable} antialiased min-h-screen`}
      >
        <div className="cosmic-bg" />
        <ConfigProvider>
          <UserProvider>
            <OneSignalProvider>
              <TourProvider>
                {children}
                <InstallPrompt />
              </TourProvider>
            </OneSignalProvider>
          </UserProvider>
        </ConfigProvider>
      </body>
    </html>
  );
}
