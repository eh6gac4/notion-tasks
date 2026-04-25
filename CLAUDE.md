@AGENTS.md

# Development Workflow

## 1. ブランチ作成

作業開始前に必ず main から新しいブランチを切る。

```
git checkout -b <branch-name>
```

## 2. 開発・動作確認

dev サーバーは Docker で起動する。ホストで `npm run dev` を直接実行しない。

```
docker compose up -d --build --force-recreate
```

コード変更後はコンテナを再起動して動作を確認する。

## 3. コミット前テスト

**ユニットテスト**（先に実行）

```
source ~/.nvm/nvm.sh && npm run test:unit
```

**Playwright テスト**（コンテナ停止が必要。Playwright が自動で再生成するため競合を防ぐ）

```
docker compose down && source ~/.nvm/nvm.sh && npx playwright test && docker compose up -d --build --force-recreate
```

## 4. コミット・プッシュ・PR 作成

テストがすべて通過したらコミット・プッシュし、PR を作成してマージする。

## 5. マージ後の後処理

main に戻し、作業ブランチを削除する。

```
git checkout main && git pull
git branch -d <branch-name>
```
