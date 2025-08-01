import { devices } from 'playwright';

const config = {
  testDir: './test',
  timeout: 30 * 1000,
  expect: {
    timeout: 5000
  },
  fullyParallel: true,
  retries: 1,
  reporter: 'html',
  use: {
    baseURL: 'https://playwright.dev',
    actionTimeout: 0,
    ignoreHTTPSErrors: true,
    video: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] }
    }
  ]
};

module.exports = config;
