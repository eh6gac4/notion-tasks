const LIMIT = 5
const LOCKOUT_MS = 30 * 60 * 1000

type Entry = { count: number; lockedUntil: number | null }

const store = new Map<string, Entry>()

const DEV_IPS = new Set(["unknown", "127.0.0.1", "::1", "::ffff:127.0.0.1"])

export function checkRateLimit(ip: string): { blocked: boolean; remaining: number; unlocksAt: Date | null } {
  if (process.env.NODE_ENV !== "production" || DEV_IPS.has(ip)) {
    return { blocked: false, remaining: LIMIT, unlocksAt: null }
  }
  const now = Date.now()
  const entry = store.get(ip) ?? { count: 0, lockedUntil: null }

  if (entry.lockedUntil && now < entry.lockedUntil) {
    return { blocked: true, remaining: 0, unlocksAt: new Date(entry.lockedUntil) }
  }

  if (entry.lockedUntil && now >= entry.lockedUntil) {
    store.delete(ip)
  }

  return { blocked: false, remaining: LIMIT - entry.count, unlocksAt: null }
}

export function recordFailure(ip: string): { blocked: boolean; remaining: number } {
  if (process.env.NODE_ENV !== "production" || DEV_IPS.has(ip)) {
    return { blocked: false, remaining: LIMIT }
  }
  const now = Date.now()
  const entry = store.get(ip) ?? { count: 0, lockedUntil: null }
  const count = entry.count + 1

  if (count >= LIMIT) {
    store.set(ip, { count, lockedUntil: now + LOCKOUT_MS })
    return { blocked: true, remaining: 0 }
  }

  store.set(ip, { count, lockedUntil: null })
  return { blocked: false, remaining: LIMIT - count }
}

export function recordSuccess(ip: string) {
  store.delete(ip)
}
