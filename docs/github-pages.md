# Google OAuth向け公開ページ

`site/` にアプリ紹介・プライバシーポリシー・利用規約を置く。Next.jsとは独立した静的HTMLで、ビルドは不要。

## 公開

GitHub Pagesの公開元は `gh-pages` ブランチのルート。公開用ブランチには `site/` の内容だけを載せる。

作業ブランチ上で変更をコミットし、PRで保持した後に実行する。

```sh
git fetch origin
pages_tree=$(git rev-parse HEAD:site)
if git show-ref --verify --quiet refs/remotes/origin/gh-pages; then
  pages_commit=$(git commit-tree "$pages_tree" -p origin/gh-pages -m "Update public pages")
else
  pages_commit=$(git commit-tree "$pages_tree" -m "Publish public pages")
fi
git push origin "$pages_commit":refs/heads/gh-pages
```

初回の公開元はリポジトリの Settings → Pages で `Deploy from a branch`、`gh-pages`、`/ (root)` を指定する。

`site/CNAME` の独自ドメインをPages設定にも指定する。DNSには次を登録する。

| 種別 | 名前 | 値 |
| --- | --- | --- |
| CNAME | about | eh6gac4.github.io |

DNSがCloudflareの場合はDNS onlyにし、PagesでHTTPSの証明書発行が完了した後にEnforce HTTPSを有効にする。既存の `todo.eh6gac4.work` の設定は変更しない。

## Google Auth Platform

| 項目 | URL |
| --- | --- |
| ホームページ | https://about.eh6gac4.work/ |
| プライバシーポリシー | https://about.eh6gac4.work/privacy.html |
| 利用規約 | https://about.eh6gac4.work/terms.html |
| 承認済みドメイン | eh6gac4.work |

審査で所有権確認が必要な場合は、同じGoogle Cloudプロジェクトのオーナーまたは編集者のGoogleアカウントでSearch Consoleのドメインプロパティ `eh6gac4.work` を確認する。DNSのTXT値はSearch Consoleが発行する値を使用する。

ブランディングの構成を保存し、対象画面で本番環境へ変更した後、アプリのメール画面からGoogleと再連携して新しいトークンを取得する。

## 更新時の確認

- 3ページとCSSが取得でき、各ページ内のリンクが有効であること。
- モバイル幅で横にはみ出さず、ログインせずに表示できること。
- Google権限・機能・保存先が現行の実装と一致すること。
- 個人情報やトークンを公開ファイルへ含めていないこと。

## 参考

- [GitHub Pagesのカスタムドメイン](https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site/managing-a-custom-domain-for-your-github-pages-site)
- [Google OAuthブランディング](https://support.google.com/cloud/answer/15549049)
- [Googleのホームページ要件](https://support.google.com/cloud/answer/13807376)
