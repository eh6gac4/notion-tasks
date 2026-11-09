"use client"

import { useSyncExternalStore } from "react"
import { browserSupportsWebAuthn } from "@simplewebauthn/browser-v13"

const subscribe = () => () => {}
const snapshot = () => browserSupportsWebAuthn() && window.isSecureContext
const serverSnapshot = () => false

export function usePasskeySupport() {
  return useSyncExternalStore(subscribe, snapshot, serverSnapshot)
}
