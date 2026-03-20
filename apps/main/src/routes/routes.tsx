import { lazy } from 'react';
import type { RouteConfig } from './index';

/**
 * 路由配置表
 *
 * - 新增页面只需在此添加一条配置
 * - 菜单会从 meta 字段自动生成
 * - component 使用 lazy() 实现代码分割
 * - garfish 字段标记微前端子应用
 */
const routes: RouteConfig[] = [
  {
    path: '/',
    index: true,
    component: lazy(() => import('@/pages/home')),
    meta: {
      title: '首页',
      icon: 'HomeOutlined',
    },
  },
  {
    path: '/demo',
    component: lazy(() => import('@/pages/demo')),
    meta: {
      title: 'Demo',
      icon: 'ThunderboltOutlined',
    },
  },
  {
    path: '/feed/*',
    garfish: {
      appName: 'feed',
      entry: 'http://localhost:5174',
    },
    meta: {
      title: '动态',
      icon: 'ReadOutlined',
    },
  },
  {
    path: '/article/*',
    component: lazy(() => import('@/pages/article')),
    meta: {
      title: '文章',
      icon: 'FileTextOutlined',
    },
  },
  {
    path: '/profile/*',
    component: lazy(() => import('@/pages/profile')),
    meta: {
      title: '我的',
      icon: 'UserOutlined',
    },
  },
];

export default routes;
