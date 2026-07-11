import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

for (const route of ['live', 'destinations', 'profiles', 'about'] as const) {
  test(`${route} surface has no WCAG A/AA violations`, async ({ page }) => {
    await page.goto('/')
    if (route !== 'live') await page.locator(`[data-nav="${route}"]`).first().click()
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze()
    expect(results.violations).toEqual([])
  })
}
