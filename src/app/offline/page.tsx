export const dynamic = "force-static"

export default function OfflinePage() {
  return (
    <div className="flex flex-col items-center justify-center h-full px-8 text-center">
      <div className="text-[#dc143c] text-2xl font-bold tracking-[0.3em] mb-8 cyber-glow-text">
        ✦ OFFLINE
      </div>
      <p className="text-sm text-[#ffbbcc] tracking-widest mb-4">
        — NETWORK UNREACHABLE —
      </p>
      <p className="text-xs text-[#996677] leading-relaxed max-w-xs">
        ネットワーク接続を確認してから、もう一度開き直してください。
      </p>
    </div>
  )
}
