import { Suspense } from "react"
import { auth, signOut } from "@/auth"
import { getTasks } from "@/lib/notion"
import { FilterTabs } from "@/components/FilterTabs"
import { TaskManager } from "@/components/TaskManager"
import type { TaskStatus } from "@/types/task"

const FILTER_STATUSES: Record<string, TaskStatus[]> = {
  active: ["進行中", "未着手"],
  todo:   ["未着手"],
  doing:  ["進行中"],
  review: ["確認中"],
  paused: ["一時中断"],
  all:    ["未着手", "進行中", "確認中", "一時中断", "完了", "中止"],
}

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string }>
}) {
  const [session, { filter = "active" }] = await Promise.all([auth(), searchParams])
  const statuses = FILTER_STATUSES[filter] ?? FILTER_STATUSES.active
  const tasks = await getTasks({ statuses })

  return (
    <div className="flex flex-col h-full">
      <header className="sticky top-0 z-20 bg-white border-b border-gray-100">
        <div className="flex items-center justify-between px-4 h-14">
          <h1 className="text-base font-semibold text-gray-900">✅ To-do</h1>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-500">{session?.user?.name}</span>
            <form action={async () => { "use server"; await signOut({ redirectTo: "/login" }) }}>
              <button type="submit" className="text-sm text-gray-500 py-1">ログアウト</button>
            </form>
          </div>
        </div>
      </header>

      <div className="bg-white border-b border-gray-100">
        <Suspense fallback={<div className="h-12" />}>
          <FilterTabs initialFilter={filter} />
        </Suspense>
      </div>

      <TaskManager tasks={tasks} />
    </div>
  )
}
