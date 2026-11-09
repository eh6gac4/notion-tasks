"use client"

export async function passkeyRequest(path: string, method: string, body?: unknown) {
  const response = await fetch(path, {
    method, cache: "no-store", headers: { "Content-Type": "application/json" },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  })
  const data = await response.json()
  if (!response.ok) throw new Error(data.error || "パスキーの操作に失敗しました")
  return data
}

export function passkeyErrorMessage(error: unknown) {
  if (error instanceof Error && error.name === "NotAllowedError") {
    return "操作がキャンセルされたか、時間切れになりました"
  }
  if (error instanceof Error && error.name === "InvalidStateError") return "このパスキーは登録済みです"
  return error instanceof Error ? error.message : "パスキーの操作に失敗しました"
}
