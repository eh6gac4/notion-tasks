import { defineConfig, devices } from "@playwright/test"
import * as dotenv from "dotenv"
import * as path from "path"

dotenv.config({ path: path.resolve(__dirname, ".env.local"), override: true })

export default defineConfig({
  testDir: "./e2e",
  timeout: 45_000,
  retries: 2,
  workers: 2,
  fullyParallel: false,
  reporter: "list",
  use: {
    baseURL: "http://localhost:3000",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  expect: {
    timeout: 10_000,
  },
  projects: [
    {
      name: "setup",
      testMatch: "auth.setup.ts",
    },
    {
      name: "iPhone 15 (touch)",
      use: {
        ...devices["iPhone 15"],
        hasTouch: true,
        storageState: "e2e/.auth/user.json",
      },
      dependencies: ["setup"],
    },
    {
      name: "Desktop Chrome",
      use: {
        ...devices["Desktop Chrome"],
        storageState: "e2e/.auth/user.json",
      },
      dependencies: ["setup"],
      testIgnore: ["**/tap.spec.ts", "**/snapshot.spec.ts", "**/pwa.spec.ts"],
    },
  ],
  webServer: {
    command: "docker compose rm -sf dev && docker compose up --force-recreate dev",
    url: "http://localhost:3000",
    reuseExistingServer: false,
    timeout: 120_000,
  },
})
