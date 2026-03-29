import type { AppManifest, ConfigProvider } from '@luhanxin/app-registry';
import { AppRegistry, DevConfigProvider, EnvConfigProvider } from '@luhanxin/app-registry';

/**
 * 子应用配置 — Single Source of Truth
 *
 * 所有微前端子应用在此注册。
 *
 * Provider 策略：
 * - development (DEV=true): DevConfigProvider — 从 .dev-registry.json 读取子应用真实地址
 *   子应用的 Vite 插件（garfishSubApp）启动后自动写入真实端口，
 *   不再需要写死 localhost:5174 这种硬编码地址。
 * - production / preview (DEV=false): EnvConfigProvider — 使用 envEntries.production 的静态地址
 *   preview 模式下子应用构建产物已被拷贝到 main/dist/apps/<name>/，
 *   通过相对路径 '/apps/feed/' 直接从同一个 preview server 加载。
 *
 * 新增子应用只需在 apps 数组追加一条配置即可。
 */
const apps: AppManifest[] = [
  {
    name: 'feed',
    entry: '',
    activeWhen: '/feed',
    type: 'garfish',
    meta: {
      title: '动态',
      icon: 'ReadOutlined',
    },
    envEntries: {
      development: 'http://localhost:5174',
      production: '/apps/feed/',
    },
  },
  {
    name: 'user-profile',
    entry: '',
    activeWhen: '/user',
    type: 'garfish',
    meta: {
      title: '用户主页',
      icon: 'UserOutlined',
      hidden: true, // 不显示在侧边栏菜单
    },
    envEntries: {
      development: 'http://localhost:5175',
      production: '/apps/user-profile/',
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

  // 生产/预览模式：使用静态 envEntries.production
  // preview: 子应用已被 build-preview.sh 组装到 main/dist/apps/<name>/
  // production: 由部署平台/CDN 分发
  return new EnvConfigProvider(apps);
}

const isDev = import.meta.env.DEV;

/** 全局 AppRegistry 单例 */
export const registry = new AppRegistry({
  provider: createProvider(),
  healthCheck: {
    // 开发模式：启用健康检查，定时轮询子应用状态
    // 生产/预览模式：禁用健康检查 — 子应用是静态文件，无需轮询端口
    enabled: isDev,
    interval: isDev ? 30_000 : 0,
    timeout: 3_000,
    unhealthyThreshold: 3,
  },
});
