import { defineConfig, devices } from '@playwright/test'
export default defineConfig({
  testDir: './tests/e2e',
  testMatch: 'game-seal-run.e2e.spec.ts',
  workers: 1,
  retries: 0,
  timeout: 45000,
  reporter: 'list',
  use: { ...devices['Desktop Chrome'], screenshot: 'only-on-failure' },
  webServer: {
    command: 'node tools/serve-seal-run.mjs',
    url: 'http://127.0.0.1:4173/games/seal-run-v1/',
    reuseExistingServer: true,
  },
})
