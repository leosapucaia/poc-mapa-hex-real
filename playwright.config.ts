import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  timeout: 120_000,
  retries: 1,
  use: {
    baseURL: 'http://localhost:4173',
    viewport: { width: 1440, height: 900 },
    actionTimeout: 30_000,
  },
  webServer: {
    command: 'npx vite preview --port 4173',
    port: 4173,
    reuseExistingServer: !process.env.CI,
    timeout: 30_000,
  },
})
