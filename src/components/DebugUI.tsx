"use client"

import { useSettings } from "./SettingsContext"
import { VersionTag } from "./VersionTag"
import { DebugPanel } from "./DebugPanel"

// settings.debugVisible に応じて VersionTag / DebugPanel をまるごとマウント切り替えする。
// DebugPanel は window.fetch を monkey-patch するため、OFF 時は完全にアンマウントして
// パッチも取り外す。
export function DebugUI() {
  const { settings } = useSettings()
  if (!settings.debugVisible) return null
  return (
    <>
      <VersionTag />
      <DebugPanel />
    </>
  )
}
