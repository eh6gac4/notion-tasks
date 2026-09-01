import { NextResponse } from "next/server"

export function GET() {
  if (process.env.NODE_ENV !== "development" && process.env.NEXTJS_ENV !== "development") {
    return NextResponse.json({ error: "not available" }, { status: 404 })
  }
  // Dynamic import to avoid bundling mock stores in production
  return Promise.all([import("@/lib/mock-tasks"), import("@/lib/mock-recurring")]).then(
    ([{ resetMockTasks }, { resetMockRecurring }]) => {
      resetMockTasks()
      resetMockRecurring()
      return NextResponse.json({ ok: true })
    },
  )
}
