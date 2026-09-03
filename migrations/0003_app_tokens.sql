-- notion-tasks: 外部サービスの長期トークン置き場
--
-- 適用:
--   ローカル: npx wrangler d1 execute notion-tasks --local  --file=./migrations/0003_app_tokens.sql
--   本番:     npx wrangler d1 execute notion-tasks --remote --file=./migrations/0003_app_tokens.sql
--
-- 設計方針:
-- * 元は KV(TOKEN_STORE)に置いていたが、KV の反映遅延で再認可が反映されない
--   不具合があったため D1 に移した。経緯は src/lib/token-store.ts のコメント。
-- * キー・値の汎用テーブルにしている。今のところ行は google_refresh_token 1 件だけだが、
--   同種の可変シークレットが増えてもテーブルを増やさずに済ませるため。

CREATE TABLE IF NOT EXISTS app_tokens (
  key        TEXT PRIMARY KEY,
  value      TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
