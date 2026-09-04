import { defineConfig, devices } from '@playwright/test';

const PORT = Number(process.env.TEST_PORT ?? 4173);

/**
 * Tests run against the real production build served by the app's own Express
 * server — the same path users get, CSP headers included. Testing the dev
 * server would miss anything that only breaks once bundled.
 */
export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : [['list']],

  use: {
    baseURL: `http://127.0.0.1:${PORT}`,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },

  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1440, height: 900 },
      },
    },
  ],

  webServer: {
    command: 'npm run build && npm run start',
    url: `http://127.0.0.1:${PORT}`,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
    env: {
      PORT: String(PORT),
      HOST: '127.0.0.1',
      NODE_ENV: 'production',
    },
  },
});
