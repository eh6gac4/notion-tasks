"use server"

import { headers } from "next/headers"
import { signIn } from "@/auth"
import { AuthError } from "next-auth"
import { checkRateLimit, recordFailure, recordSuccess } from "@/lib/rate-limit"

export type LoginResult =
  | { success: true }
  | { error: "locked"; mins: number }
  | { error: "CredentialsSignin"; remaining: number }

export async function loginAction(formData: FormData): Promise<LoginResult> {
  const hdrs = await headers()
  const ip = hdrs.get("x-forwarded-for")?.split(",")[0].trim() ?? "unknown"

  const limit = checkRateLimit(ip)
  if (limit.blocked) {
    const mins = Math.ceil((limit.unlocksAt!.getTime() - Date.now()) / 60000)
    return { error: "locked", mins }
  }

  try {
    await signIn("credentials", {
      username: formData.get("username"),
      password: formData.get("password"),
      redirect: false,
    })
    recordSuccess(ip)
    return { success: true }
  } catch (e) {
    if (e instanceof AuthError) {
      const result = recordFailure(ip)
      if (result.blocked) return { error: "locked", mins: 30 }
      return { error: "CredentialsSignin", remaining: result.remaining }
    }
    throw e
  }
}
