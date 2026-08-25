"use client"

export default function MailError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center h-screen px-8 text-center bg-[var(--bg)] text-[var(--text)]">
      <div className="font-pixel text-[var(--accent)] text-2xl font-bold tracking-[0.3em] mb-8 accent-glow-text-sm">
        ✦ MAIL ERROR
      </div>
      <p className="font-pixel text-sm text-[var(--text)] tracking-widest mb-4">
        — FAILED TO LOAD MAIL —
      </p>
      <p className="text-xs text-[var(--text-dim)] leading-relaxed max-w-xs mb-8">
        メールの取得に失敗しました。しばらく経ってからもう一度お試しください。
      </p>
      <button
        onClick={() => reset()}
        className="px-6 py-2 bg-[var(--accent-dark)] text-[var(--text)] text-sm font-bold border border-[var(--border-strong)] shadow-[4px_4px_0px_var(--accent-dark)] hover:brightness-110"
      >
        再試行
      </button>
    </div>
  )
}
