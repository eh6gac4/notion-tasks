import type { NextConfig } from "next"
import { execSync } from "node:child_process"
import { readFileSync } from "node:fs"
import withSerwistInit from "@serwist/next"

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
}

// @serwist/next は webpack プラグインのため、Turbopack ビルドでは黙って無視され
// public/sw.js が生成されない(= PWA のプリキャッシュ・オフライン・更新バナーが全て無効になる)。
// このため package.json の build は `next build --webpack` を指定している。
//
// これは暫定対応。--webpack は非推奨化の予定があり、外れると PWA が再び無言で壊れる。
// また dev は Turbopack のままなので dev と本番でバンドラが異なる点にも注意。
// 恒久対応は Serwist 側の Turbopack 対応(@serwist/turbopack もしくは configurator mode)への移行。
// 追跡: https://github.com/serwist/serwist/issues/54
const withSerwist = withSerwistInit({
  swSrc: "src/app/sw.ts",
  swDest: "public/sw.js",
  register: false,
  reloadOnOnline: false,
  // プリキャッシュ manifest にはビルド成果物しか載らず、描画済みページの HTML は含まれない。
  // sw.ts の fallbacks が /offline をプリキャッシュから引くため、明示的に追加する。
  // revision は毎ビルド更新して古い HTML が残らないようにする。
  additionalPrecacheEntries: [{ url: "/offline", revision: buildTime }],
})

export default withSerwist(nextConfig)
