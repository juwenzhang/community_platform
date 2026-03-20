import { expect, test } from '@playwright/test';

test.describe('Main App — 基础检查', () => {
  test('首页应正常加载', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/Community/i);
  });

  test('导航栏应可见', async ({ page }) => {
    await page.goto('/');
    const nav = page.locator('nav, [role="navigation"], .ant-layout-sider');
    await expect(nav).toBeVisible();
  });
});

test.describe('首页 — 内容验证', () => {
  test('应显示品牌标题', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('text=Luhanxin Community')).toBeVisible();
  });

  test('应显示 Hero Banner', async ({ page }) => {
    await page.goto('/');
    // Hero Banner 中的关键文字
    await expect(page.locator('text=社区平台')).toBeVisible();
  });

  test('应显示功能卡片', async ({ page }) => {
    await page.goto('/');
    // 等待卡片渲染
    const cards = page.locator('.ant-card');
    await expect(cards.first()).toBeVisible();
    // 至少应有功能展示卡片
    expect(await cards.count()).toBeGreaterThanOrEqual(1);
  });
});

test.describe('侧边栏菜单 — 导航', () => {
  test('应显示菜单项', async ({ page }) => {
    await page.goto('/');
    const sider = page.locator('.ant-layout-sider');
    await expect(sider).toBeVisible();

    // 检查菜单项存在
    await expect(sider.locator('text=首页')).toBeVisible();
    await expect(sider.locator('text=Demo')).toBeVisible();
  });

  test('点击 Demo 菜单应跳转到 Demo 页面', async ({ page }) => {
    await page.goto('/');

    // 点击侧边栏的 Demo 菜单项
    await page.locator('.ant-layout-sider').locator('text=Demo').click();

    // 等待 URL 变化
    await expect(page).toHaveURL(/\/demo/);

    // Demo 页面应显示关键内容
    await expect(page.locator('text=端到端演示')).toBeVisible();
  });

  test('点击首页菜单应回到首页', async ({ page }) => {
    // 先去 Demo 页
    await page.goto('/demo');
    await expect(page).toHaveURL(/\/demo/);

    // 点击回首页
    await page.locator('.ant-layout-sider').locator('text=首页').click();
    await expect(page).toHaveURL('/');
  });
});

test.describe('Demo 页面 — API 测试器', () => {
  test('应显示 API 测试器组件', async ({ page }) => {
    await page.goto('/demo');

    // 等待页面加载
    await expect(page.locator('text=调用 UserService.GetUser')).toBeVisible();
  });

  test('应有 User ID 输入框和发送按钮', async ({ page }) => {
    await page.goto('/demo');

    const input = page.locator('input[placeholder="输入 User ID"]');
    await expect(input).toBeVisible();
    await expect(input).toHaveValue('user-123');

    await expect(page.locator('button:has-text("发送请求")')).toBeVisible();
  });

  test('应显示技术栈标签', async ({ page }) => {
    await page.goto('/demo');

    await expect(page.locator('text=React 18')).toBeVisible();
    await expect(page.locator('text=Protobuf')).toBeVisible();
  });
});

test.describe('布局 — 响应式', () => {
  test('Header 应始终可见', async ({ page }) => {
    await page.goto('/');
    const header = page.locator('.ant-layout-header');
    await expect(header).toBeVisible();
  });

  test('Content 区域应可见', async ({ page }) => {
    await page.goto('/');
    const content = page.locator('.ant-layout-content');
    await expect(content).toBeVisible();
  });
});
