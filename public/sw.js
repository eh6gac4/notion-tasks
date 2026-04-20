const CACHE_NAME = "notion-tasks-v1"
const STATIC_CACHE_NAME = "notion-tasks-static-v1"

// Static assets that can be cached long-term (content-hashed filenames)
const STATIC_ORIGINS_PATTERNS = [
  /\/_next\/static\//,
  /\/icons\//,
]

self.addEventListener("install", (event) => {
  self.skipWaiting()
  event.waitUntil(caches.open(STATIC_CACHE_NAME))
})

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => k !== CACHE_NAME && k !== STATIC_CACHE_NAME)
          .map((k) => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  )
})

self.addEventListener("fetch", (event) => {
  const { request } = event
  const url = new URL(request.url)

  // Only handle same-origin requests and GET
  if (request.method !== "GET" || url.origin !== self.location.origin) return

  const isStatic = STATIC_ORIGINS_PATTERNS.some((p) => p.test(url.pathname))

  if (isStatic) {
    // Cache-first: static assets have content hashes, safe to cache forever
    event.respondWith(
      caches.open(STATIC_CACHE_NAME).then(async (cache) => {
        const cached = await cache.match(request)
        if (cached) return cached
        const response = await fetch(request)
        if (response.ok) cache.put(request, response.clone())
        return response
      })
    )
    return
  }

  // Network-first for navigation and dynamic routes (tasks data must be fresh)
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(() =>
        caches.open(CACHE_NAME).then((cache) => cache.match("/") ?? Response.error())
      )
    )
    return
  }

  // Icon and font files: cache-first
  if (url.pathname.startsWith("/icon") || url.pathname.includes("font")) {
    event.respondWith(
      caches.open(STATIC_CACHE_NAME).then(async (cache) => {
        const cached = await cache.match(request)
        if (cached) return cached
        const response = await fetch(request)
        if (response.ok) cache.put(request, response.clone())
        return response
      })
    )
  }
})
