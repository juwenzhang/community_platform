import type { ComponentType, LazyExoticComponent } from 'react';

// ============================================================
// Route Configuration Types
// ============================================================

/** 路由元信息 — 用于菜单生成、权限控制、页面标题 */
export interface RouteMeta {
  /** 页面标题 / 侧边栏菜单文字 */
  title: string;
  /** Ant Design Icon 组件名（字符串映射） */
  icon?: string;
  /** 是否在侧边栏菜单中隐藏（默认 false） */
  hidden?: boolean;
  /** 是否需要登录才能访问（默认 false） */
  auth?: boolean;
  /** 可访问角色列表（空 = 不限） */
  roles?: string[];
}

/** Garfish 微前端子应用配置 */
export interface GarfishAppConfig {
  /** 子应用唯一名称 */
  appName: string;
  /** 子应用入口 URL（可选，运行时从 registry 解析） */
  entry?: string;
}

/** 单条路由配置 */
export interface RouteConfig {
  /** 路由路径 */
  path: string;
  /** 是否为 index route */
  index?: boolean;
  /** 页面组件（lazy import） */
  component?: LazyExoticComponent<ComponentType>;
  /** 微前端子应用配置（与 component 互斥） */
  garfish?: GarfishAppConfig;
  /** 路由元信息 */
  meta?: RouteMeta;
  /** 嵌套子路由 */
  children?: RouteConfig[];
  /** 重定向目标路径 */
  redirect?: string;
}

export type { ComponentType, LazyExoticComponent };
