import type { AppManifest, ConfigProvider } from '../types';

/**
 * .dev-registry.json 文件结构（与 @luhanxin/dev-kit 对齐）
 * 这里重新声明，避免 app-registry 直接依赖 dev-kit
 */
interface DevRegistryFile {
  version: 1;
  apps: Record<
    string,
    {
      name: string;
      url: string;
      resolvedPort: number;
      pid: number;
      startedAt: number;
    }
  >;
  updatedAt: number;
}

/**
 * 开发态配置提供者
 *
 * 读取 .dev-registry.json（由各子应用的 Vite 插件写入），
 * 用文件中记录的 **真实 URL** 覆盖静态配置中的 entry。
 *
 * 解决痛点：子应用配置了 port=5174 但端口被占用导致 Vite 跑在 5175 上，
 * 而主应用 registry 还傻傻地访问 5174。
 *
 * 工作流程：
 * 1. `getApps()` 时读取 .dev-registry.json
 * 2. 遍历静态 apps 配置，如果 dev-registry 中有对应 name 的条目，
 *    就用 dev-registry 中的真实 URL 覆盖 entry
 * 3. 如果 dev-registry 中没有（子应用还没启动），保留原始 entry 作为 fallback
 * 4. 可选 `watch()` 方法：监听文件变更，子应用启动/重启时自动通知
 *
 * @example
 * ```ts
 * import { DevConfigProvider } from '@luhanxin/app-registry';
 *
 * const provider = new DevConfigProvider(apps, {
 *   registryFile: '/path/to/.dev-registry.json', // 可选
 * });
 * ```
 */
export class DevConfigProvider implements ConfigProvider {
  private readonly apps: AppManifest[];
  private readonly registryFile: string;

  constructor(
    apps: AppManifest[],
    options?: {
      /** .dev-registry.json 文件路径 */
      registryFile?: string;
    },
  ) {
    this.apps = apps;
    // 默认路径：基于浏览器环境不能直接 fs.readFile，
    // 所以 DevConfigProvider 实际通过 Vite 的 virtual module 或 API 端点拿数据。
    // 但对于 SSR / Node.js 环境下可直接读文件。
    // 这里先通过 Vite dev server 暴露的 API 来获取。
    this.registryFile = options?.registryFile ?? '/.dev-registry.json';
  }

  async getApps(): Promise<AppManifest[]> {
    const devRegistry = await this.fetchDevRegistry();
    return this.mergeWithDevRegistry(devRegistry);
  }

  watch?(callback: (apps: AppManifest[]) => void): () => void {
    // 轮询 .dev-registry.json（浏览器环境无法 fs.watch）
    // 每 3 秒检查一次，如果内容变化了就触发回调
    let lastUpdatedAt = 0;
    let stopped = false;

    const poll = async () => {
      if (stopped) return;
      try {
        const devRegistry = await this.fetchDevRegistry();
        if (devRegistry && devRegistry.updatedAt !== lastUpdatedAt) {
          lastUpdatedAt = devRegistry.updatedAt;
          const apps = this.mergeWithDevRegistry(devRegistry);
          callback(apps);
        }
      } catch {
        // 忽略轮询错误
      }
      if (!stopped) {
        setTimeout(poll, 3000);
      }
    };

    // 首次延迟 3 秒开始轮询（给子应用启动的时间）
    const timer = setTimeout(poll, 3000);

    return () => {
      stopped = true;
      clearTimeout(timer);
    };
  }

  /**
   * 通过 fetch 获取 dev-registry 数据
   *
   * 在开发模式下，main 的 Vite dev server 会代理这个请求，
   * 或者我们直接从一个约定的 API 端点读取。
   */
  private async fetchDevRegistry(): Promise<DevRegistryFile | null> {
    try {
      // 通过 Vite dev server 的代理或内联中间件获取
      const response = await fetch('/__dev_registry__');
      if (!response.ok) return null;
      return (await response.json()) as DevRegistryFile;
    } catch {
      return null;
    }
  }

  /**
   * 将 dev-registry 中的真实 URL 合并到静态配置
   */
  private mergeWithDevRegistry(devRegistry: DevRegistryFile | null): AppManifest[] {
    if (!devRegistry) {
      // dev-registry 不可用，fallback 到静态配置
      return this.apps.map((app) => ({
        ...app,
        entry: app.envEntries?.development ?? app.entry,
      }));
    }

    return this.apps.map((app) => {
      const devEntry = devRegistry.apps[app.name];
      if (devEntry) {
        // 用 dev-registry 中的真实 URL 覆盖
        return { ...app, entry: devEntry.url };
      }
      // 子应用还没启动，fallback 到 envEntries.development
      return {
        ...app,
        entry: app.envEntries?.development ?? app.entry,
      };
    });
  }
}
