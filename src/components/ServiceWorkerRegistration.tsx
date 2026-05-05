"use client"

import { useEffect, useState } from "react"

export default function ServiceWorkerRegistration() {
  const [waiting, setWaiting] = useState<ServiceWorker | null>(null)

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return

    // 初回インストール時は controllerchange でリロードしない（既存コントローラーがある時のみ更新リロード）
    const hadController = !!navigator.serviceWorker.controller
    let registration: ServiceWorkerRegistration | undefined
    let reloading = false

    const trackInstalling = (installing: ServiceWorker | null) => {
      if (!installing) return
      installing.addEventListener("statechange", () => {
        // 既に controller がある = 更新版（初回インストールではない）
        if (installing.state === "installed" && navigator.serviceWorker.controller) {
          setWaiting(installing)
        }
      })
    }

    const onControllerChange = () => {
      if (!hadController || reloading) return
      reloading = true
      window.location.reload()
    }

    // iOS PWA はバックグラウンド復帰時に SW を自動チェックしないため強制更新
    const onVisibilityChange = () => {
      if (document.visibilityState !== "visible") return
      registration?.update().catch(() => {})
    }

    navigator.serviceWorker.addEventListener("controllerchange", onControllerChange)
    document.addEventListener("visibilitychange", onVisibilityChange)

    navigator.serviceWorker
      .register("/sw.js", { scope: "/", updateViaCache: "none" })
      .then((reg) => {
        registration = reg
        if (reg.waiting && navigator.serviceWorker.controller) setWaiting(reg.waiting)
        trackInstalling(reg.installing)
        reg.addEventListener("updatefound", () => trackInstalling(reg.installing))
      })
      .catch(() => {})

    return () => {
      navigator.serviceWorker.removeEventListener("controllerchange", onControllerChange)
      document.removeEventListener("visibilitychange", onVisibilityChange)
    }
  }, [])

  if (!waiting) return null

  return (
    <div
      role="alert"
      data-testid="sw-update-banner"
      style={{
        position: "fixed",
        bottom: "16px",
        left: "16px",
        right: "16px",
        zIndex: 9999,
        background: "rgba(16, 0, 10, 0.95)",
        border: "1px solid #dc143c",
        boxShadow: "0 0 16px #dc143c, inset 0 0 16px rgba(220,20,60,0.1)",
        color: "#dc143c",
        padding: "12px 16px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: "12px",
        fontSize: "12px",
        letterSpacing: "0.1em",
      }}
    >
      <span>新しいバージョンが利用可能です</span>
      <button
        type="button"
        onClick={() => waiting.postMessage({ type: "SKIP_WAITING" })}
        style={{
          background: "#dc143c",
          color: "#10000a",
          border: "none",
          padding: "8px 16px",
          fontSize: "12px",
          fontWeight: "bold",
          letterSpacing: "0.15em",
          cursor: "pointer",
        }}
      >
        更新
      </button>
    </div>
  )
}
