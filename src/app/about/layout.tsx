import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'About Global Pulse — Real-Time World Mood Tracker',
  description:
    'Learn how Global Pulse works: a free mood tracker game where millions share their feelings 3 times a day via emoji check-ins.',
  alternates: { canonical: '/about' },
};

export default function AboutLayout({ children }: { children: React.ReactNode }) {
  return children;
}
