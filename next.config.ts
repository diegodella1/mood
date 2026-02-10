import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',
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
