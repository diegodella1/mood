import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Optimize package imports to avoid barrel file overhead
  // This transforms barrel imports to direct imports at build time
  experimental: {
    optimizePackageImports: [
      'recharts',
      'date-fns',
      'date-fns-tz',
      'emoji-picker-react',
      '@supabase/supabase-js',
    ],
  },

  // Enable React strict mode for better development warnings
  reactStrictMode: true,

  // Optimize images
  images: {
    formats: ['image/avif', 'image/webp'],
  },
};

export default nextConfig;
