import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  allowedDevOrigins: ["192.168.1.6"],
  // Prevent Next.js from redirecting trailing-slash API URLs (308).
  // Django uses APPEND_SLASH=True — all endpoints require trailing slashes.
  // The route handler at app/api/[...slug]/route.ts normalizes the path before proxying.
  trailingSlash: true,
  // PERF: serve blocking metadata only to known social/link preview bots
  // (not every user agent — htmlLimitedBots: /.*/ was costing TTFB/CPU).
  htmlLimitedBots: /bot|crawl|spider|slurp|facebookexternalhit|Facebot|Twitterbot|LinkedInBot|Discordbot|TelegramBot|WhatsApp|SkypeUriPreview|Slackbot|embedly|Quora Link Preview|Showyoubot|outbrain|pinterest|vkShare|W3C_Validator/i,
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
