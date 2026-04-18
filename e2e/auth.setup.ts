import { test as setup, expect } from "@playwright/test"
import * as fs from "fs"

const AUTH_FILE = "e2e/.auth/user.json"

setup("authenticate", async ({ page }) => {
  await page.goto("/login")
  await page.getByLabel("ユーザー名").fill(process.env.APP_USERNAME!)
  await page.getByLabel("パスワード").fill(process.env.APP_PASSWORD!)
  await page.getByRole("button", { name: "ログイン" }).click()
  await page.waitForURL("/")
  await expect(page.locator("h1")).toContainText("To-do")

  fs.mkdirSync("e2e/.auth", { recursive: true })
  await page.context().storageState({ path: AUTH_FILE })
})
