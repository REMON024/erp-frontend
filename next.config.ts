import type { NextConfig } from "next";

const BACKEND = process.env.BACKEND_URL ?? 'http://localhost:5235'

const nextConfig: NextConfig = {
  images: { unoptimized: true },
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
