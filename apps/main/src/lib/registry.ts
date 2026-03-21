import type { AppManifest, ConfigProvider } from '@luhanxin/app-registry';
import { AppRegistry, DevConfigProvider, EnvConfigProvider } from '@luhanxin/app-registry';

/**
 * 子应用配置 — Single Source of Truth
 *
 * 所有微前端子应用在此注册。
 *
 * Provider 策略：
 * - development: DevConfigProvider — 从 .dev-registry.json 读取子应用真实地址
 *   子应用的 Vite 插件（garfishSubApp）启动后自动写入真实端口，
 *   不再需要写死 localhost:5174 这种硬编码地址。
 * - production:  EnvConfigProvider — 使用 envEntries.production 的静态地址
 *
 * 新增子应用只需在 apps 数组追加一条配置即可。
 */
const apps: AppManifest[] = [
  {
    name: 'feed',
    entry: '', // 由 Provider 动态覆盖
    activeWhen: '/feed',
    type: 'garfish',
    meta: {
      title: '动态',
      icon: 'ReadOutlined',
    },
    envEntries: {
      development: 'http://localhost:5174', // fallback：DevConfigProvider 拿不到时使用
      production: '/apps/feed/',
    },
  },
];

/**
 * 根据环境选择 ConfigProvider
 */
function createProvider(): ConfigProvider {
  const isDev = import.meta.env.DEV;

  if (isDev) {
    // 开发模式：从 .dev-registry.json 读取子应用真实地址
    // 解决端口被占用时 Vite 自动 +1 导致地址不匹配的问题
    return new DevConfigProvider(apps);
  }

  // 生产模式：使用静态 envEntries
  return new EnvConfigProvider(apps);
}

/** 全局 AppRegistry 单例 */
export const registry = new AppRegistry({
  provider: createProvider(),
  healthCheck: {
    enabled: true,
    interval: 30_000,
    timeout: 3_000,
    unhealthyThreshold: 3,
  },
});
