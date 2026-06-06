import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'export',
  images: { unoptimized: true },
  productionBrowserSourceMaps: false,
  trailingSlash: true,

  turbopack: {},

  experimental: {
    optimizePackageImports: ['lucide-react', 'recharts', '@tanstack/react-query-devtools'],
  },
};

export default nextConfig;
