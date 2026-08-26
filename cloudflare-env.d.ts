// wrangler kv/r2/services 等のバインディング型。
// `npm run cf-typegen` で自動生成する運用に切り替えたら、このファイルは置き換えて良い。
interface CloudflareEnv {
  TOKEN_STORE: KVNamespace
}
