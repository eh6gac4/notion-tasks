"use client"

import { useState, useTransition } from "react"
import { loginAction } from "./actions"

type Props = {
  callbackUrl?: string
  initialError?: string
  initialMins?: string
  initialRemaining?: string
}

export function LoginForm({ callbackUrl, initialError, initialMins, initialRemaining }: Props) {
  const [error, setError] = useState<string | undefined>(initialError)
  const [remaining, setRemaining] = useState<number | undefined>(
    initialRemaining ? Number(initialRemaining) : undefined
  )
  const [mins, setMins] = useState<number | undefined>(
    initialMins ? Number(initialMins) : undefined
  )
  const [isPending, startTransition] = useTransition()

  const isLocked = error === "locked"

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      const result = await loginAction(formData)
      if ("success" in result) {
        window.location.href = callbackUrl ?? "/"
      } else if (result.error === "locked") {
        setError("locked")
        setMins(result.mins)
      } else {
        setError("CredentialsSignin")
        setRemaining(result.remaining)
      }
    })
  }

  return (
    <form action={handleSubmit} className="space-y-5">
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
          {remaining !== undefined && (
            <p className="text-xs text-[#996688]">あと{remaining}回でロックされます</p>
          )}
        </>
      )}
      {isLocked && (
        <p className="text-xs text-[#ff3355]">
          試行回数超過。約{mins ?? 30}分後に再試行してください。
        </p>
      )}

      <button
        type="submit"
        disabled={isLocked || isPending}
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
  )
}
