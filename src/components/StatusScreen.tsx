import type { ReactNode } from "react"

// オフライン・エラー・再認可要求など、画面全体を占有して状態を伝える
// 「フルスクリーンメッセージ」の共通レイアウト。src/app/offline/page.tsx,
// src/app/mail/error.tsx, src/app/mail/GoogleReauthScreen.tsx で共有する。
export function StatusScreen({
  title,
  subtitle,
  message,
  action,
  fullHeight = true,
}: {
  title: string
  subtitle: string
  message: ReactNode
  action?: { label: string; href: string } | { label: string; onClick: () => void }
  fullHeight?: boolean
}) {
  const actionClassName =
    "px-6 py-2 bg-[var(--accent-dark)] text-[var(--text)] text-sm font-bold border border-[var(--border-strong)] shadow-[4px_4px_0px_var(--accent-dark)] hover:brightness-110"

  return (
    <div
      className={`flex flex-col items-center justify-center ${fullHeight ? "h-screen" : "h-full"} px-8 text-center bg-[var(--bg)] text-[var(--text)]`}
    >
      <div className="font-pixel text-[var(--accent)] text-2xl font-bold tracking-[0.3em] mb-8 accent-glow-text-sm">
        {title}
      </div>
      <p className="font-pixel text-sm text-[var(--text)] tracking-widest mb-4">{subtitle}</p>
      <p className={`text-xs text-[var(--text-dim)] leading-relaxed max-w-xs ${action ? "mb-8" : ""}`}>{message}</p>
      {action && "href" in action ? (
        <a href={action.href} className={actionClassName}>
          {action.label}
        </a>
      ) : action ? (
        <button onClick={action.onClick} className={actionClassName}>
          {action.label}
        </button>
      ) : null}
    </div>
  )
}
