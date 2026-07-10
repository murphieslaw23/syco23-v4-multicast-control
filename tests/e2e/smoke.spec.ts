import { test, expect } from '@playwright/test'

test('SYCO23 brand header is visible on root page', async ({ page }) => {
  await page.goto('/')
  const header = page.locator('.syco-header')
  await expect(header).toBeVisible()
  await expect(header.locator('.syco-brand')).toHaveText('SYCO23')
})

test('navigation items are present', async ({ page }) => {
  await page.goto('/')
  const nav = page.locator('.syco-nav')
  await expect(nav).toBeVisible()
  await expect(nav.locator('[data-nav="live"]')).toBeVisible()
  await expect(nav.locator('[data-nav="destinations"]')).toBeVisible()
  await expect(nav.locator('[data-nav="logs"]')).toBeVisible()
})
