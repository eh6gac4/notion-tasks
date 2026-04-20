function requireEnv(key: string): string {
  const val = process.env[key]
  if (!val && process.env.NODE_ENV !== "development") {
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
} as const
