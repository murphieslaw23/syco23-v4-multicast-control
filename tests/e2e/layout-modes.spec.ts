import { test, expect } from '@playwright/test'

test.describe('layout modes', () => {
  test('applies portrait class for tall narrow viewport', async ({ page }) => {
    await page.setViewportSize({ width: 400, height: 800 })
    await page.goto('/')
    const html = page.locator('html')
    await expect(html).toHaveAttribute('data-mode', 'portrait')
  })

  test('applies landscape class for wide short viewport', async ({ page }) => {
    await page.setViewportSize({ width: 800, height: 600 })
    await page.goto('/')
    const html = page.locator('html')
    await expect(html).toHaveAttribute('data-mode', 'landscape')
  })

  test('applies tablet class for 1024x768 viewport', async ({ page }) => {
    await page.setViewportSize({ width: 1024, height: 768 })
    await page.goto('/')
    const html = page.locator('html')
    await expect(html).toHaveAttribute('data-mode', 'tablet')
  })

  test('applies tv class for 1920x1080 viewport', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 })
    await page.goto('/')
    const html = page.locator('html')
    await expect(html).toHaveAttribute('data-mode', 'tv')
  })

  test('navigation is visible across all modes', async ({ page }) => {
    const viewports: Array<{ width: number; height: number }> = [
      { width: 400, height: 800 },
      { width: 800, height: 600 },
      { width: 1024, height: 768 },
      { width: 1920, height: 1080 },
    ]
    for (const vp of viewports) {
      await page.setViewportSize(vp)
      await page.goto('/')
      const nav = page.locator('.syco-nav')
      await expect(nav).toBeVisible()
    }
  })
})
