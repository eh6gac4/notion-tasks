import { redirect } from "next/navigation"
import { headers } from "next/headers"
import { signIn, auth } from "@/auth"
import { AuthError } from "next-auth"
import { checkRateLimit, recordFailure, recordSuccess } from "@/lib/rate-limit"

type SearchParams = {
  callbackUrl?: string
  error?: string
  remaining?: string
  mins?: string
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const session = await auth()
  const { callbackUrl, error, remaining, mins } = await searchParams

  if (session?.user) redirect(callbackUrl ?? "/")

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-full max-w-sm bg-white rounded-xl shadow p-8">
        <h1 className="text-xl font-semibold text-gray-800 mb-6">ログイン</h1>
        <form
          action={async (formData) => {
            "use server"
            const hdrs = await headers()
            const ip = hdrs.get("x-forwarded-for")?.split(",")[0].trim() ?? "unknown"

            const limit = checkRateLimit(ip)
            if (limit.blocked) {
              const mins = Math.ceil((limit.unlocksAt!.getTime() - Date.now()) / 60000)
              redirect(`/login?error=locked&mins=${mins}${callbackUrl ? `&callbackUrl=${encodeURIComponent(callbackUrl)}` : ""}`)
            }

            try {
              await signIn("credentials", {
                username: formData.get("username"),
                password: formData.get("password"),
                redirectTo: callbackUrl ?? "/",
              })
              recordSuccess(ip)
            } catch (e) {
              if (e instanceof AuthError) {
                const result = recordFailure(ip)
                if (result.blocked) {
                  redirect(`/login?error=locked&mins=30${callbackUrl ? `&callbackUrl=${encodeURIComponent(callbackUrl)}` : ""}`)
                }
                redirect(`/login?error=CredentialsSignin&remaining=${result.remaining}${callbackUrl ? `&callbackUrl=${encodeURIComponent(callbackUrl)}` : ""}`)
              }
              throw e
            }
          }}
          className="space-y-4"
        >
          <div>
            <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-1">
              ユーザー名
            </label>
            <input
              id="username"
              name="username"
              type="text"
              required
              autoComplete="username"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
              パスワード
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              autoComplete="current-password"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {error === "CredentialsSignin" && (
            <>
              <p className="text-sm text-red-600">ユーザー名またはパスワードが正しくありません</p>
              {remaining && (
                <p className="text-xs text-gray-500">あと{remaining}回間違えるとロックされます</p>
              )}
            </>
          )}
          {error === "locked" && (
            <p className="text-sm text-red-600">
              ログイン試行が多すぎます。約{mins ?? 30}分後に再試行してください。
            </p>
          )}

          <button
            type="submit"
            disabled={error === "locked"}
            className="w-full bg-blue-600 text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            ログイン
          </button>
        </form>
      </div>
    </div>
  )
}
