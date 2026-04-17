# notion-tasks

Notionのタスク管理DBに高速アクセスするWebツール。

## セットアップ

```bash
# 依存インストール
npm install

# 環境変数設定
cp .env.example .env.local
# .env.local を編集して各値を設定

# 開発サーバー起動
npm run dev
```

## 環境変数

| 変数名 | 説明 |
|---|---|
| `NEXTAUTH_SECRET` | セッション署名用シークレット (`openssl rand -base64 32` で生成) |
| `NEXTAUTH_URL` | アプリのURL（本番では `https://your-domain.vercel.app`）|
| `APP_USERNAME` | ログインユーザー名 |
| `APP_PASSWORD` | ログインパスワード |
| `NOTION_TOKEN` | Notionインテグレーショントークン |
| `NOTION_DATABASE_ID` | 対象データベースのID |

## Notionトークンの取得

1. [Notion Integrations](https://www.notion.so/profile/integrations) でインテグレーションを作成
2. 生成されたトークンを `NOTION_TOKEN` に設定
3. NotionのDBページで「接続先」からインテグレーションを追加

## デプロイ (Vercel)

1. GitHub連携でプロジェクトをインポート
2. 環境変数をVercelダッシュボードで設定
3. `NEXTAUTH_URL` を本番URLに変更
