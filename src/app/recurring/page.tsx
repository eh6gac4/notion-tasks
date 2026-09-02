import Link from "next/link"
import { RecurringManager } from "@/components/RecurringManager"
import { requireAuth } from "@/lib/require-auth"
import { fetchRecurringOptionsAction, listRecurringAction } from "./actions"

export default async function RecurringPage() {
  await requireAuth()

  const [rules, options] = await Promise.all([listRecurringAction(), fetchRecurringOptionsAction()])

  return (
    <div className="flex flex-col h-full">
      <header className="sticky top-0 z-20 bg-[var(--bg)] border-b border-[var(--border)] pt-[var(--safe-top)]">
        <div className="flex items-center justify-between px-4 lg:px-6 h-14">
          <h1 className="font-pixel text-sm font-bold text-[var(--accent)] accent-glow-text-sm tracking-widest uppercase">
            ✦ Recurring
          </h1>
          <Link
            href="/"
            className="inline-flex items-center h-9 px-2 text-xs font-mono text-[var(--text-dim)] hover:text-[var(--accent)] transition-colors"
          >
            tasks
          </Link>
        </div>
      </header>

      <RecurringManager
        initialRules={rules}
        tagOptions={options.tagOptions}
        locationOptions={options.locationOptions}
      />
    </div>
  )
}
