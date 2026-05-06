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

      <div className="bg-[var(--bg)] border-b border-[var(--border)] px-4 py-3">
        <div className="h-10 w-full bg-[var(--surface)] rounded-lg animate-pulse" />
      </div>

      <div className="flex-1 overflow-hidden">
        <div className="max-w-2xl mx-auto">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="px-4 py-4 border-b border-[var(--border)]">
              <div
                className="h-4 bg-[var(--surface-2)] rounded animate-pulse mb-3"
                style={{ width: `${65 + (i % 3) * 12}%` }}
              />
              <div className="flex gap-2">
                <div className="h-5 w-14 bg-[var(--surface)] rounded-full animate-pulse" />
                <div className="h-5 w-10 bg-[var(--surface)] rounded-full animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
