import { expect, test } from '@playwright/test'

const fixtures = [
  { width: 400, height: 800, mode: 'portrait' },
  { width: 800, height: 600, mode: 'landscape' },
  { width: 1024, height: 768, mode: 'tablet' },
  { width: 1920, height: 1080, mode: 'tv' },
] as const

for (const fixture of fixtures) {
  test(`applies ${fixture.mode} mode at ${fixture.width}x${fixture.height}`, async ({ page }) => {
    await page.setViewportSize(fixture)
    await page.goto('/')
    await expect(page.locator('html')).toHaveAttribute('data-mode', fixture.mode)
  })
}
