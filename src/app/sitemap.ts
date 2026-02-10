import type { MetadataRoute } from 'next';

const BASE = 'https://globalmood.vercel.app';

export default function sitemap(): MetadataRoute.Sitemap {
  const pages = ['/', '/about', '/guide', '/leaderboard', '/results', '/history'];

  return pages.map((path) => ({
    url: `${BASE}${path}`,
    lastModified: new Date(),
    changeFrequency: path === '/' ? 'hourly' : 'weekly',
    priority: path === '/' ? 1 : 0.7,
  }));
}
