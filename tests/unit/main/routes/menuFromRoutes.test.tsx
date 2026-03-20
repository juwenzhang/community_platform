import type { RouteConfig } from '@main/routes/index';
import { generateMenuItems } from '@main/routes/menuFromRoutes';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';

/** 辅助函数：在 Router 上下文中渲染菜单项以提取文本 */
function renderMenuItem(item: { label?: React.ReactNode }) {
  const { container } = render(<MemoryRouter>{item.label as React.ReactElement}</MemoryRouter>);
  return container;
}

describe('generateMenuItems', () => {
  it('应将路由配置转换为菜单项', () => {
    const routes: RouteConfig[] = [
      {
        path: '/',
        meta: { title: '首页', icon: 'HomeOutlined' },
      },
      {
        path: '/article/*',
        meta: { title: '文章', icon: 'FileTextOutlined' },
      },
    ];

    const items = generateMenuItems(routes);

    expect(items).toHaveLength(2);
    expect(items[0]).toHaveProperty('key', '/');
    expect(items[1]).toHaveProperty('key', '/article');
  });

  it('应过滤掉 hidden 路由', () => {
    const routes: RouteConfig[] = [
      {
        path: '/',
        meta: { title: '首页' },
      },
      {
        path: '/admin',
        meta: { title: '管理', hidden: true },
      },
      {
        path: '/profile/*',
        meta: { title: '我的' },
      },
    ];

    const items = generateMenuItems(routes);

    expect(items).toHaveLength(2);
    const keys = items.map((item) => (item as { key: string }).key);
    expect(keys).toContain('/');
    expect(keys).toContain('/profile');
    expect(keys).not.toContain('/admin');
  });

  it('应过滤掉无 meta 的路由', () => {
    const routes: RouteConfig[] = [
      {
        path: '/',
        meta: { title: '首页' },
      },
      {
        path: '/no-meta',
      },
    ];

    const items = generateMenuItems(routes);
    expect(items).toHaveLength(1);
  });

  it('路径中的 /* 后缀和尾部斜杠应被清理', () => {
    const routes: RouteConfig[] = [
      {
        path: '/feed/*',
        meta: { title: '动态' },
      },
      {
        path: '/profile/',
        meta: { title: '我的' },
      },
    ];

    const items = generateMenuItems(routes);

    expect((items[0] as { key: string }).key).toBe('/feed');
    expect((items[1] as { key: string }).key).toBe('/profile');
  });

  it('有 icon 时应映射为图标组件', () => {
    const routes: RouteConfig[] = [
      {
        path: '/',
        meta: { title: '首页', icon: 'HomeOutlined' },
      },
    ];

    const items = generateMenuItems(routes);
    expect((items[0] as { icon?: React.ReactNode }).icon).toBeDefined();
  });

  it('无 icon 时 icon 字段应为 undefined', () => {
    const routes: RouteConfig[] = [
      {
        path: '/',
        meta: { title: '首页' },
      },
    ];

    const items = generateMenuItems(routes);
    expect((items[0] as { icon?: React.ReactNode }).icon).toBeUndefined();
  });

  it('菜单项 label 应包含正确的链接文本', () => {
    const routes: RouteConfig[] = [
      {
        path: '/demo',
        meta: { title: 'Demo' },
      },
    ];

    const items = generateMenuItems(routes);
    const container = renderMenuItem(items[0] as { label: React.ReactNode });

    expect(container.textContent).toBe('Demo');
    const link = container.querySelector('a');
    expect(link).toHaveAttribute('href', '/demo');
  });

  it('空路由数组应返回空菜单', () => {
    const items = generateMenuItems([]);
    expect(items).toHaveLength(0);
  });
});
