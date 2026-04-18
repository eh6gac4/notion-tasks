import { auth, signOut } from "@/auth"
import { getTasks } from "@/lib/notion"
import { TaskManager } from "@/components/TaskManager"

export default async function Page() {
  const [session, tasks] = await Promise.all([
    auth(),
    getTasks({
      statuses: ["未着手", "進行中", "確認中", "一時中断"],
    }),
  ])

  return (
    <div className="flex flex-col h-full">
      <header className="sticky top-0 z-20 bg-white border-b border-gray-100">
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

      <TaskManager tasks={tasks} />
    </div>
  )
}
