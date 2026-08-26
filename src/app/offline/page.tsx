import { StatusScreen } from "@/components/StatusScreen"

export const dynamic = "force-static"

export default function OfflinePage() {
  return (
    <StatusScreen
      title="✦ OFFLINE"
      subtitle="— NETWORK UNREACHABLE —"
      message="ネットワーク接続を確認してから、もう一度開き直してください。"
      fullHeight={false}
    />
  )
}
