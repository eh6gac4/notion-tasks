import { getCloudflareContext } from "@opennextjs/cloudflare"
import { isDevMode } from "@/lib/require-auth"
import type { RecurringStore, TaskStore } from "./types"

export type { RecurringStore, TaskStore } from "./types"

/** 本番は Cloudflare D1 + R2、開発時はインメモリのストアを使う。 */
export async function getTaskStore(): Promise<TaskStore> {
  if (isDevMode()) {
    const { mockTaskStore } = await import("./mock")
    return mockTaskStore
  }

  const env = getCloudflareContext().env
  if (!env.DB) {
    throw new Error("D1 バインディング DB がありません。wrangler.jsonc の d1_databases を確認してください。")
  }
  const { D1TaskStore } = await import("./d1")
  return new D1TaskStore(env.DB, env.ATTACHMENTS)
}

/** 定期タスクも本番では D1、開発時はインメモリのストアを使う。 */
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
