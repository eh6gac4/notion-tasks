import { redirect } from "next/navigation"
import { resetMockTasks } from "@/lib/mock-tasks"

export default async function ResetPage() {
  if (process.env.NODE_ENV === "development") {
    resetMockTasks()
  }
  redirect("/")
}
