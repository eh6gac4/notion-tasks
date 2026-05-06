import { test, expect } from "@playwright/test"

test.describe("PWA マニフェスト", () => {
  test("/manifest.webmanifest が正しく返される", async ({ request }) => {
    const response = await request.get("/manifest.webmanifest")
    expect(response.status()).toBe(200)

    const manifest = await response.json()
    expect(manifest.display).toBe("standalone")
    expect(manifest.theme_color).toBe("#dc143c")
    expect(manifest.background_color).toBe("#0b0008")
    expect(Array.isArray(manifest.icons)).toBe(true)
    expect(manifest.icons.length).toBeGreaterThan(0)

    const pngIcons = manifest.icons.filter((i: { type: string }) => i.type === "image/png")
    expect(pngIcons.length).toBeGreaterThanOrEqual(2)
  })

  test("/icon-192 が PNG を返す", async ({ request }) => {
    const response = await request.get("/icon-192")
    expect(response.status()).toBe(200)
    expect(response.headers()["content-type"]).toContain("image/png")
  })

  test("/icon-512 が PNG を返す", async ({ request }) => {
    const response = await request.get("/icon-512")
    expect(response.status()).toBe(200)
    expect(response.headers()["content-type"]).toContain("image/png")
  })
})

test.describe("iOS PWA スプラッシュ", () => {
  test("/splash/750x1334 が PNG を返す", async ({ request }) => {
    const response = await request.get("/splash/750x1334")
    expect(response.status()).toBe(200)
    expect(response.headers()["content-type"]).toContain("image/png")
  })

  test("/splash/1290x2796 が PNG を返す", async ({ request }) => {
    const response = await request.get("/splash/1290x2796")
    expect(response.status()).toBe(200)
    expect(response.headers()["content-type"]).toContain("image/png")
  })

  test("apple-touch-startup-image link が複数登録されている", async ({ page }) => {
    await page.goto("/")
    const count = await page.locator('link[rel="apple-touch-startup-image"]').count()
    expect(count).toBeGreaterThanOrEqual(5)

    const first = await page.locator('link[rel="apple-touch-startup-image"]').first()
    expect(await first.getAttribute("href")).toMatch(/\/splash\/\d+x\d+/)
    expect(await first.getAttribute("media")).toContain("device-width")
  })
})

test.describe("Service Worker", () => {
  test("/sw.js が SKIP_WAITING メッセージを受け付ける", async ({ request }) => {
    const response = await request.get("/sw.js")
    expect(response.status()).toBe(200)
    const body = await response.text()
    expect(body).toContain("SKIP_WAITING")
    expect(body).toContain("addEventListener(\"message\"")
  })
})
