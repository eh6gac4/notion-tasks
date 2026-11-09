# notion-tasks

タスク管理とGmail連携のWebツール。タスクはCloudflare D1、添付ファイルはR2に保存する。開発時はインメモリのサンプルデータを使う。

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
| `GOOGLE_CLIENT_ID` | Google OAuth クライアントID |
| `GOOGLE_CLIENT_SECRET` | Google OAuth クライアントシークレット |
| `GOOGLE_REFRESH_TOKEN` | Gmail refresh token（初回ブートストラップ用。失効後は `/mail` の再連携ボタンから更新される） |

## パスキー

パスワードでログインし、「設定 → パスキー」から登録する。次回からログイン画面の「パスキーでログイン」を使える。複数端末の登録と削除に対応し、パスワードログインも引き続き利用できる。

本番反映前に以下を実施する。

```bash
npx wrangler d1 migrations apply notion-tasks --remote
```

`PASSKEY_ORIGIN` に公開 URL（例 `https://tasks.example.com`）を設定する。省略時は `AUTH_URL`、`NEXTAUTH_URL` の順に参照する。HTTPS が必須で、開発用には `http://localhost:3000` のみ利用できる。登録したパスキーは登録時のドメインに紐づくため、普段アクセスするドメインに統一する。`APP_USERNAME` を変更した場合は再登録が必要。

パスキーの保存・認証には D1 バインディング `DB` と上記マイグレーションが必要。通常の開発サーバーはタスク用のインメモリデータを使うため、パスキーの実機確認には D1 を使える Cloudflare プレビュー環境を利用する。開発環境でも登録・削除には実際のログインが必要。

SimpleWebAuthn は現行の 13 系を npm alias で参照する。Auth.js の組み込み WebAuthn provider が要求する任意の 9 系 peer 依存と分離し、認証結果は既存の Credentials provider と同じ JWT セッションに接続する。

ローカルの Cloudflare プレビューとローカル D1 を起動し、マイグレーション適用後に `APP_USERNAME=... APP_PASSWORD=... npm run test:passkeys` を実行すると、Chromium の仮想認証器で登録・ログイン・削除・削除後の認証拒否を確認できる。接続先は既定で `http://localhost:8787`（`PASSKEY_TEST_URL` で変更可能）。`PASSKEY_ORIGIN` と `NEXTAUTH_URL` を接続先に揃える。ローカルプレビューは本番 `routes` を外した一時設定を使う（Wrangler による Origin の本番ドメインへの書き換えを防ぐため）。テスト用アカウントとローカル D1 を使用する。

## Gmail連携のセットアップ

1. [Google Cloud Console](https://console.cloud.google.com/apis/credentials) で OAuth クライアント（ウェブアプリケーション）を作成
2. 承認済みリダイレクトURIに `https://<デプロイ先ドメイン>/api/google/callback` を追加（ローカル確認用に `http://localhost:3000/api/google/callback` も追加可）
3. クライアントID・シークレットを `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` に設定
4. 初回のみ、任意の方法（OAuth Playground 等）で `gmail.modify` スコープの refresh token を発行し `GOOGLE_REFRESH_TOKEN` に設定
5. 以降、この token が失効した場合は `/mail` を開くと表示される「Google と再連携する」ボタンから再取得できる（D1 の `app_tokens` テーブルに自動保存される。テーブル作成は `migrations/0003_app_tokens.sql` を適用する）

## デプロイ (Vercel)

1. GitHub連携でプロジェクトをインポート
2. 環境変数をVercelダッシュボードで設定
3. `NEXTAUTH_URL` を本番URLに変更
