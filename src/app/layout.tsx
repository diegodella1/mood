import type { Metadata, Viewport } from 'next';
import { Sora, Plus_Jakarta_Sans, JetBrains_Mono } from 'next/font/google';
import './globals.css';
import { UserProvider } from '@/providers/UserProvider';
import { OneSignalProvider } from '@/providers/OneSignalProvider';
import { TourProvider } from '@/providers/TourProvider';
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
  title: 'Global Pulse',
  description: 'Share your mood with the world. 3 times a day, see how the planet is feeling.',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Global Pulse',
  },
  openGraph: {
    title: 'Global Pulse',
    description: 'Share your mood with the world',
    type: 'website',
  },
};

export const viewport: Viewport = {
  themeColor: '#050510',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
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
      </head>
      <body
        className={`${sora.variable} ${plusJakarta.variable} ${jetbrainsMono.variable} antialiased min-h-screen`}
      >
        <div className="cosmic-bg" />
        <UserProvider>
          <OneSignalProvider>
            <TourProvider>
              {children}
              <InstallPrompt />
            </TourProvider>
          </OneSignalProvider>
        </UserProvider>
      </body>
    </html>
  );
}
