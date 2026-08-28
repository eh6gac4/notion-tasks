// wrangler kv/r2/services 等のバインディング型。
// `npm run cf-typegen` で自動生成する運用に切り替えたら、このファイルは置き換えて良い。
//
// グローバル宣言ファイルなので top-level import は使えない (module 化してしまう)。
// D1/R2 の型は inline import 型で参照する。
interface CloudflareEnv {
  TOKEN_STORE: KVNamespace
  // D1 移行用。wrangler.jsonc 側のバインディングを有効にするまで存在しないため optional。
  DB?: import("@cloudflare/workers-types").D1Database
  ATTACHMENTS?: import("@cloudflare/workers-types").R2Bucket
}
