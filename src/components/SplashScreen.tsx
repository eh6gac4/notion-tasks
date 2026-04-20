"use client"

import { useEffect } from "react"

export function SplashScreen() {
  useEffect(() => {
    const el = document.getElementById("app-splash") as HTMLElement | null
    if (!el) return
    el.style.opacity = "0"
    const t = setTimeout(() => el.remove(), 300)
    return () => clearTimeout(t)
  }, [])
  return null
}
