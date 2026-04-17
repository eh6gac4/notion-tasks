import { getTasks } from "@/lib/notion"
import { TaskList } from "@/components/TaskList"
import { auth, signOut } from "@/auth"

export const revalidate = 60

export default async function Home() {
  const session = await auth()
  const tasks = await getTasks({ statuses: ["未着手", "進行中", "確認中", "一時中断"] })

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
        <h1 className="text-base font-semibold text-gray-800">✅ To-do</h1>
        <div className="flex items-center gap-3">
          <span className="text-xs text-gray-400">{session?.user?.name}</span>
          <form
            action={async () => {
              "use server"
              await signOut({ redirectTo: "/login" })
            }}
          >
            <button
              type="submit"
              className="text-xs text-gray-500 hover:text-gray-700 transition-colors"
            >
              ログアウト
            </button>
          </form>
        </div>
      </header>

      <main className="max-w-2xl mx-auto bg-white shadow-sm rounded-lg mt-4 mx-4 sm:mx-auto overflow-hidden">
        <TaskList tasks={tasks} />
      </main>
    </div>
  )
}
