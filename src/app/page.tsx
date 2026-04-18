import Link from "next/link"
import { auth, signOut } from "@/auth"
import { getTasks } from "@/lib/notion"
import { TaskItem } from "@/components/TaskItem"
import { TaskCreate } from "@/components/TaskCreate"
import type { TaskStatus } from "@/types/task"

const FILTERS: { label: string; key: string; statuses: TaskStatus[] }[] = [
  { label: "進行中・未着手", key: "active", statuses: ["進行中", "未着手"] },
  { label: "未着手",         key: "todo",   statuses: ["未着手"] },
  { label: "進行中",         key: "doing",  statuses: ["進行中"] },
  { label: "確認中",         key: "review", statuses: ["確認中"] },
  { label: "一時中断",       key: "paused", statuses: ["一時中断"] },
  { label: "すべて",         key: "all",    statuses: ["未着手", "進行中", "確認中", "一時中断", "完了", "中止"] },
]

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string }>
}) {
  const [session, { filter = "active" }] = await Promise.all([auth(), searchParams])
  const currentFilter = FILTERS.find((f) => f.key === filter) ?? FILTERS[0]
  const tasks = await getTasks({ statuses: currentFilter.statuses })

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <header className="sticky top-0 z-20 bg-white border-b border-gray-100 safe-top">
        <div className="flex items-center justify-between px-4 h-14">
          <h1 className="text-base font-semibold text-gray-900">✅ To-do</h1>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-500">{session?.user?.name}</span>
            <form action={async () => { "use server"; await signOut({ redirectTo: "/login" }) }}>
              <button type="submit" className="text-sm text-gray-500 py-1">
                ログアウト
              </button>
            </form>
          </div>
        </div>
      </header>

      {/* Filter tabs */}
      <div className="sticky top-14 z-10 bg-white border-b border-gray-100">
        <div className="flex gap-2 px-4 py-2.5 overflow-x-auto scrollbar-hide">
          {FILTERS.map((f) => (
            <Link
              key={f.key}
              href={`/?filter=${f.key}`}
              scroll={false}
              prefetch
              className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                f.key === currentFilter.key
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 text-gray-600 active:bg-gray-200"
              }`}
            >
              {f.label}
            </Link>
          ))}
        </div>
      </div>

      {/* Task list */}
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto">
          {tasks.length === 0 ? (
            <p className="text-center text-gray-400 text-sm py-20">タスクがありません</p>
          ) : (
            <ul className="divide-y divide-gray-100">
              {tasks.map((task) => (
                <li key={task.id}>
                  <TaskItem task={task} />
                </li>
              ))}
            </ul>
          )}
          <p className="text-center text-xs text-gray-300 py-4 pb-24">{tasks.length}件</p>
        </div>
      </main>

      {/* FAB */}
      <TaskCreate />
    </div>
  )
}
