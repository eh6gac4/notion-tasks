export default function Loading() {
  return (
    <div className="flex flex-col h-full">
      <header className="sticky top-0 z-20 bg-[var(--bg)] border-b border-[var(--border)]">
        <div className="flex items-center justify-between px-4 h-14">
          <div className="h-3 w-16 bg-[var(--surface-2)] rounded animate-pulse" />
          <div className="h-3 w-20 bg-[var(--surface)] rounded animate-pulse" />
        </div>
      </header>

      <div className="h-0.5 bg-[var(--accent)] animate-pulse w-2/3" style={{ boxShadow: "0 0 6px rgba(220,20,60,0.45)" }} />

      <div className="bg-[var(--bg)] border-b border-[var(--border)] px-4 py-3 flex items-center gap-2">
        <div className="flex-1 h-9 bg-[var(--surface)] rounded-lg animate-pulse" />
        <div className="w-9 h-9 bg-[var(--surface)] rounded-lg animate-pulse" />
        <div className="w-9 h-9 bg-[var(--surface)] rounded-lg animate-pulse" />
        <div className="w-9 h-9 bg-[var(--surface)] rounded-lg animate-pulse" />
      </div>

      <div className="flex-1 overflow-hidden flex divide-x divide-[var(--border)]">
        {[...Array(3)].map((_, col) => (
          <div key={col} className="w-[360px] flex-shrink-0 flex flex-col">
            <div className="px-3 py-3 border-b border-[var(--border)] flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-[var(--surface-2)]" />
              <div className="h-3 w-16 bg-[var(--surface-2)] rounded animate-pulse" />
            </div>
            <div className="px-3 py-3 flex flex-col gap-2">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="rounded-md border border-[var(--border-strong)] bg-[var(--surface)] p-3">
                  <div
                    className="h-3 bg-[var(--surface-2)] rounded animate-pulse mb-2"
                    style={{ width: `${60 + ((col + i) % 3) * 12}%` }}
                  />
                  <div className="flex gap-1">
                    <div className="h-3 w-10 bg-[var(--surface-2)] rounded animate-pulse" />
                    <div className="h-3 w-8 bg-[var(--surface-2)] rounded animate-pulse" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
