import { getTasks, updateTask } from "@/lib/notion"

const THREE_DAYS_MS = 3 * 24 * 60 * 60 * 1000

// バックログに退避してあるタスクのうち、due が「今から 3 日以内」(過去 due 含む) に
// 入っているものを未着手に昇格させる。Cloudflare Cron Trigger から呼ばれる想定。
// 失敗したタスクが他の更新を巻き込まないよう、Promise.allSettled で個別に進行させる。
export async function promoteBacklog(now: Date = new Date()): Promise<{
  promoted: number
  failed: number
}> {
  const tasks = await getTasks({ statuses: ["バックログ"] })
  const threshold = now.getTime() + THREE_DAYS_MS
  const targets = tasks.filter(
    (t) => t.due !== null && new Date(t.due).getTime() <= threshold,
  )
  const results = await Promise.allSettled(
    targets.map((t) => updateTask(t.id, { status: "未着手" })),
  )
  const failed = results.filter((r) => r.status === "rejected").length
  return { promoted: targets.length - failed, failed }
}
