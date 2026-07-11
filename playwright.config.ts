import { defineConfig, devices } from '@playwright/test'

const executablePath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: 'http://127.0.0.1:3000',
    headless: true,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: executablePath ? 'off' : 'retain-on-failure',
    launchOptions: executablePath ? { executablePath, args: ['--no-sandbox'] } : undefined,
  },
  projects: [
    { name: 'desktop-chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile-chromium', use: { ...devices['Pixel 7'] }, testMatch: /mobile|accessibility/ },
  ],
  webServer: {
    command: 'rm -rf .tmp/e2e && mkdir -p .tmp/e2e && npm run build && npm run start',
    url: 'http://127.0.0.1:3000/api/health',
    reuseExistingServer: true,
    timeout: 120_000,
    env: {
      HOST: '127.0.0.1',
      PORT: '3000',
      NODE_ENV: 'test',
      SYCO_DB_DRIVER: 'native',
      SYCO_DB_PATH: '.tmp/e2e/control.sqlite',
      SYCO_DATA_DIR: '.tmp/e2e',
      SYCO_ASSET_DIR: '.tmp/e2e/assets',
      SYCO_PREVIEW_DIR: '.tmp/e2e/preview',
      SYCO_BACKUP_DIR: '.tmp/e2e/backups',
    },
  },
})
