"use client"

import { usePathname, useRouter } from "next/navigation"
import { useSwipeBack } from "@/hooks/useSwipeBack"

export function SwipeBackNavigation({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const swipeBackRef = useSwipeBack<HTMLDivElement>({
    onBack: () => {
      if (window.history.length > 1) router.back()
      else if (pathname !== "/") router.replace("/")
    },
    // ページ全体を transform すると固定ヘッダーやシートの配置基準が変わる。
    animate: false,
    pcBreakpoint: 1024,
  })

  return <div ref={swipeBackRef} className="h-full">{children}</div>
}
