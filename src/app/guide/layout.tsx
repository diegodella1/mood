import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: "How to Play Global Pulse — Beginner's Guide",
  description:
    'Everything you need to know: windows, streaks, XP, leaderboards, and how to get started with Global Pulse.',
  alternates: { canonical: '/guide' },
};

export default function GuideLayout({ children }: { children: React.ReactNode }) {
  return children;
}
