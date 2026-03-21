import type { AppRegistry } from '../registry';
import type { AppManifest, AppRouteMeta } from '../types';

/** 路由配置（与 apps/main 的 RouteConfig 对齐） */
export interface RouteConfigFromRegistry {
  path: string;
  garfish: {
    appName: string;
  };
  meta?: AppRouteMeta;
}

/**
 * 从注册表生成路由配置
 *
 * 将注册表中的子应用转换为路由配置项，可以与本地路由表合并。
 *
 * @example
 * ```ts
 * const localRoutes = [...];
 * const registryRoutes = registryToRoutes(registry);
 * const allRoutes = [...localRoutes, ...registryRoutes];
 * ```
 */
export function registryToRoutes(registry: AppRegistry): RouteConfigFromRegistry[] {
  return registry
    .getAll()
    .filter((app) => !app.type || app.type === 'garfish')
    .map(manifestToRoute);
}

function manifestToRoute(app: AppManifest): RouteConfigFromRegistry {
  // activeWhen '/feed' → path '/feed/*'
  const path = app.activeWhen.endsWith('/*') ? app.activeWhen : `${app.activeWhen}/*`;

  return {
    path,
    garfish: {
      appName: app.name,
    },
    ...(app.meta && { meta: app.meta }),
  };
}
