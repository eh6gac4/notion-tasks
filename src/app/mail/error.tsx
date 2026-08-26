"use client"

import { StatusScreen } from "@/components/StatusScreen"

export default function MailError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <StatusScreen
      title="✦ MAIL ERROR"
      subtitle="— FAILED TO LOAD MAIL —"
      message="メールの取得に失敗しました。しばらく経ってからもう一度お試しください。"
      action={{ label: "再試行", onClick: () => reset() }}
    />
  )
}
