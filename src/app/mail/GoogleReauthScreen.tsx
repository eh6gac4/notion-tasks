import { StatusScreen } from "@/components/StatusScreen"

const REAUTH_REASON_MESSAGES: Record<string, string> = {
  denied: "Google 側で連携が許可されませんでした。",
  invalid_state: "連携リクエストの検証に失敗しました。",
  token_exchange_failed: "Google とのトークン交換に失敗しました。",
  no_refresh_token: "Google から再連携用のトークンを取得できませんでした。",
  verify_failed: "取得したトークンで Gmail に接続できませんでした。",
}

export function GoogleReauthScreen({ reason }: { reason?: string }) {
  const reasonMessage = reason ? REAUTH_REASON_MESSAGES[reason] : undefined
  const message = `${reasonMessage ? `${reasonMessage} ` : ""}Google アカウントとの連携が切れています。再度連携すると、メールの表示が復旧します。`

  return (
    <StatusScreen
      title="✦ GOOGLE 連携切れ"
      subtitle="— RE-AUTHORIZATION REQUIRED —"
      message={message}
      action={{ label: "Google と再連携する", href: "/api/google/authorize" }}
    />
  )
}
