import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  timeout: 60_000,
  expect: {
    timeout: 10_000
  },
  outputDir: './test-results',
  reporter: [['html', { outputFolder: './playwright-report' }]],
  use: {
    baseURL: 'http://127.0.0.1:5173',
    headless: true
  },
  webServer: {
    command: 'pnpm dev -- --host 0.0.0.0 --port 5173',
    port: 5173,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000
  }
});
