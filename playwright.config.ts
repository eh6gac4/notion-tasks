import { defineConfig, devices } from "@playwright/test"
import * as dotenv from "dotenv"
import * as path from "path"

dotenv.config({ path: path.resolve(__dirname, ".env.local"), override: true })

export default defineConfig({
  testDir: "./e2e",
  timeout: 60_000,
  retries: 2,
  workers: 1,
  fullyParallel: false,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  expect: {
    timeout: 15_000,
  },
  projects: [
    {
      name: "setup",
      testMatch: "auth.setup.ts",
      retries: 2,
    },
    {
      name: "iPhone 15 (touch)",
      use: {
        ...devices["iPhone 15"],
        hasTouch: true,
        storageState: "e2e/.auth/user.json",
      },
      dependencies: ["setup"],
      testIgnore: ["**/swipe.spec.ts"],
    },
    {
      // スワイプは CDP が必要なため Chromium で実行
      name: "Chromium Touch",
      use: {
        ...devices["iPhone 15"],
        browserName: "chromium",
        hasTouch: true,
        storageState: "e2e/.auth/user.json",
      },
      dependencies: ["setup"],
      testMatch: ["**/swipe.spec.ts"],
    },
    {
      name: "Desktop Chrome",
      use: {
        ...devices["Desktop Chrome"],
        storageState: "e2e/.auth/user.json",
      },
      dependencies: ["setup"],
      testIgnore: ["**/swipe.spec.ts", "**/snapshot.spec.ts", "**/pwa.spec.ts"],
    },
  ],
  webServer: {
    command: "docker compose rm -sf dev && docker compose up --force-recreate dev",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
})
