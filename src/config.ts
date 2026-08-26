function requireEnv(key: string): string {
  const val = process.env[key]
  if (!val && process.env.NODE_ENV !== "development" && process.env.NEXTJS_ENV !== "development") {
    throw new Error(`Missing required environment variable: ${key}`)
  }
  return val ?? ""
}

export const config = {
  notion: {
    token:      requireEnv("NOTION_TOKEN"),
    databaseId: requireEnv("NOTION_DATABASE_ID"),
  },
  auth: {
    username: process.env.APP_USERNAME ?? "",
    password: process.env.APP_PASSWORD ?? "",
  },
  google: {
    clientId:     requireEnv("GOOGLE_CLIENT_ID"),
    clientSecret: requireEnv("GOOGLE_CLIENT_SECRET"),
    // refresh token は KV(TOKEN_STORE)に永続化される可変値であり、他の必須 env とは
    // 性質が異なるため config には含めない(src/lib/token-store.ts 参照)。
  },
} as const
