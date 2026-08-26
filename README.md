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
| `GOOGLE_CLIENT_ID` | Google OAuth クライアントID |
| `GOOGLE_CLIENT_SECRET` | Google OAuth クライアントシークレット |
| `GOOGLE_REFRESH_TOKEN` | Gmail refresh token（初回ブートストラップ用。失効後は `/mail` の再連携ボタンから更新される） |

## Notionトークンの取得

1. [Notion Integrations](https://www.notion.so/profile/integrations) でインテグレーションを作成
2. 生成されたトークンを `NOTION_TOKEN` に設定
3. NotionのDBページで「接続先」からインテグレーションを追加

## Gmail連携のセットアップ

1. [Google Cloud Console](https://console.cloud.google.com/apis/credentials) で OAuth クライアント（ウェブアプリケーション）を作成
2. 承認済みリダイレクトURIに `https://<デプロイ先ドメイン>/api/google/callback` を追加（ローカル確認用に `http://localhost:3000/api/google/callback` も追加可）
3. クライアントID・シークレットを `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` に設定
4. 初回のみ、任意の方法（OAuth Playground 等）で `gmail.modify` スコープの refresh token を発行し `GOOGLE_REFRESH_TOKEN` に設定
5. 以降、この token が失効した場合は `/mail` を開くと表示される「Google と再連携する」ボタンから再取得できる（`wrangler kv namespace create` で作成した KV に自動保存される。手順は `wrangler.jsonc` の `kv_namespaces` コメント参照）

## デプロイ (Vercel)

1. GitHub連携でプロジェクトをインポート
2. 環境変数をVercelダッシュボードで設定
3. `NEXTAUTH_URL` を本番URLに変更
