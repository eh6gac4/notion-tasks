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
    <div className="min-h-screen flex items-center justify-center bg-[var(--bg)]">
      <div
        className="w-full max-w-sm rounded-2xl p-8"
        style={{
          backgroundColor: "var(--surface)",
          border: "1px solid var(--border-strong)",
          boxShadow: "0 8px 40px rgba(0,0,0,0.5)",
        }}
      >
        <h1
          className="font-pixel text-sm tracking-widest uppercase mb-8 accent-glow-text-sm"
          style={{ color: "var(--accent)" }}
        >
          ✦ SYSTEM LOGIN
        </h1>

        <form method="POST" action="/api/login" className="space-y-5">
          <input type="hidden" name="callbackUrl" value={callbackUrl ?? "/"} />
          <div>
            <label htmlFor="username" className="font-pixel block text-xs text-[var(--text-dim)] mb-2 tracking-widest uppercase">
              ユーザー名
            </label>
            <input
              id="username"
              name="username"
              type="text"
              required
              autoComplete="username"
              className="w-full rounded-lg px-4 py-3 text-sm bg-[var(--bg)] text-[var(--text)] placeholder:text-[var(--text-faint)] focus:outline-none focus:border-[var(--accent)]"
              style={{ border: "1px solid var(--border-strong)", transition: "border-color 0.2s" }}
            />
          </div>
          <div>
            <label htmlFor="password" className="font-pixel block text-xs text-[var(--text-dim)] mb-2 tracking-widest uppercase">
              パスワード
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              autoComplete="current-password"
              className="w-full rounded-lg px-4 py-3 text-sm bg-[var(--bg)] text-[var(--text)] placeholder:text-[var(--text-faint)] focus:outline-none focus:border-[var(--accent)]"
              style={{ border: "1px solid var(--border-strong)", transition: "border-color 0.2s" }}
            />
          </div>

          {error === "CredentialsSignin" && (
            <>
              <p className="text-xs text-[var(--status-cancel)]">認証に失敗しました</p>
              {remaining && (
                <p className="text-xs text-[var(--text-dim)]">あと{remaining}回でロックされます</p>
              )}
            </>
          )}
          {error === "locked" && (
            <p className="text-xs text-[var(--status-cancel)]">
              試行回数超過。約{mins ?? 30}分後に再試行してください。
            </p>
          )}

          <button
            type="submit"
            disabled={error === "locked"}
            className="font-pixel w-full rounded-lg py-3 text-sm tracking-widest uppercase font-semibold disabled:opacity-40 transition-all mt-2"
            style={{
              backgroundColor: "var(--accent)",
              color: "var(--bg)",
              boxShadow: "0 0 8px rgba(220,20,60,0.4)",
            }}
          >
            ACCESS
          </button>
        </form>
      </div>
    </div>
  )
}
