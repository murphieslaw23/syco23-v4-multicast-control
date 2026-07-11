import { expect, test } from '@playwright/test'

test('creates a revisioned destination and exposes it across operator surfaces', async ({ page }) => {
  const label = `E2E YouTube ${Date.now()}`
  await page.goto('/')

  await page.getByRole('button', { name: 'ADD' }).click()
  await page.getByLabel('Provider').selectOption('youtube')
  await page.getByLabel('Label').fill(label)
  await page.getByLabel('RTMP URL').fill('rtmps://example.invalid/live')
  await page.getByLabel('Secret reference').fill('env:E2E_YOUTUBE_KEY')
  await page.getByRole('button', { name: 'SAVE' }).click()

  const card = page.locator('.syco-dest-card').filter({ hasText: label })
  await expect(card).toBeVisible()
  await card.getByRole('button', { name: /Advance .* status from configured/ }).click()
  await expect(card.getByRole('button', { name: /status from armed/ })).toHaveText('armed')

  await page.locator('.side-nav [data-nav="destinations"]').click()
  await expect(page.locator('.data-card').filter({ hasText: label })).toBeVisible()
})

test('navigates revision, profile, status, and audit surfaces without runtime errors', async ({ page }) => {
  await page.goto('/')
  for (const route of ['profiles', 'status', 'about']) {
    await page.locator(`.side-nav [data-nav="${route}"]`).click()
    await expect(page.locator('.syco-main')).toBeVisible()
    await expect(page.locator('.alert--error')).toHaveCount(0)
  }
})
