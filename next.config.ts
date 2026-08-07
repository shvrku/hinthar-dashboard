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
  // PERF-M5: intentional tradeoff (slightly worse TTFB) for social OG reliability.
  htmlLimitedBots: /.*/,
  // Same-origin /api proxy — no cross-origin CORS headers required.
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "DENY" },
        ],
      },
    ];
  },
};

export default nextConfig;
