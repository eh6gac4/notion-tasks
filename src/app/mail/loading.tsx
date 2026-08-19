// /mail は認証と Gmail 取得を伴う動的ルートのため、loading.tsx が無いと
// Link の事前取得がスキップされ、クリックからページ表示まで無反応になる。
// メール画面と同じ 3 ペイン形状のスケルトンを置くことで、部分プリフェッチを有効にしつつ
// 遷移直後から最終レイアウトを見せる。
export default function MailLoading() {
  return (
    <div className="flex flex-col h-screen overflow-hidden bg-[var(--bg)] text-[var(--text)]">
      {/* Top Bar */}
      <header className="h-12 bg-[var(--surface)] border-b border-[var(--border)] px-4 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-4">
          <div className="h-3 w-12 bg-[var(--surface-2)] animate-pulse" />
          <span className="text-[var(--border-strong)]">|</span>
          <span className="text-sm font-pixel font-bold text-[var(--accent)] tracking-wider">
            ✦ NOTION MAIL
          </span>
        </div>
        <div className="h-3 w-20 bg-[var(--surface-2)] animate-pulse" />
      </header>

      <main className="flex flex-1 min-h-0 overflow-hidden">
        {/* Pane 1: Sidebar */}
        <aside className="hidden md:flex w-56 flex-shrink-0 bg-[var(--surface)] border-r border-[var(--border)] flex-col p-4 space-y-4">
          <div className="h-8 w-full bg-[var(--accent-dark)] animate-pulse" />
          <div className="space-y-2">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="flex items-center gap-2 py-2">
                <div className="w-4 h-4 bg-[var(--surface-2)] animate-pulse flex-shrink-0" />
                <div className="h-3 flex-1 bg-[var(--surface-2)] animate-pulse" />
              </div>
            ))}
          </div>
        </aside>

        {/* Pane 2: Email List */}
        <div className="w-full md:w-80 flex-shrink-0 bg-[var(--bg)] border-r border-[var(--border)] flex flex-col min-h-0">
          <div className="p-3 border-b border-[var(--border)] bg-[var(--surface)] space-y-2">
            <div className="h-8 w-full bg-[var(--bg)] border border-[var(--border-strong)] animate-pulse" />
            <div className="h-3 w-24 bg-[var(--surface-2)] animate-pulse" />
          </div>
          <div className="flex-1 overflow-hidden divide-y divide-[var(--border)]">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="p-3 border-l-4 border-transparent space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="h-3 bg-[var(--surface-2)] animate-pulse" style={{ width: `${40 + (i % 3) * 12}%` }} />
                  <div className="h-3 w-8 bg-[var(--surface)] animate-pulse flex-shrink-0" />
                </div>
                <div className="h-3 bg-[var(--surface-2)] animate-pulse" style={{ width: `${60 + (i % 4) * 8}%` }} />
                <div className="h-3 w-full bg-[var(--surface)] animate-pulse" />
              </div>
            ))}
          </div>
        </div>

        {/* Pane 3: Email Detail */}
        <div className="hidden md:flex flex-1 bg-[var(--surface)] flex-col items-center justify-center p-8">
          <div className="w-16 h-16 bg-[var(--surface-2)] border border-[var(--border-strong)] animate-pulse shadow-[4px_4px_0px_var(--accent-dark)]" />
        </div>
      </main>
    </div>
  )
}
