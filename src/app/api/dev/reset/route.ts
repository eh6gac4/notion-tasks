import { NextResponse } from "next/server"

export function GET() {
  if (process.env.NODE_ENV !== "development" && process.env.NEXTJS_ENV !== "development") {
    return NextResponse.json({ error: "not available" }, { status: 404 })
  }
  // Dynamic import to avoid bundling mock-tasks in production
  return import("@/lib/mock-tasks").then(({ resetMockTasks }) => {
    resetMockTasks()
    return NextResponse.json({ ok: true })
  })
}
