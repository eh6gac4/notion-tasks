import { test as setup, expect } from "@playwright/test"
import * as fs from "fs"

const AUTH_FILE = "e2e/.auth/user.json"

setup("authenticate", async ({ page }) => {
  setup.setTimeout(60_000)
  await page.goto("/login")
  await page.getByLabel("ユーザー名").fill(process.env.APP_USERNAME!)
  await page.getByLabel("パスワード").fill(process.env.APP_PASSWORD!)
  await page.getByRole("button", { name: "ACCESS" }).click()
  await page.waitForURL("/", { timeout: 15_000 })
  await expect(page.locator("h1")).toContainText("To-do", { timeout: 10_000 })

  fs.mkdirSync("e2e/.auth", { recursive: true })
  await page.context().storageState({ path: AUTH_FILE })
})
