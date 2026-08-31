# 定期タスクの一括投入

Notion の定期タスク（データベースの繰り返しテンプレート）を、このアプリの繰り返しルールへ移すための手順。

## なぜ手作業なのか

Notion の繰り返しテンプレートは、公開 API から読み出せない。

- テンプレートページは `databases.query` の結果に含まれない
- 繰り返しスケジュール（毎週月曜、毎月 27 日 …）はページのプロパティとして露出しない

つまり `scripts/migrate-notion-to-d1.mjs` のような完全自動移行はできない。ルールの内容は Notion の画面を見て書き出す必要がある。このスクリプトは、その書き出しを検証して SQL に変換するところを受け持つ。

数件なら管理画面（`/recurring`）から直接登録する方が早い。まとまった件数があるときにこの手順を使う。

## 手順

### 1. TSV を書く

`migrations/recurring-rules.example.tsv` を複製して編集する。列の区切りはタブ。行頭 `#` の行と空行は無視される。

### 2. 検証して SQL を生成する

```
node scripts/import-recurring.mjs path/to/rules.tsv
```

各ルールの要約と次回発生日 3 回ぶんが表示されるので、意図どおりか目で確認する。不正な行があれば行番号つきで落ちるので、直して再実行する。

出力は `.migration/0003_recurring_seed.sql`。

### 3. 適用する

先に `migrations/0002_recurring_tasks.sql` が適用済みであること。

```
npx wrangler d1 execute notion-tasks --local  --file=./.migration/0003_recurring_seed.sql
npx wrangler d1 execute notion-tasks --remote --file=./.migration/0003_recurring_seed.sql
```

投入したルールは `enabled=1` で入る。翌 0 時（日本時間）の cron から自動生成が始まる。すぐ試したいときは `/recurring` の「今すぐ生成」を押す。

## 下書きの自動生成（任意）

`NOTION_TOKEN` が `.env.local` にあるなら、過去タスクの出現間隔から周期の候補を推定した TSV の下書きを出せる。

```
node scripts/import-recurring.mjs --suggest
```

完了ぶんも含めた全タスクを走査し、同じタイトルが 3 回以上現れたものについて、期日の間隔の中央値から頻度を当てる。出力は `.migration/recurring-rules.suggested.tsv`。

**これは推定であって、Notion の繰り返し設定そのものではない。** 必ず Notion の画面と突き合わせて直してから投入すること。推定の根拠（件数・間隔の中央値・直近の期日）はファイル先頭にコメントとして残る。

## 列の定義

| 列 | 必須 | 内容 |
|----|------|------|
| `title` | ✓ | タスク名。生成されるタスクにそのまま入る |
| `freq` | ✓ | `daily` / `weekly` / `monthly` / `yearly` |
| `interval` | | 何 日/週/月/年 ごとか。省略時 1 |
| `byweekday` | | `freq=weekly` のみ。`0`=日曜 〜 `6`=土曜。カンマ区切りで複数可（`1,4` = 月・木）。省略時は `start_date` の曜日 |
| `bymonthday` | | `freq=monthly` / `yearly` のみ。1〜31。省略時は `start_date` の日 |
| `bymonth` | | `freq=yearly` のみ。1〜12。省略時は `start_date` の月 |
| `due_time` | | `HH:mm`。生成されるタスクの期限の時刻（日本時間）。空なら期限は日付のみ |
| `lead_days` | | 期限の何日前にタスクを作るか。省略時 0（期限当日の 0 時に生える） |
| `start_date` | ✓ | `YYYY-MM-DD`。`interval` の基準日であり、最初の候補日でもある |
| `end_date` | | `YYYY-MM-DD`。この日を含めて終了。空なら無期限 |
| `status` | | 生成されるタスクの初期ステータス。空なら「未着手」 |
| `priority` | | `high` / `medium` / `low` |
| `location` | | 場所 |
| `tags` | | カンマ区切り |
| `body` | | Markdown 本文。改行は `\n` と書く |

## 仕様上の注意

- **`interval` の基準は常に `start_date`。** 「隔週の月・金」なら `start_date` を含む週を 0 週目として、偶数週の月曜と金曜だけが発生日になる。
- **月末への丸めはしない。** `bymonthday=31` は 31 日がある月にだけ発生する（2 月・4 月などはスキップ）。毎月末に必ず発生させたい場合、この仕様では表現できない。
- **前回ぶんが未完了でも次が生成される。** Notion の繰り返しテンプレートと同じ挙動。
- 生成は冪等。同じ回が二度作られることはない（`recurring_task_instances` が台帳になっている）。
- cron が数日止まっていた場合、最大 30 日ぶんまで遡って取りこぼしを埋める。それより古い回は生成されない。
