import { cookies } from "next/headers"
import { auth, signOut } from "@/auth"
import { TaskManager } from "@/components/TaskManager"
import { HydrationCheck } from "@/components/HydrationCheck"
import { Settings } from "@/components/Settings"
import { parseAdvancedFilter } from "@/constants/filters"
import { parseSortConfig } from "@/lib/task-sort"

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const cookieStore = await cookies()
  const advancedRaw = cookieStore.get("filter_advanced")?.value
  let advancedFilter
  try {
    advancedFilter = parseAdvancedFilter(advancedRaw ? JSON.parse(advancedRaw) : null)
  } catch {
    advancedFilter = parseAdvancedFilter(null)
  }
  const sortRaw = cookieStore.get("sort")?.value
  let initialSort
  try {
    initialSort = parseSortConfig(sortRaw ? JSON.parse(sortRaw) : null)
  } catch {
    initialSort = parseSortConfig(null)
  }
  const { task: taskParam } = await searchParams
  const initialTaskId = typeof taskParam === "string" ? taskParam : null

  const session = await auth()

  return (
    <div className="flex flex-col h-full">
      <header className="sticky top-0 z-20 bg-[var(--bg)] border-b border-[var(--border)]">
        <div className="flex items-center justify-between px-4 h-14">
          <h1 className="font-pixel text-sm font-bold text-[var(--accent)] accent-glow-text-sm tracking-widest uppercase">
            ✦ To-do
          </h1>
          <div className="flex items-center gap-4">
            <span className="text-xs text-[var(--text-dim)]">{session?.user?.name}</span>
            <Settings />
            <form action={async () => { "use server"; await signOut({ redirectTo: "/login" }) }} className="flex items-center">
              <button
                type="submit"
                className="text-xs text-[var(--text-dim)] hover:text-[var(--accent)] transition-colors"
              >
                logout
              </button>
            </form>
          </div>
        </div>
      </header>

      <HydrationCheck />
      <TaskManager initialAdvancedFilter={advancedFilter} initialSort={initialSort} initialTaskId={initialTaskId} />
    </div>
  )
}
