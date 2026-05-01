import { cookies } from "next/headers"
import { auth, signOut } from "@/auth"
import { getTasks, getTagOptions } from "@/lib/notion"
import { TaskManager } from "@/components/TaskManager"
import { HydrationCheck } from "@/components/HydrationCheck"
import { getQueryStatuses, parseAdvancedFilter } from "@/constants/filters"
import { parseSortConfig } from "@/lib/task-sort"

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const cookieStore = await cookies()
  const filter = cookieStore.get("filter")?.value ?? "active"
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

  const [session, tasks, tagOptions] = await Promise.all([
    auth(),
    getTasks({ statuses: getQueryStatuses(filter) }),
    getTagOptions(),
  ])

  return (
    <div className="flex flex-col h-full">
      <header className="sticky top-0 z-20 bg-[#10000a] border-b border-[rgba(220,20,60,0.3)]">
        <div className="flex items-center justify-between px-4 h-14">
          <h1 className="text-sm font-bold text-[#dc143c] cyber-glow-text tracking-widest uppercase">
            ✦ To-do
          </h1>
          <div className="flex items-center gap-4">
            <span className="text-xs text-[#996677]">{session?.user?.name}</span>
            <form action={async () => { "use server"; await signOut({ redirectTo: "/login" }) }} className="flex items-center">
              <button
                type="submit"
                className="text-xs text-[#996677] hover:text-[#dc143c] transition-colors"
              >
                logout
              </button>
            </form>
          </div>
        </div>
      </header>

      <HydrationCheck />
      <TaskManager tasks={tasks} tagOptions={tagOptions} currentFilter={filter} initialAdvancedFilter={advancedFilter} initialSort={initialSort} initialTaskId={initialTaskId} />
    </div>
  )
}
