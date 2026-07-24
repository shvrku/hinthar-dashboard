import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  allowedDevOrigins: ["192.168.1.6"],
  // Prevent Next.js from redirecting trailing-slash API URLs (308).
  // Django uses APPEND_SLASH=True — all endpoints require trailing slashes.
  // The route handler at app/api/[...slug]/route.ts normalizes the path before proxying.
  trailingSlash: true,
  // Next.js 16 streams metadata by default (injected via JS after page load).
  // Only a default bot whitelist gets blocking/static metadata. Telegram is NOT
  // in that list. Set to /.*/ to serve blocking metadata to ALL user agents so
  // OG tags are always present in the initial HTML for social previews.
  htmlLimitedBots: /.*/,
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
