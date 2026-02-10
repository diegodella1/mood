import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Live Results — See How the World Feels Right Now',
  description:
    'Real-time mood results from around the globe. Explore trends by city, country, and time of day.',
  alternates: { canonical: '/results' },
};

export default function ResultsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
