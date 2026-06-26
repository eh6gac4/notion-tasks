import type { NextConfig } from "next"
import { execSync } from "node:child_process"
import { readFileSync } from "node:fs"

const pkg = JSON.parse(readFileSync("./package.json", "utf-8")) as { version: string }

let gitSha = "unknown"
try {
  gitSha = execSync("git rev-parse --short HEAD", { stdio: ["ignore", "pipe", "ignore"] })
    .toString()
    .trim()
} catch {
  // Cloudflare Workers/Pages のビルド環境などで git が無くても落とさない。
}

const buildTime = new Date().toISOString()

const nextConfig: NextConfig = {
  allowedDevOrigins: ["192.168.1.253"],
  devIndicators: false,
  env: {
    NEXT_PUBLIC_APP_VERSION: pkg.version,
    NEXT_PUBLIC_GIT_SHA: gitSha,
    NEXT_PUBLIC_BUILD_TIME: buildTime,
  },
  experimental: {
    // Disable persistent Turbopack cache — Docker paths differ from host paths,
    // causing stale cache entries and PostCSS worker timeouts.
    turbopackFileSystemCacheForDev: false,
    serverActions: {
      bodySizeLimit: "21mb",
    },
  },
  async headers() {
    return [
      {
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
