-- notion-tasks: Notion → Cloudflare D1 移行スキーマ
--
-- 適用:
--   ローカル: npx wrangler d1 execute notion-tasks --local  --file=./migrations/0001_init.sql
--   本番:     npx wrangler d1 execute notion-tasks --remote --file=./migrations/0001_init.sql
--
-- 設計方針:
-- * id は Notion の page UUID をそのまま引き継ぐ。リレーションを無変換で移せる。
-- * 本文は Notion block ツリーではなく Markdown を TEXT で 1 カラムに持つ。
--   これにより src/lib/notion.ts の Markdown ↔ block 変換(約 400 行)が不要になる。
-- * 親/子・前/次は Notion では相互に対になる 2 プロパティだが、D1 では
--   有向辺 1 本だけを持ち、逆方向は引き側で導出する(不整合が構造的に起きない)。

CREATE TABLE IF NOT EXISTS tasks (
  id               TEXT PRIMARY KEY,
  -- 移行元 Notion ページの URL。移行済みタスクでは "Open in Notion" が生き続け、
  -- D1 で新規作成したタスクでは空文字になる(UI 側でボタンを出し分ける)。
  notion_url       TEXT NOT NULL DEFAULT '',
  title            TEXT NOT NULL DEFAULT '',
  icon_type        TEXT CHECK (icon_type IS NULL OR icon_type IN ('emoji', 'url')),
  icon_value       TEXT,
  status           TEXT,
  priority         TEXT CHECK (priority IS NULL OR priority IN ('high', 'medium', 'low')),
  due              TEXT,                      -- ISO 8601 (日付のみ / 日時いずれも)
  location         TEXT,
  source           TEXT,
  source_url       TEXT,
  body             TEXT NOT NULL DEFAULT '',  -- Markdown 本文
  created_time     TEXT NOT NULL,
  last_edited_time TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks (status);
CREATE INDEX IF NOT EXISTS idx_tasks_due    ON tasks (due);

CREATE TABLE IF NOT EXISTS task_tags (
  task_id TEXT NOT NULL REFERENCES tasks (id) ON DELETE CASCADE,
  tag     TEXT NOT NULL,
  PRIMARY KEY (task_id, tag)
);

CREATE INDEX IF NOT EXISTS idx_task_tags_tag ON task_tags (tag);

CREATE TABLE IF NOT EXISTS task_assignees (
  task_id  TEXT NOT NULL REFERENCES tasks (id) ON DELETE CASCADE,
  assignee TEXT NOT NULL,                     -- 移行時は Notion user id をそのまま保持
  PRIMARY KEY (task_id, assignee)
);

-- 有向辺。
--   type='parent': from_id の親が to_id  → childTaskIds は to_id 側から逆引き
--   type='next'  : from_id の次が to_id  → prevTaskIds  は to_id 側から逆引き
CREATE TABLE IF NOT EXISTS task_relations (
  from_id TEXT NOT NULL REFERENCES tasks (id) ON DELETE CASCADE,
  to_id   TEXT NOT NULL REFERENCES tasks (id) ON DELETE CASCADE,
  type    TEXT NOT NULL CHECK (type IN ('parent', 'next')),
  PRIMARY KEY (from_id, to_id, type)
);

CREATE INDEX IF NOT EXISTS idx_task_relations_to ON task_relations (to_id, type);

CREATE TABLE IF NOT EXISTS task_comments (
  id           TEXT PRIMARY KEY,
  task_id      TEXT NOT NULL REFERENCES tasks (id) ON DELETE CASCADE,
  text         TEXT NOT NULL,
  author       TEXT NOT NULL DEFAULT 'Unknown',
  created_time TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_task_comments_task ON task_comments (task_id, created_time);

-- 実体は R2 に置き、ここではメタデータと R2 key のみ持つ。
-- 表示順 = sort_order 昇順。UI が使う添付インデックスはこの順序の 0 始まり位置。
CREATE TABLE IF NOT EXISTS task_attachments (
  id           TEXT PRIMARY KEY,
  task_id      TEXT NOT NULL REFERENCES tasks (id) ON DELETE CASCADE,
  sort_order   INTEGER NOT NULL,
  name         TEXT NOT NULL,
  r2_key       TEXT NOT NULL,
  content_type TEXT NOT NULL DEFAULT 'application/octet-stream',
  size         INTEGER NOT NULL DEFAULT 0,
  created_time TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_task_attachments_task ON task_attachments (task_id, sort_order);

-- Notion では data source のプロパティ定義から取っていた選択肢一覧
-- (getTagOptions / getLocationOptions)の置き換え。
CREATE TABLE IF NOT EXISTS option_sets (
  kind       TEXT NOT NULL CHECK (kind IN ('tag', 'location')),
  value      TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (kind, value)
);
