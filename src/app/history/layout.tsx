import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Your Mood History — Track Your Feelings Over Time',
  description:
    'Review your past mood check-ins on a calendar, spot patterns, and unlock personal insights.',
  alternates: { canonical: '/history' },
};

export default function HistoryLayout({ children }: { children: React.ReactNode }) {
  return children;
}
