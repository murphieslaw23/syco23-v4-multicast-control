import { expect, test } from '@playwright/test'

test('keeps critical controls reachable and touch-sized on mobile', async ({ page }) => {
  await page.goto('/')
  await expect(page.locator('html')).toHaveAttribute('data-mode', 'portrait')
  const mobileNavigation = page.getByRole('navigation', { name: 'Mobile' })
  await expect(mobileNavigation).toBeVisible()

  const buttons = mobileNavigation.getByRole('button')
  const count = await buttons.count()
  expect(count).toBeGreaterThanOrEqual(6)
  for (let index = 0; index < count; index += 1) {
    const box = await buttons.nth(index).boundingBox()
    expect(box?.height ?? 0).toBeGreaterThanOrEqual(44)
  }

  await mobileNavigation.locator('[data-nav="destinations"]').click()
  await expect(page.getByRole('heading', { name: 'destinations' })).toBeVisible()
})
