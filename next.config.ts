import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow fetching from localhost APIs during development
  images: { unoptimized: true },
};

export default nextConfig;
