import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Leaderboard — Top Streaks & Cities',
  description:
    'See who has the longest mood streaks and which cities are most active on Global Pulse.',
  alternates: { canonical: '/leaderboard' },
};

export default function LeaderboardLayout({ children }: { children: React.ReactNode }) {
  return children;
}
