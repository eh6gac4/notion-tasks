import { cookies } from "next/headers"
import { auth, signOut } from "@/auth"
import { getTasks } from "@/lib/notion"
import { TaskManager } from "@/components/TaskManager"
import { HydrationCheck } from "@/components/HydrationCheck"
import { getQueryStatuses } from "@/constants/filters"

export default async function Page() {
  const cookieStore = await cookies()
  const filter = cookieStore.get("filter")?.value ?? "active"

  const [session, tasks] = await Promise.all([
    auth(),
    getTasks({ statuses: getQueryStatuses(filter) }),
  ])

  return (
    <div className="flex flex-col h-full">
      <header className="sticky top-0 z-20 bg-[#0d0014] border-b border-[rgba(255,0,204,0.3)]">
        <div className="flex items-center justify-between px-4 h-14">
          <h1 className="text-sm font-bold text-[#ff00cc] cyber-glow-text tracking-widest uppercase">
            ✦ To-do
          </h1>
          <div className="flex items-center gap-4">
            <span className="text-xs text-[#996688]">{session?.user?.name}</span>
            <form action={async () => { "use server"; await signOut({ redirectTo: "/login" }) }} className="flex items-center">
              <button
                type="submit"
                className="text-xs text-[#996688] hover:text-[#ff00cc] transition-colors"
              >
                logout
              </button>
            </form>
          </div>
        </div>
      </header>

      <HydrationCheck />
      <TaskManager tasks={tasks} currentFilter={filter} />
    </div>
  )
}
