import type { NextConfig } from "next";

const BACKEND = process.env.BACKEND_URL ?? 'http://localhost:5235'

const nextConfig: NextConfig = {
  images: { unoptimized: true },
  productionBrowserSourceMaps: false,

  // Acknowledge Turbopack as the bundler (default in Next.js 16)
  turbopack: {},

  experimental: {
    optimizePackageImports: ['lucide-react', 'recharts', '@tanstack/react-query-devtools'],
  },

  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${BACKEND}/api/:path*`,
      },
    ]
  },
};

export default nextConfig;
