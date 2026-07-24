import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  allowedDevOrigins: ["192.168.1.6"],
  // Prevent Next.js from redirecting trailing-slash API URLs (308).
  // Django uses APPEND_SLASH=True — all endpoints require trailing slashes.
  // The route handler at app/api/[...slug]/route.ts normalizes the path before proxying.
  trailingSlash: true,
  experimental: {
    cpus: 1,
  },
  // Framework-level CORS — applied to all /api/ responses.
  async headers() {
    return [
      {
        source: "/api/:path*",
        headers: [
          { key: "Access-Control-Allow-Origin", value: "*" },
          { key: "Access-Control-Allow-Methods", value: "GET, POST, PUT, DELETE, PATCH, OPTIONS" },
          { key: "Access-Control-Allow-Headers", value: "Content-Type, Authorization, X-Requested-With, Accept" },
        ],
      },
    ];
  },
};

export default nextConfig;
