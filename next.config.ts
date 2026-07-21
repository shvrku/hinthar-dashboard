import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  allowedDevOrigins: ['192.168.1.6'],
  experimental: {
    cpus: 1,
  },
};

export default nextConfig;
