import { getCloudflareContext } from "@opennextjs/cloudflare"
import { isDevMode } from "@/lib/require-auth"
import { notionTaskStore } from "./notion"
import type { RecurringStore, TaskStore } from "./types"

export type { RecurringStore, TaskStore } from "./types"

/**
 * 使用するバックエンドを環境変数 `TASK_STORE` で選ぶ。
 *   未設定 / "notion" → 既存の Notion 実装 (dev では in-memory mock)
 *   "d1"              → Cloudflare D1 + R2
 *
 * 本番は 2026-08-29 に TASK_STORE=d1 へ切り替え済み。ローカルや保険として
 * TASK_STORE=notion に戻せば Notion 実装に復帰する。
 *
 * D1 実装は動的 import する。Notion 運用時に D1TaskStore とその依存を
 * バンドルへ載せないためで、この関数が async なのはそのため。
 */
export async function getTaskStore(): Promise<TaskStore> {
  if ((process.env.TASK_STORE ?? "notion") !== "d1") return notionTaskStore

  const env = getCloudflareContext().env
  if (!env.DB) {
    throw new Error(
      "TASK_STORE=d1 ですが D1 バインディング DB がありません。wrangler.jsonc の d1_databases を有効にしてください。",
    )
  }
  const { D1TaskStore } = await import("./d1")
  return new D1TaskStore(env.DB, env.ATTACHMENTS)
}

/**
 * 定期タスク (繰り返しルール) のストア。
 *
 * ルールの実体は D1 にしかない。dev では D1 が無いのでインメモリの差し替え
 * 実装を返す (これが無いと /recurring が開けない)。分岐を TASK_STORE ではなく
 * dev 判定に置いているのは、本番で TASK_STORE=notion へ切り戻したときに
 * 「UI は正常に見えるがルールが揮発する」状態を作らないため。
 *
 * 発生日の計算 (recurrence.ts) と生成ポリシー (recurring-plan.ts) は
 * 両実装で共有しているので、dev と本番で挙動はズレない。
 */
export async function getRecurringStore(): Promise<RecurringStore> {
  if (isDevMode()) {
    const { mockRecurringStore } = await import("@/lib/mock-recurring")
    return mockRecurringStore
  }

  const env = getCloudflareContext().env
  if (!env.DB) {
    throw new Error("D1 バインディング DB がありません。wrangler.jsonc の d1_databases を確認してください。")
  }

  const { D1TaskStore } = await import("./d1")
  const { RecurringTaskStore } = await import("./recurring-d1")
  return new RecurringTaskStore(env.DB, new D1TaskStore(env.DB, env.ATTACHMENTS))
}
