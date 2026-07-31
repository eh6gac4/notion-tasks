# Original User Request

## Initial Request — 2026-07-31T12:00:00Z

# Teamwork Project Prompt — Draft

> Status: Launched
> Goal: Craft prompt → get user approval → delegate to teamwork_preview

既存のNext.jsプロジェクト（`notion-tasks`）に、Gmailライクな操作感を持つNotion Mail代替のメーラー機能（モックデモ）を追加する。実際のメール送受信は行わず、フロントエンドのUIとモックデータのみを実装する。

Working directory: /home/ctoshiki/dev/notion-tasks
Integrity mode: development

## Requirements

### R1. Gmailライクな基本UIと操作感のモック実装
- サイドバー（受信トレイ、送信済みなど）、メールリスト、メール詳細の3ペインまたは2ペイン構成を作成する。
- 実際のバックエンドAPIではなく、モックデータを使用するアーキテクチャとする。
- Gmail風のショートカットキー（`j`/`k`でメールの上下移動、`c`で新規作成モーダル表示）を実装する。

### R2. Notion風のエディタ体験（新規作成画面）
- メールの新規作成・返信画面において、Markdownでの記述・表示をサポートする。
- 「/（スラッシュ）」コマンドによる入力補助UIのモックを実装する（例: `/task`, `/ai` などのメニュー表示）。

### R3. Notion連携・AI機能のモックUI
- メールの詳細画面から「Notionデータベースへタスクとして追加」するボタンとUIフロー（モック）を実装する。
- AIによる「メールの自動下書き生成」ボタンと、生成中・生成後のUIフロー（モック）を実装する。

## Acceptance Criteria

### UI / Layout
- [ ] `/mail` ルートにアクセスした際、サイドバー、メールリスト、詳細画面が表示されること。
- [ ] モックデータがリストおよび詳細画面に正しく反映されていること。

### Interactions & Features
- [ ] キーボードの `j` と `k` を押した際、リストの選択行が上下に移動すること。
- [ ] キーボードの `c` を押した際、新規作成画面（モーダル等）が表示されること。
- [ ] 新規作成エディタ内でMarkdownがパースされてプレビューまたは装飾されること。
- [ ] 新規作成エディタ内で `/` を入力した際、コマンドメニューのポップアップが表示されること。
- [ ] メール詳細画面に「タスク化」「AI下書き生成」のアクションボタンが存在し、クリック時にモックの完了状態（トースト通知など）が示されること。

### Code Quality
- [ ] `npm run lint` および `npm run test:unit` （あるいは `npm run build`）がエラーなく通過すること。

---
*Next: ユーザーの承認（Proceed）が得られ次第、マルチエージェント（teamwork_preview）に実装を委譲します。*
