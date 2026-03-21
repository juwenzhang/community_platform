import type { AppRegistry } from '../registry';
import type { AppManifest } from '../types';

/** Garfish.run apps 配置项 */
export interface GarfishAppConfig {
  name: string;
  entry: string;
  activeWhen: string;
  props?: Record<string, unknown>;
}

/**
 * 从注册表生成 Garfish apps 配置
 *
 * 仅转换 type === 'garfish'（或未指定 type）的子应用
 */
export function getGarfishApps(registry: AppRegistry): GarfishAppConfig[] {
  return registry
    .getAll()
    .filter((app) => !app.type || app.type === 'garfish')
    .map(manifestToGarfishApp);
}

/**
 * 监听注册表变更，自动同步到 Garfish
 *
 * 调用此函数后，当注册表中的子应用变化时，会自动调用
 * Garfish 的 registerApp / unregisterApp API。
 *
 * @param registry - AppRegistry 实例
 * @param garfish - Garfish 实例（传入以避免直接依赖）
 * @returns 取消同步的函数
 */
export function syncToGarfish(
  registry: AppRegistry,
  garfish: {
    registerApp: (app: GarfishAppConfig | GarfishAppConfig[]) => void;
  },
): () => void {
  return registry.onChange((event) => {
    if (event.type === 'register' && event.app) {
      if (!event.app.type || event.app.type === 'garfish') {
        garfish.registerApp(manifestToGarfishApp(event.app));
      }
    }

    if (event.type === 'config-update' && event.apps) {
      const garfishApps = event.apps
        .filter((app) => !app.type || app.type === 'garfish')
        .map(manifestToGarfishApp);
      garfish.registerApp(garfishApps);
    }
  });
}

function manifestToGarfishApp(app: AppManifest): GarfishAppConfig {
  return {
    name: app.name,
    entry: app.entry,
    activeWhen: app.activeWhen,
    ...(app.props && { props: app.props }),
  };
}
