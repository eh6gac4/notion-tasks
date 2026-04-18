"use client"

import { useEffect } from "react"

// 開発中のハイドレーション確認用（本番では何も表示しない）
export function HydrationCheck() {
  useEffect(() => {
    if (process.env.NODE_ENV === "development") {
      console.log("[HydrationCheck] React hydrated successfully")
    }
  }, [])

  return null
}
