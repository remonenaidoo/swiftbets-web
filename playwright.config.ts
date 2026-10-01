import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: 'e2e',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: { baseURL: 'http://127.0.0.1:4010', trace: 'retain-on-failure' },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
    { name: 'phone', use: { ...devices['Pixel 7'] } },
  ],
  webServer: [
    { command: 'node e2e/fake-gateway.mjs', url: 'http://127.0.0.1:4011/__emails', reuseExistingServer: !process.env.CI },
    { command: 'node server.mjs', url: 'http://127.0.0.1:4010/healthz', env: { PORT: '4010', GATEWAY_URL: 'http://127.0.0.1:4011', CHECKOUT_ORIGINS: 'http://127.0.0.1:4011' }, reuseExistingServer: !process.env.CI },
  ],
});
