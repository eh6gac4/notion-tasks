import { redirect } from "next/navigation"
import { auth } from "@/auth"
import { LoginForm } from "./LoginForm"

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
        <LoginForm
          callbackUrl={callbackUrl}
          initialError={error}
          initialMins={mins}
          initialRemaining={remaining}
        />
      </div>
    </div>
  )
}
