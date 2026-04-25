"use client"

import { useEffect } from "react"

export default function ServiceWorkerRegistration() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return

    // 初回インストール時は controllerchange でリロードしない（既存コントローラーがある時のみ更新リロード）
    const hadController = !!navigator.serviceWorker.controller

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

    // 新しい SW が制御を引き継いだらページをリロード（初回インストール除く）
    const onControllerChange = () => { if (hadController) window.location.reload() }
    navigator.serviceWorker.addEventListener("controllerchange", onControllerChange)
    return () => navigator.serviceWorker.removeEventListener("controllerchange", onControllerChange)
  }, [])
  return null
}
