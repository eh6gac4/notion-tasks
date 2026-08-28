import { getCloudflareContext } from "@opennextjs/cloudflare"
import { notionTaskStore } from "./notion"
import type { TaskStore } from "./types"

export type { TaskStore } from "./types"

/**
 * 使用するバックエンドを環境変数 `TASK_STORE` で選ぶ。
 *   未設定 / "notion" → 既存の Notion 実装 (dev では in-memory mock)
 *   "d1"              → Cloudflare D1 + R2
 *
 * 既定が notion なので、この関数を挟んだだけでは挙動は変わらない。
 * 移行は wrangler.jsonc のバインディングを有効にして TASK_STORE=d1 を
 * 設定した時点で切り替わる。
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
