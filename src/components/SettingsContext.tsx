"use client"

import { createContext, useContext, useEffect, useState } from "react"

export type AppSettings = {
  debugVisible: boolean
}

// 既存挙動を維持するため、初期値は debug 表示 ON。
const DEFAULT_SETTINGS: AppSettings = { debugVisible: true }
const STORAGE_KEY = "app-settings"

type SettingsContextValue = {
  settings: AppSettings
  update: (patch: Partial<AppSettings>) => void
}

const SettingsContext = createContext<SettingsContextValue>({
  settings: DEFAULT_SETTINGS,
  update: () => {},
})

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS)

  // SSR と初期描画は DEFAULT_SETTINGS で一致させ、ハイドレーション後に localStorage から読み込む。
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (!raw) return
      const parsed = JSON.parse(raw) as Partial<AppSettings>
      setSettings({ ...DEFAULT_SETTINGS, ...parsed })
    } catch {
      // パース失敗時はデフォルト維持
    }
  }, [])

  function update(patch: Partial<AppSettings>) {
    setSettings((prev) => {
      const next = { ...prev, ...patch }
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
      } catch {
        // 書き込み失敗時もメモリ上の state は更新する
      }
      return next
    })
  }

  return <SettingsContext.Provider value={{ settings, update }}>{children}</SettingsContext.Provider>
}

export function useSettings(): SettingsContextValue {
  return useContext(SettingsContext)
}
