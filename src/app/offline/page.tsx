export const dynamic = "force-static"

export default function OfflinePage() {
  return (
    <div className="flex flex-col items-center justify-center h-full px-8 text-center">
      <div className="font-pixel text-[var(--accent)] text-2xl font-bold tracking-[0.3em] mb-8 accent-glow-text-sm">
        ✦ OFFLINE
      </div>
      <p className="font-pixel text-sm text-[var(--text)] tracking-widest mb-4">
        — NETWORK UNREACHABLE —
      </p>
      <p className="text-xs text-[var(--text-dim)] leading-relaxed max-w-xs">
        ネットワーク接続を確認してから、もう一度開き直してください。
      </p>
    </div>
  )
}
