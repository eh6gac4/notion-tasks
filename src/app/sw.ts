import { defaultCache } from "@serwist/next/worker"
import type { PrecacheEntry, SerwistGlobalConfig } from "serwist"
import { Serwist } from "serwist"

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined
  }
}

declare const self: WorkerGlobalScope

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: false, // バナーからの手動更新を維持するため
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: defaultCache,
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
