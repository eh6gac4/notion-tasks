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

## Design System

### 4px グリッド

すべての spacing・sizing は **4px の倍数** に統一する。

**Tailwind CSS:** `.5` サフィックスクラス（`p-0.5`=2px、`p-1.5`=6px、`p-2.5`=10px、`p-3.5`=14px）は使用禁止。整数クラスのみ使用する。

| クラス | px |
|--------|-----|
| p-1    | 4   |
| p-2    | 8   |
| p-3    | 12  |
| p-4    | 16  |
| p-5    | 20  |
| p-6    | 24  |
| p-8    | 32  |

**インラインスタイル:** ピクセル値を直接指定する場合も 4 の倍数にすること（例: `8px`、`12px`、`20px`）。

**例外:** 装飾的な細線（ローディングバー等）は `2px` のみ許容。
