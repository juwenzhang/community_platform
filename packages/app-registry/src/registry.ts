import { DEFAULT_HEALTH_CHECK_OPTIONS } from './constants';
import { HealthChecker } from './health/checker';
import type {
  AppManifest,
  ConfigProvider,
  HealthCheckOptions,
  HealthStatus,
  RegistryEvent,
  RegistryOptions,
} from './types';

/**
 * 微前端子应用注册表
 *
 * 单一数据源：管理所有子应用的配置、健康状态和生命周期。
 * 从这里可以导出 Garfish 配置、路由配置、菜单配置。
 *
 * @example
 * ```ts
 * const registry = new AppRegistry({
 *   provider: new StaticConfigProvider([
 *     { name: 'feed', entry: 'http://localhost:5174', activeWhen: '/feed' },
 *   ]),
 * });
 *
 * await registry.init();
 * const apps = registry.getAll();
 * const feed = registry.resolve('feed');
 * ```
 */
export class AppRegistry {
  private apps = new Map<string, AppManifest>();
  private readonly provider: ConfigProvider;
  private readonly healthOptions: HealthCheckOptions;
  private healthChecker: HealthChecker | null = null;
  private listeners: Array<(event: RegistryEvent) => void> = [];
  private providerUnwatch: (() => void) | null = null;
  private initialized = false;

  constructor(options: RegistryOptions) {
    this.provider = options.provider;
    this.healthOptions = {
      ...DEFAULT_HEALTH_CHECK_OPTIONS,
      ...options.healthCheck,
    };
  }

  /**
   * 初始化注册表
   *
   * 1. 从 Provider 加载配置
   * 2. 可选：首次健康检查
   * 3. 可选：启动定时轮询
   * 4. 可选：监听 Provider 配置变更
   */
  async init(): Promise<void> {
    if (this.initialized) return;

    // 1. 加载配置
    const apps = await this.provider.getApps();
    for (const app of apps) {
      this.apps.set(app.name, app);
    }

    // 2. 健康检查
    if (this.healthOptions.enabled) {
      this.healthChecker = new HealthChecker(this.healthOptions);

      // 监听健康状态变更
      this.healthChecker.onChange((status: HealthStatus) => {
        this.emit({ type: 'health-change', health: status });
      });

      // 首次检查
      await this.healthChecker.checkAll(apps);

      // 定时轮询
      if (this.healthOptions.interval > 0) {
        this.healthChecker.startPolling(apps);
      }
    }

    // 3. 监听 Provider 配置变更
    if (this.provider.watch) {
      this.providerUnwatch = this.provider.watch((newApps) => {
        this.apps.clear();
        for (const app of newApps) {
          this.apps.set(app.name, app);
        }
        this.emit({ type: 'config-update', apps: newApps });
      });
    }

    this.initialized = true;
  }

  /**
   * 获取所有已注册子应用
   */
  getAll(): AppManifest[] {
    return Array.from(this.apps.values());
  }

  /**
   * 按名称查找子应用
   */
  resolve(name: string): AppManifest | undefined {
    return this.apps.get(name);
  }

  /**
   * 获取所有健康的子应用
   */
  getHealthy(): AppManifest[] {
    if (!this.healthChecker) return this.getAll();

    return this.getAll().filter((app) => {
      const status = this.healthChecker?.getStatus(app.name);
      return !status || status.status === 'healthy' || status.status === 'unknown';
    });
  }

  /**
   * 获取子应用的健康状态
   */
  getHealthStatus(name: string): HealthStatus | undefined {
    return this.healthChecker?.getStatus(name);
  }

  /**
   * 运行时动态注册子应用
   */
  register(manifest: AppManifest): void {
    this.apps.set(manifest.name, manifest);
    this.emit({ type: 'register', app: manifest });

    // 如果健康检查开启，立即检查新应用
    if (this.healthChecker) {
      this.healthChecker.check(manifest);
    }
  }

  /**
   * 运行时注销子应用
   */
  unregister(name: string): void {
    const app = this.apps.get(name);
    if (app) {
      this.apps.delete(name);
      this.emit({ type: 'unregister', app });
    }
  }

  /**
   * 订阅注册表事件
   *
   * @returns 取消订阅函数
   */
  onChange(callback: (event: RegistryEvent) => void): () => void {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== callback);
    };
  }

  /**
   * 销毁注册表，清理所有资源
   */
  destroy(): void {
    this.healthChecker?.destroy();
    this.healthChecker = null;
    this.providerUnwatch?.();
    this.providerUnwatch = null;
    this.listeners = [];
    this.apps.clear();
    this.initialized = false;
  }

  /**
   * 是否已初始化
   */
  isInitialized(): boolean {
    return this.initialized;
  }

  private emit(event: RegistryEvent): void {
    for (const listener of this.listeners) {
      listener(event);
    }
  }
}
