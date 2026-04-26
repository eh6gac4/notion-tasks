import { type NextRequest, NextResponse } from "next/server"
import { signIn } from "@/auth"
import { AuthError } from "next-auth"
import { checkRateLimit, recordFailure } from "@/lib/rate-limit"

export async function POST(request: NextRequest) {
  const formData = await request.formData()
  const callbackUrl = (formData.get("callbackUrl") as string | null) || "/"
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? "unknown"

  const toLoginError = (params: Record<string, string>) => {
    const url = new URL("/login", request.url)
    if (callbackUrl !== "/") url.searchParams.set("callbackUrl", callbackUrl)
    for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v)
    return NextResponse.redirect(url, { status: 303 })
  }

  const limit = checkRateLimit(ip)
  if (limit.blocked) {
    const mins = Math.ceil((limit.unlocksAt!.getTime() - Date.now()) / 60000)
    return toLoginError({ error: "locked", mins: String(mins) })
  }

  try {
    await signIn("credentials", {
      username: formData.get("username"),
      password: formData.get("password"),
      redirectTo: callbackUrl,
    })
  } catch (e) {
    if (e instanceof AuthError) {
      const result = recordFailure(ip)
      if (result.blocked) return toLoginError({ error: "locked", mins: "30" })
      return toLoginError({ error: "CredentialsSignin", remaining: String(result.remaining) })
    }
    // NEXT_REDIRECT (signIn 成功) はそのまま伝播させ、Next.js が HTTP リダイレクトに変換する
    throw e
  }
}
