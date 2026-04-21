"use client"

import { useEffect } from "react"

export default function ServiceWorkerRegistration() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return

    navigator.serviceWorker
      .register("/sw.js", { scope: "/", updateViaCache: "none" })
      .then((registration) => {
        const checkUpdate = () => registration.update().catch(() => {})
        // iOS PWA はバックグラウンド復帰時に SW を自動チェックしないため強制更新
        document.addEventListener("visibilitychange", () => {
          if (document.visibilityState === "visible") checkUpdate()
        })
      })
      .catch(() => {})

    // 新しい SW が制御を引き継いだらページをリロード
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      window.location.reload()
    })
  }, [])
  return null
}
