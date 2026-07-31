"use client"

import { createContext, useContext, useEffect, useState } from "react"

export type AppSettings = {
  debugVisible: boolean
}

// 通常利用時はデバッグ UI を見せたくないので、初期値は OFF。
// ユーザーが設定で ON にした場合は localStorage で永続化される。
const DEFAULT_SETTINGS: AppSettings = { debugVisible: false }
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
      // eslint-disable-next-line react-hooks/set-state-in-effect
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
