import { lazy } from 'react';
import type { RouteConfig } from './index';

/**
 * 本地路由配置表
 *
 * - 新增页面只需在此添加一条配置
 * - 菜单会从 meta 字段自动生成
 * - component 使用 lazy() 实现代码分割
 * - garfish 字段标记微前端子应用（entry 从 registry 运行时解析）
 */
const localRoutes: RouteConfig[] = [
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
    path: '/auth',
    component: lazy(() => import('@/pages/auth')),
    meta: {
      title: '登录',
      hidden: true,
    },
  },
  {
    path: '/post/*',
    component: lazy(() => import('@/pages/post')),
    meta: {
      title: '文章',
      hidden: true,
    },
  },
  {
    path: '/profile/*',
    component: lazy(() => import('@/pages/profile')),
    meta: {
      title: '个人中心',
      hidden: true,
      auth: true,
    },
  },
  {
    path: '/user/*',
    component: lazy(() => import('@/pages/user')),
    meta: {
      title: '用户',
      hidden: true,
    },
  },
];

/**
 * 从注册表获取微前端路由并与本地路由合并
 *
 * 注册表中的子应用会被转换为 RouteConfig 格式插入路由表。
 * 这样菜单和路由都能自动包含微前端子应用。
 */
export function getRoutes(registryRoutes: RouteConfig[] = []): RouteConfig[] {
  return [...localRoutes, ...registryRoutes];
}

export default localRoutes;
