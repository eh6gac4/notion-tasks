"use client"

import { useCallback, useEffect, useRef, useState } from "react"

// 全 fetch を monkey-patch して Next-Action ヘッダ付きの Server Action だけ拾う。
// 画像や SW などのノイズは Next-Action 不在で除外される。
type RequestLog = {
  id: number
  url: string
  method: string
  actionId: string
  durMs: number
  status: number
  ok: boolean
  startedAt: number
  pending: boolean
}

const MAX_LOGS = 20

function shortenUrl(url: string): string {
  try {
    const u = new URL(url, typeof window !== "undefined" ? window.location.origin : "http://localhost")
    return u.pathname + (u.search ? u.search : "")
  } catch {
    return url
  }
}

function formatTime(ts: number): string {
  const d = new Date(ts)
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}:${String(d.getSeconds()).padStart(2, "0")}`
}

export function DebugPanel() {
  const [logs, setLogs] = useState<RequestLog[]>([])
  const [open, setOpen] = useState(false)
  const idRef = useRef(0)

  useEffect(() => {
    if (typeof window === "undefined") return
    const origFetch = window.fetch.bind(window)

    const patched: typeof window.fetch = async (input, init) => {
      let urlStr = ""
      let method = "GET"
      let headers: Headers
      try {
        if (input instanceof Request) {
          urlStr = input.url
          method = input.method
          headers = new Headers(input.headers)
          if (init?.headers) {
            for (const [k, v] of new Headers(init.headers)) headers.set(k, v)
          }
        } else {
          urlStr = typeof input === "string" ? input : input.toString()
          method = init?.method ?? "GET"
          headers = new Headers(init?.headers ?? {})
        }
      } catch {
        return origFetch(input, init)
      }

      const actionId = headers.get("Next-Action") ?? headers.get("next-action")
      if (!actionId) return origFetch(input, init)

      const start = performance.now()
      const startedAt = Date.now()
      idRef.current += 1
      const id = idRef.current
      const actionShort = actionId.slice(0, 8)

      setLogs((prev) => {
        const next = [...prev, {
          id,
          url: urlStr,
          method,
          actionId: actionShort,
          durMs: 0,
          status: 0,
          ok: false,
          startedAt,
          pending: true,
        }]
        return next.length > MAX_LOGS ? next.slice(next.length - MAX_LOGS) : next
      })

      let status = 0
      let ok = false
      try {
        const res = await origFetch(input, init)
        status = res.status
        ok = res.ok
        return res
      } finally {
        const durMs = performance.now() - start
        setLogs((prev) => prev.map((l) => (
          l.id === id ? { ...l, durMs, status, ok, pending: false } : l
        )))
      }
    }

    window.fetch = patched
    return () => {
      window.fetch = origFetch
    }
  }, [])

  const clear = useCallback(() => setLogs((prev) => prev.filter((l) => l.pending)), [])

  const total = logs.length
  const completed = logs.filter((l) => !l.pending)
  const pendingCount = total - completed.length
  const maxDur = completed.length === 0 ? 0 : Math.round(completed.reduce((m, l) => Math.max(m, l.durMs), 0))
  const lastDur = completed.length === 0 ? 0 : Math.round(completed[completed.length - 1].durMs)

  return (
    <div
      data-testid="debug-panel"
      className="font-pixel"
      style={{
        position: "fixed",
        bottom: "12px",
        right: "12px",
        zIndex: 9999,
        fontSize: "10px",
        letterSpacing: "0.05em",
        color: "rgba(255, 255, 255, 0.85)",
      }}
    >
      {open ? (
        <div
          style={{
            background: "rgba(11, 0, 8, 0.92)",
            border: "1px solid rgba(220, 20, 60, 0.45)",
            borderRadius: "4px",
            padding: "8px",
            width: "320px",
            maxHeight: "240px",
            display: "flex",
            flexDirection: "column",
            gap: "4px",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingBottom: "4px", borderBottom: "1px solid rgba(220, 20, 60, 0.25)" }}>
            <span style={{ color: "#dc143c", fontWeight: "bold", letterSpacing: "0.15em" }}>
              ✦ DEBUG · {total} reqs{pendingCount > 0 ? ` · ${pendingCount} live` : ""} · max {maxDur}ms
            </span>
            <span style={{ display: "flex", gap: "8px" }}>
              <button
                type="button"
                onClick={clear}
                style={{ background: "transparent", border: "none", color: "rgba(255,255,255,0.55)", cursor: "pointer", fontSize: "10px", padding: 0 }}
                aria-label="ログをクリア"
              >
                clear
              </button>
              <button
                type="button"
                onClick={() => setOpen(false)}
                style={{ background: "transparent", border: "none", color: "rgba(255,255,255,0.55)", cursor: "pointer", fontSize: "10px", padding: 0 }}
                aria-label="パネルを閉じる"
              >
                ✕
              </button>
            </span>
          </div>
          <div style={{ overflowY: "auto", flex: 1, display: "flex", flexDirection: "column-reverse", gap: "2px" }}>
            {total === 0 ? (
              <div style={{ color: "rgba(255,255,255,0.4)", textAlign: "center", padding: "12px" }}>
                no server actions yet
              </div>
            ) : (
              logs.map((l) => (
                <div
                  key={l.id}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "44px 1fr 56px 12px",
                    gap: "6px",
                    alignItems: "center",
                    padding: "2px 4px",
                    borderRadius: "2px",
                    background: l.pending
                      ? "rgba(220, 20, 60, 0.10)"
                      : l.ok
                        ? "rgba(34, 197, 94, 0.08)"
                        : "rgba(220, 38, 38, 0.12)",
                  }}
                >
                  <span style={{ color: "rgba(255,255,255,0.45)" }}>{formatTime(l.startedAt)}</span>
                  <span
                    style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
                    title={`${l.method} ${l.url} (action ${l.actionId})`}
                  >
                    {l.method} #{l.actionId} <span style={{ opacity: 0.4 }}>{shortenUrl(l.url)}</span>
                  </span>
                  {l.pending ? (
                    <span style={{ textAlign: "right", color: "rgba(255,255,255,0.55)" }}>…</span>
                  ) : (
                    <span style={{ textAlign: "right", color: l.durMs > 1000 ? "#f59e0b" : "rgba(255,255,255,0.85)" }}>
                      {Math.round(l.durMs)}ms
                    </span>
                  )}
                  {l.pending ? (
                    <span
                      aria-label="リクエスト処理中"
                      style={{
                        display: "inline-block",
                        width: 8,
                        height: 8,
                        border: "1px solid rgba(220,20,60,0.35)",
                        borderTopColor: "#dc143c",
                        borderRadius: "50%",
                        animation: "_ss 0.6s linear infinite",
                      }}
                    />
                  ) : (
                    <span style={{ color: l.ok ? "#22c55e" : "#dc2626" }}>{l.ok ? "✓" : "✗"}</span>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="デバッグパネルを開く"
          style={{
            background: "rgba(11, 0, 8, 0.85)",
            border: "1px solid rgba(220, 20, 60, 0.35)",
            borderRadius: "4px",
            padding: "4px 8px",
            color: "rgba(255, 255, 255, 0.55)",
            fontFamily: "inherit",
            fontSize: "10px",
            letterSpacing: "0.1em",
            cursor: "pointer",
            display: "inline-flex",
            alignItems: "center",
            gap: "6px",
          }}
        >
          {pendingCount > 0 && (
            <span
              aria-label="リクエスト処理中"
              style={{
                display: "inline-block",
                width: 8,
                height: 8,
                border: "1px solid rgba(220,20,60,0.35)",
                borderTopColor: "#dc143c",
                borderRadius: "50%",
                animation: "_ss 0.6s linear infinite",
              }}
            />
          )}
          {total === 0 ? (
            "✦ debug"
          ) : pendingCount > 0 ? (
            <>
              {pendingCount} live <span style={{ opacity: 0.5, margin: "0 4px" }}>·</span> {total} req{total === 1 ? "" : "s"}
            </>
          ) : (
            <>
              {total} req{total === 1 ? "" : "s"} <span style={{ opacity: 0.5, margin: "0 4px" }}>·</span> last {lastDur}ms
            </>
          )}
        </button>
      )}
    </div>
  )
}
