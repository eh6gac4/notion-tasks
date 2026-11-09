// ローカル Cloudflare プレビューで実行する。D1 と仮想認証器を使い、API をモックしない。
import assert from "node:assert/strict"
import { chromium, expect } from "@playwright/test"

const baseURL = process.env.PASSKEY_TEST_URL ?? "http://localhost:8787"
const username = process.env.APP_USERNAME
const password = process.env.APP_PASSWORD
const keyName = `Smoke test ${Date.now()}`
assert.ok(username && password, "APP_USERNAME と APP_PASSWORD を設定してください")

const browser = await chromium.launch({ headless: true })
try {
  const context = await browser.newContext({ baseURL })
  const page = await context.newPage()
  const cdp = await context.newCDPSession(page)
  await cdp.send("WebAuthn.enable")
  await cdp.send("WebAuthn.addVirtualAuthenticator", {
    options: { protocol: "ctap2", transport: "internal", hasResidentKey: true,
      hasUserVerification: true, isUserVerified: true, automaticPresenceSimulation: true },
  })

  const unauthorized = await context.request.get("/api/passkeys")
  assert.equal(unauthorized.status(), 401)
  const crossOrigin = await context.request.post("/api/passkeys/options", {
    headers: { origin: "https://evil.example" }, data: { purpose: "register" },
  })
  assert.equal(crossOrigin.status(), 403)

  await page.goto("/login")
  await page.getByLabel("ユーザー名", { exact: true }).fill(username)
  await page.getByLabel("パスワード", { exact: true }).fill(password)
  await page.getByRole("button", { name: "ACCESS", exact: true }).click()
  await page.waitForURL(baseURL + "/")
  console.log("パスワードログイン: OK")

  await page.getByRole("button", { name: "設定を開く" }).click()
  await page.getByLabel("パスキー名（任意）").fill(keyName)
  await page.getByRole("button", { name: "パスキーを登録", exact: true }).click()
  await expect(page.getByRole("region", { name: "パスキー", exact: true }).getByRole("status")).toHaveText("パスキーを登録しました", { timeout: 15000 })
  console.log("パスキー登録 (D1): OK")

  await context.clearCookies()
  await page.goto("/login")
  await page.getByRole("button", { name: "パスキーでログイン", exact: true }).click()
  await page.waitForURL(baseURL + "/")
  const session = await (await context.request.get("/api/auth/session")).json()
  assert.equal(session.user?.name, username)
  console.log("パスキーログイン (Auth.js セッション): OK")

  await page.getByRole("button", { name: "設定を開く" }).click()
  page.once("dialog", dialog => dialog.accept())
  await page.getByRole("button", { name: `${keyName}を削除`, exact: true }).click()
  await expect(page.getByRole("region", { name: "パスキー", exact: true }).getByRole("status")).toHaveText("パスキーを削除しました")
  console.log("パスキー削除: OK")

  await context.clearCookies()
  await page.goto("/login")
  await page.getByRole("button", { name: "パスキーでログイン", exact: true }).click()
  await expect(page.getByRole("alert").filter({ hasText: "パスキーで認証できませんでした" })).toBeVisible()
  const loggedOut = await (await context.request.get("/api/auth/session")).json()
  assert.ok(!loggedOut?.user)
  console.log("削除済みパスキーの拒否: OK")
} finally {
  await browser.close()
}
