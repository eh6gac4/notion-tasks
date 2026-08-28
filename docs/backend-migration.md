# Notion → Cloudflare D1 バックエンド移行

Notion API を唯一のデータストアにしている現状から、Cloudflare D1 (+ 添付は R2) へ
移行するための土台。**この時点ではまだ切り替わっていない** — 既定は Notion のままで、
`TASK_STORE=d1` を設定して初めて D1 が使われる。

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

```
node scripts/migrate-notion-to-d1.mjs
```

Notion 側は read-only で、`.migration/` に成果物を吐くだけ。
**完了 / 中止 / 対応不要のタスクは移行対象外** (`MIGRATED_STATUSES`)。
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

## 残っている作業

移行を完了させるには以下が必要。いずれもこのプロトタイプの範囲外。

- [ ] **`/api/icon/[pageId]` の D1 対応。** 現状 Notion のアイコン (S3 由来) は
      移行スクリプトが捨てている。絵文字アイコンはそのまま移る。
- [ ] **"Open in Notion" ボタンの出し分け。** D1 で新規作成したタスクは
      `task.url` が空になる (`src/components/TaskDetail.tsx:872`)。
- [ ] **`src/app/actions.ts` の `isNotionClientError` 依存の除去。** D1 経路では
      常に false になるだけで害はないが、Notion を切り離すなら消す。
- [ ] **`option_sets` の管理 UI。** 現状は移行スクリプトが流し込んだきり。
      新しいタグを使ったら候補に足す導線が要る。
- [ ] **バックアップ。** `wrangler d1 export` を定期実行して R2 に置く。
      Notion が持っていた版履歴の代わり。
- [ ] Notion を完全に切り離す段階で `@notionhq/client`、`src/lib/notion.ts` の
      block 変換、`src/constants/notion.ts` を削除する。
