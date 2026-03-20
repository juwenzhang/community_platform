import { defineConfig, devices } from '@playwright/test';

/**
 * Luhanxin Community Platform — Playwright E2E 测试配置
 *
 * 运行方式:
 *   pnpm test:e2e          — 运行所有 E2E 测试
 *   pnpm test:e2e:ui       — 打开 Playwright UI 模式
 *   pnpm test:e2e:debug    — 调试模式
 */
export default defineConfig({
  testDir: './e2e',
  outputDir: './e2e/test-results',

  /* 全局超时 */
  timeout: 30_000,
  expect: { timeout: 5_000 },

  /* 并行度 */
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,

  /* 报告 */
  reporter: process.env.CI
    ? [['html', { open: 'never' }], ['github']]
    : [['html', { open: 'on-failure' }]],

  /* 全局配置 */
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },

  /* 浏览器配置 */
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
  ],

  /* 开发服务器 — 测试前自动启动 */
  webServer: {
    command: 'pnpm dev:main',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
});
