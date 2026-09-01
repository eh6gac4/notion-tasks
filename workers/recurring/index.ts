// 定期タスクの自動生成を担う cron 専用 Worker。
//
// 本体 (Next.js) とは別の Worker として切り出している。本体の main は OpenNext の
// 生成物 `.open-next/worker.js` で、その既定 export は fetch しか持たないため、
// scheduled ハンドラを足すには生成物をラップして Durable Object の再 export まで
// 抱え込む必要がある。同じ D1 を bind した小さな Worker を別に置く方が、
// ビルドパイプラインに一切触れずに済む。
//
// デプロイ: npm run deploy:recurring
// 素の `wrangler deploy` は使えない (Next.js プロジェクトと検出されて本体の
// デプロイに化ける)。理由と手順は docs/recurring-import.md の「デプロイ」を参照。

import type { D1Database, ExecutionContext, ScheduledController } from "@cloudflare/workers-types"
import { todayInTokyo } from "@/lib/recurrence"
import { D1TaskStore } from "@/lib/store/d1"
import { RecurringTaskStore } from "@/lib/store/recurring-d1"

type Env = {
  DB: D1Database
  /** 手動実行エンドポイントの共有シークレット。未設定なら手動実行は無効 */
  CRON_SECRET?: string
}

async function run(env: Env) {
  const today = todayInTokyo()
  const store = new RecurringTaskStore(env.DB, new D1TaskStore(env.DB))
  const result = await store.generateDueTasks(today)

  console.log(
    `[recurring] ${today} 生成 ${result.created} 件`,
    result.perRule.map((r) => `${r.title}: ${r.dates.join(", ")}`).join(" | "),
  )
  return { today, ...result }
}

const handler = {
  async scheduled(_controller: ScheduledController, env: Env, ctx: ExecutionContext) {
    ctx.waitUntil(
      run(env).catch((e) => {
        // scheduled の例外は握り潰されるので、必ずログに残す (wrangler tail で拾う)
        console.error("[recurring] 生成に失敗:", e instanceof Error ? e.stack : e)
        throw e
      }),
    )
  },

  // 手動確認用。cron を待たずに同じ処理を 1 回走らせる。
  // 冪等なので複数回叩いても増えない。
  async fetch(request: Request, env: Env): Promise<Response> {
    if (!env.CRON_SECRET) return new Response("disabled", { status: 404 })
    if (request.headers.get("x-cron-secret") !== env.CRON_SECRET) {
      return new Response("forbidden", { status: 403 })
    }

    try {
      const result = await run(env)
      return Response.json(result)
    } catch (e) {
      return new Response(e instanceof Error ? e.message : String(e), { status: 500 })
    }
  },
}

export default handler
