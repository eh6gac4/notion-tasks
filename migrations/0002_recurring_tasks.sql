-- notion-tasks: 定期タスク(繰り返しルール)スキーマ
--
-- 適用:
--   ローカル: npx wrangler d1 execute notion-tasks --local  --file=./migrations/0002_recurring_tasks.sql
--   本番:     npx wrangler d1 execute notion-tasks --remote --file=./migrations/0002_recurring_tasks.sql
--
-- 設計方針:
-- * ルールは tasks とは別テーブルに持つ。ルールは「タスクの雛形 + 繰り返し条件」であって
--   タスクそのものではないため、status/due を持つ tasks に混ぜると一覧の全クエリに
--   除外条件が要る。
-- * 生成の冪等性は recurring_task_instances の主キー (recurring_id, occurrence_date) が担保する。
--   cron が同じ日に二度走っても二重に生えない。
-- * 全文が再実行可能(IF NOT EXISTS のみ)。ALTER TABLE は使わない。

CREATE TABLE IF NOT EXISTS recurring_tasks (
  id           TEXT PRIMARY KEY,

  -- 生成されるタスクに複写する雛形部分。tasks の同名カラムと対応する。
  title        TEXT NOT NULL DEFAULT '',
  status       TEXT,                      -- NULL なら生成時に '未着手'
  priority     TEXT CHECK (priority IS NULL OR priority IN ('high', 'medium', 'low')),
  location     TEXT,
  body         TEXT NOT NULL DEFAULT '',  -- Markdown 本文

  -- 繰り返し条件。iCalendar の RRULE の部分集合。
  freq         TEXT NOT NULL CHECK (freq IN ('daily', 'weekly', 'monthly', 'yearly')),
  interval     INTEGER NOT NULL DEFAULT 1 CHECK (interval >= 1),
  byweekday    TEXT,                      -- weekly のみ。"1,3,5" 形式 (0=日曜)
  bymonthday   INTEGER CHECK (bymonthday IS NULL OR (bymonthday >= 1 AND bymonthday <= 31)),
  bymonth      INTEGER CHECK (bymonth IS NULL OR (bymonth >= 1 AND bymonth <= 12)),

  -- 生成されるタスクの期日。due_time が NULL なら「日付のみ」の期日になる。
  due_time     TEXT,                      -- "HH:mm" (日本時間)
  -- 期日の何日前にタスクを生やすか。0 なら期日当日の朝に生える。
  lead_days    INTEGER NOT NULL DEFAULT 0 CHECK (lead_days >= 0),

  -- interval の基準日でもある。start_date 自身が最初の候補日。
  start_date   TEXT NOT NULL,             -- YYYY-MM-DD
  end_date     TEXT,                      -- YYYY-MM-DD (含む)。NULL なら無期限
  enabled      INTEGER NOT NULL DEFAULT 1,

  created_time     TEXT NOT NULL,
  last_edited_time TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_recurring_tasks_enabled ON recurring_tasks (enabled);

CREATE TABLE IF NOT EXISTS recurring_task_tags (
  recurring_id TEXT NOT NULL REFERENCES recurring_tasks (id) ON DELETE CASCADE,
  tag          TEXT NOT NULL,
  PRIMARY KEY (recurring_id, tag)
);

-- 「どのルールの、いつぶんを、もう作ったか」の台帳。
-- task_id を ON DELETE SET NULL にしているのは意図的で、生成されたタスクを
-- 消しても台帳の行は残る = その回はもう生成済みとして再生成されない。
-- CASCADE にすると「消したタスクが翌朝また生える」ことになる。
CREATE TABLE IF NOT EXISTS recurring_task_instances (
  recurring_id    TEXT NOT NULL REFERENCES recurring_tasks (id) ON DELETE CASCADE,
  occurrence_date TEXT NOT NULL,          -- YYYY-MM-DD (期日の日付)
  task_id         TEXT REFERENCES tasks (id) ON DELETE SET NULL,
  created_time    TEXT NOT NULL,
  PRIMARY KEY (recurring_id, occurrence_date)
);

CREATE INDEX IF NOT EXISTS idx_recurring_instances_task ON recurring_task_instances (task_id);
