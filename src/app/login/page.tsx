import { redirect } from "next/navigation"
import { auth } from "@/auth"

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
    <div className="min-h-screen flex items-center justify-center bg-[#0d0014]">
      <div
        className="w-full max-w-sm rounded-2xl p-8"
        style={{
          backgroundColor: "#160022",
          border: "1px solid rgba(255,0,204,0.35)",
          boxShadow: "0 0 40px rgba(255,0,204,0.15)",
        }}
      >
        <h1
          className="text-sm tracking-widest uppercase mb-8 cyber-glow-text"
          style={{ color: "#ff00cc" }}
        >
          ✦ SYSTEM LOGIN
        </h1>

        <form method="POST" action="/api/login" className="space-y-5">
          <input type="hidden" name="callbackUrl" value={callbackUrl ?? "/"} />
          <div>
            <label htmlFor="username" className="block text-xs text-[#996688] mb-2 tracking-widest uppercase">
              ユーザー名
            </label>
            <input
              id="username"
              name="username"
              type="text"
              required
              autoComplete="username"
              className="w-full rounded-xl px-4 py-3 text-sm bg-[#0d0014] text-[#ffbbee] placeholder:text-[#553355] focus:outline-none"
              style={{ border: "1px solid rgba(255,0,204,0.3)" }}
            />
          </div>
          <div>
            <label htmlFor="password" className="block text-xs text-[#996688] mb-2 tracking-widest uppercase">
              パスワード
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              autoComplete="current-password"
              className="w-full rounded-xl px-4 py-3 text-sm bg-[#0d0014] text-[#ffbbee] placeholder:text-[#553355] focus:outline-none"
              style={{ border: "1px solid rgba(255,0,204,0.3)" }}
            />
          </div>

          {error === "CredentialsSignin" && (
            <>
              <p className="text-xs text-[#ff3355]">認証に失敗しました</p>
              {remaining && (
                <p className="text-xs text-[#996688]">あと{remaining}回でロックされます</p>
              )}
            </>
          )}
          {error === "locked" && (
            <p className="text-xs text-[#ff3355]">
              試行回数超過。約{mins ?? 30}分後に再試行してください。
            </p>
          )}

          <button
            type="submit"
            disabled={error === "locked"}
            className="w-full rounded-xl py-3 text-sm tracking-widest uppercase disabled:opacity-40 transition-all mt-2"
            style={{
              backgroundColor: "#ff00cc",
              color: "#0d0014",
              boxShadow: "0 0 12px rgba(255,0,204,0.5), 0 0 30px rgba(255,0,204,0.2)",
            }}
          >
            ACCESS
          </button>
        </form>
      </div>
    </div>
  )
}
