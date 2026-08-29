# Notion → Cloudflare D1 バックエンド移行

Notion API を唯一のデータストアにしていた状態から、Cloudflare D1 (+ 添付は R2) へ
移行した記録。**本番は 2026-08-29 に `TASK_STORE=d1` へ切替済み。** コード上の既定は
Notion のままで、`TASK_STORE=notion` に戻せば旧実装へロールバックできる (Notion 側は
一切書き換えていない)。

## なぜ移行するか

| | Notion | D1 |
|---|---|---|
| レイテンシ | API 往復。ページネーション必須 | 同一 Worker からの SQL 1 回 |
| レート制限 | 約 3 req/s | 実質なし |
| 本文 | block ツリー ⇔ Markdown の相互変換が必要 (`src/lib/notion.ts` 約 400 行) | Markdown を TEXT で 1 カラム |
| 添付 | 署名付き S3 URL。キャッシュのため proxy route が必須 | R2 から直接返すだけ |
| 失うもの | — | Notion アプリでの閲覧・編集、横断検索、版履歴 |

移行後も `tasks.notion_url` に元のページ URL が残るので、移行済みタスクの
"Open in Notion" は Notion をアーカイブとして残す限り機能し続ける。

## 構成

```
src/lib/store/
├── types.ts    TaskStore インターフェース (既存 12 関数の signature をそのまま型に)
├── notion.ts   既存 src/lib/notion.ts を TaskStore として見せるアダプタ
├── d1.ts       D1 + R2 実装
└── index.ts    getTaskStore(): TASK_STORE env でバックエンドを選ぶ

migrations/0001_init.sql          D1 スキーマ
scripts/migrate-notion-to-d1.mjs  データ移行スクリプト
```

`src/app/actions.ts` は `@/lib/notion` を直接 import するのをやめ、
`getTaskStore()` 経由に変わった。既定が Notion なので挙動は変わらない。

### スキーマ上の判断

- **id は Notion の page UUID をそのまま使う。** リレーションが無変換で移る。
- **親/子・前/次は有向辺 1 本だけ持つ** (`task_relations`)。Notion では対になる
  2 プロパティだが、片方向だけ保存して逆方向は SQL で導出するので不整合が起きない。
- **本文は `tasks.body` に Markdown をそのまま。** block 差分適用のコードが不要になる。
- **選択肢は `option_sets` テーブル。** Notion では data source のプロパティ定義から
  引いていた `getTagOptions` / `getLocationOptions` の置き換え。

## 手順

### 1. リソース作成

```
npx wrangler d1 create notion-tasks
npx wrangler r2 bucket create notion-tasks-attachments
```

`wrangler.jsonc` の `d1_databases` / `ATTACHMENTS` のコメントを外し、
出力された database_id を貼る。

### 2. スキーマ適用

```
npx wrangler d1 execute notion-tasks --remote --file=./migrations/0001_init.sql
```

ローカルで試すなら `--local`。

### 3. データ移行

スクリプトは `.env.local` から env を読む。本番の `NOTION_TOKEN` は Cloudflare
secret なので手元に無い場合は用意する (Google の 2 つは `src/config.ts` の
`requireEnv` を通すためのダミーで可):

```
NOTION_TOKEN=<Notion integration token>
NOTION_DATABASE_ID=b0181e55-5df9-49a5-9790-0ac7e50057f9
GOOGLE_CLIENT_ID=dummy
GOOGLE_CLIENT_SECRET=dummy
```

```
node scripts/migrate-notion-to-d1.mjs
```

Notion 側は read-only で、`.migration/` に成果物を吐くだけ。
**完了 / 中止 / 対応不要 / アーカイブ済みのタスクは移行対象外** (`MIGRATED_STATUSES`)。
これらを親/次に持つリレーションも合わせてスキップされる。

- `.migration/0002_seed.sql` … tasks / tags / assignees / relations / comments / option_sets
- `.migration/attachments/` … 添付ファイルの実体
- `.migration/upload-attachments.sh` … R2 への put コマンド

本文とコメントはページごとに取得するためレート制限のウェイトが入る。数百件で数分かかる。

```
npx wrangler d1 execute notion-tasks --remote --file=./.migration/0002_seed.sql
sh .migration/upload-attachments.sh
```

### 4. 切り替え

```
npx wrangler secret put TASK_STORE   # → d1
```

戻すときは `TASK_STORE=notion`。Notion 側は一切書き換えていないので、
移行後しばらくは read-only の保険として残せる。

## テスト

`src/lib/store/__tests__/d1.test.ts` は `node:sqlite` の上に D1 の API を被せた
スタブ (`fakeD1.ts`) で動く。`migrations/0001_init.sql` を実際に流し込むので、
スキーマと実装の SQL が噛み合っているかまで検証される。

```
npm run test:unit
```

## バックアップ

Notion が持っていた版履歴の代わりに、切り替え後は D1 の内容をエクスポートして
おく。手動なら:

```
npx wrangler d1 export notion-tasks --remote --output=notion-tasks-$(date +%Y%m%d).sql
```

出力は R2 なり手元なりに保管する。定期実行の自動化 (GitHub Actions で cron →
R2 へ put) は移行が安定してから判断する。

## 残っている作業

- [x] 本番切替 (2026-08-29) — `wrangler.jsonc` の D1/R2 バインディング有効化 (#169) +
      `TASK_STORE=d1` secret 設定
- [x] "Open in Notion" ボタンの出し分け (#165) — `task.url` が空なら出さない
- [x] `src/app/actions.ts` の `isNotionClientError` 依存の除去 (#166)
- [x] タグ/場所の候補補充 (#167) — D1 では保存時に `option_sets` へ自動昇格する
- [ ] **`/api/icon/[pageId]` の D1 対応。** 画像アイコン (S3 由来) は移行しない方針。
      絵文字アイコンはそのまま移る。Notion 切り離し時に route ごと削除する。
- [ ] Notion を完全に切り離す段階で `@notionhq/client`、`src/lib/notion.ts` の
      block 変換、`src/constants/notion.ts`、`/api/icon` route を削除する。
