import { defaultCache } from "@serwist/next/worker"
import type { PrecacheEntry, RuntimeCaching, SerwistGlobalConfig } from "serwist"
import { NetworkOnly, Serwist } from "serwist"

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined
  }
}

declare const self: WorkerGlobalScope

// OAuth のリダイレクト経路をキャッシュ層から外す。@serwist/next の defaultCache は
// /api/ の GET を丸ごと NetworkFirst("apis" キャッシュ)に載せるが、この経路は
// Set-Cookie 付きの 307 で state を受け渡すため、キャッシュに一切関わらせてはいけない。
// defaultCache より前に置く(先にマッチしたルートが勝つ)。
// /api/ 全体ではなく /api/google/ に限るのは、/api/file/・/api/icon/ は
// キャッシュの恩恵があるため。defaultCache が /api/auth/ だけを NetworkOnly に
// している粒度に合わせている。
const oauthPassthrough: RuntimeCaching = {
  matcher: ({ sameOrigin, url: { pathname } }) => sameOrigin && pathname.startsWith("/api/google/"),
  handler: new NetworkOnly(),
}

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: false, // バナーからの手動更新を維持するため
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: [oauthPassthrough, ...defaultCache],
  // オフライン時にページ遷移が失敗した場合、ブラウザ標準のエラー画面ではなく /offline を返す。
  // /offline は force-static なのでプリキャッシュに含まれる。
  fallbacks: {
    entries: [
      {
        url: "/offline",
        matcher: ({ request }) => request.destination === "document",
      },
    ],
  },
})

serwist.addEventListeners()
