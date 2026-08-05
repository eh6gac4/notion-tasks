import { redirect } from "next/navigation"
import { auth } from "@/auth"

export function isDevMode() {
  return process.env.NODE_ENV === "development" || process.env.NEXTJS_ENV === "development"
}

export async function requireAuth() {
  if (isDevMode()) return
  const session = await auth()
  if (!session?.user) redirect("/login")
}
