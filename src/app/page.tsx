import { cookies } from "next/headers"
import { auth, signOut } from "@/auth"
import { getTasks } from "@/lib/notion"
import { TaskManager } from "@/components/TaskManager"
import { HydrationCheck } from "@/components/HydrationCheck"
import type { TaskStatus } from "@/types/task"

const FILTER_STATUSES: Record<string, TaskStatus[]> = {
  active: ["進行中", "未着手"],
  todo:   ["未着手"],
  doing:  ["進行中"],
  review: ["確認中"],
  paused: ["一時中断"],
  all:    ["未着手", "進行中", "確認中", "一時中断", "完了", "中止"],
}

export default async function Page() {
  const cookieStore = await cookies()
  const filter = cookieStore.get("filter")?.value ?? "active"

  const [session, tasks] = await Promise.all([
    auth(),
    getTasks({ statuses: FILTER_STATUSES[filter] ?? FILTER_STATUSES.active }),
  ])

  return (
    <div className="flex flex-col h-full">
      <header className="sticky top-0 z-20 bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800">
        <div className="flex items-center justify-between px-4 h-14">
          <h1 className="text-base font-semibold text-gray-900 dark:text-gray-100">✅ To-do</h1>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-500 dark:text-gray-400">{session?.user?.name}</span>
            <form action={async () => { "use server"; await signOut({ redirectTo: "/login" }) }}>
              <button type="submit" className="text-sm text-gray-500 dark:text-gray-400 py-1">ログアウト</button>
            </form>
          </div>
        </div>
      </header>

      <HydrationCheck />
      <TaskManager tasks={tasks} currentFilter={filter} />
    </div>
  )
}
