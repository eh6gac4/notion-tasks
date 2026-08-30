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
  // 視覚回帰は baseline が CI ランナーの描画と一致しないため CI では除外する
  // （baseline を CI 環境で再生成する運用が必要。#173 で追跡）。ローカルでは流す。
  grepInvert: process.env.CI ? [/視覚回帰/] : undefined,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  expect: {
    timeout: 15_000,
    toHaveScreenshot: {
      maxDiffPixelRatio: 0.01,
      animations: "disabled",
      caret: "hide",
      scale: "css",
    },
  },
  snapshotPathTemplate: "e2e/snapshots/baseline/{arg}{ext}",
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
    },
    {
      name: "Desktop Chrome",
      use: {
        ...devices["Desktop Chrome"],
        storageState: "e2e/.auth/user.json",
      },
      dependencies: ["setup"],
      testIgnore: ["**/snapshot.spec.ts", "**/pwa.spec.ts"],
    },
  ],
  webServer: {
    // CI では Docker を使わずランナー上で直接 dev サーバーを起動する。
    // ローカルは従来どおり docker compose 経由（CLAUDE.md の開発フロー）。
    command: process.env.CI
      ? "npm run dev"
      : "docker compose rm -sf dev && docker compose up --force-recreate dev",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
})
