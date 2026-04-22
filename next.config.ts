import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  allowedDevOrigins: ["192.168.1.253"],
  devIndicators: false,
  experimental: {
    // Disable persistent Turbopack cache — Docker paths differ from host paths,
    // causing stale cache entries and PostCSS worker timeouts.
    turbopackFileSystemCacheForDev: false,
  },
  async headers() {
    return [
      {
        // Hashed static assets — safe to cache indefinitely
        source: "/_next/static/:path*",
        headers: [
          { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
        ],
      },
      {
        // Public static files (SVG, icons, etc.) — cache for 1 day
        source: "/:path((?!sw\\.js$).*\\.(?:svg|ico|png|jpg|jpeg|webp|woff2?|ttf))",
        headers: [
          { key: "Cache-Control", value: "public, max-age=86400, stale-while-revalidate=604800" },
        ],
      },
      {
        // Service worker must never be cached
        source: "/sw.js",
        headers: [
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
          { key: "Content-Type", value: "application/javascript; charset=utf-8" },
        ],
      },
    ]
  },
}

export default nextConfig
