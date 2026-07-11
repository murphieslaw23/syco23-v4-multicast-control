import { expect, test } from '@playwright/test'

test('loads the authenticated production control shell', async ({ page }) => {
  await page.goto('/')
  await expect(page.locator('.syco-header')).toBeVisible()
  await expect(page.locator('.syco-brand')).toHaveText('SYCO23')
  await expect(page.getByRole('navigation', { name: 'Primary' })).toBeVisible()
  await expect(page.getByRole('navigation', { name: 'Primary' }).locator('[data-nav="live"]')).toHaveAttribute('aria-current', 'page')
})

test('exposes the operational routes', async ({ page }) => {
  await page.goto('/')
  for (const route of ['destinations', 'profiles', 'templates', 'schedule', 'archive', 'status', 'logs', 'overlay', 'about']) {
    await expect(page.locator(`.side-nav [data-nav="${route}"]`)).toBeVisible()
  }
})
