import type { AppManifest, ConfigProvider } from '../types';

export interface RemoteConfigProviderOptions {
  /** 远程配置 URL */
  url: string;
  /** 拉取间隔 (ms)，0 = 不自动轮询 */
  pollInterval?: number;
  /** 请求超时 (ms) */
  timeout?: number;
  /** 回退 Provider（远程不可用时使用） */
  fallback?: ConfigProvider;
}

/**
 * 远程配置提供者
 *
 * Phase 3 使用：从远程 API 动态拉取子应用配置。
 * 支持定时轮询 + fallback 降级。
 *
 * @example
 * ```ts
 * const provider = new RemoteConfigProvider({
 *   url: '/api/v1/app-registry',
 *   pollInterval: 60_000,
 *   fallback: new StaticConfigProvider([...]),
 * });
 * ```
 */
export class RemoteConfigProvider implements ConfigProvider {
  private readonly options: Required<RemoteConfigProviderOptions>;
  private cachedApps: AppManifest[] | null = null;
  private pollTimer: ReturnType<typeof setInterval> | null = null;
  private watchers: Array<(apps: AppManifest[]) => void> = [];

  constructor(options: RemoteConfigProviderOptions) {
    this.options = {
      pollInterval: 0,
      timeout: 5_000,
      fallback: { getApps: async () => [] },
      ...options,
    };
  }

  async getApps(): Promise<AppManifest[]> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.options.timeout);

      const response = await fetch(this.options.url, {
        signal: controller.signal,
        headers: { Accept: 'application/json' },
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`Remote config fetch failed: ${response.status}`);
      }

      const apps: AppManifest[] = await response.json();
      this.cachedApps = apps;
      return apps;
    } catch (error) {
      // 有缓存就用缓存
      if (this.cachedApps) {
        console.warn('[app-registry] Remote fetch failed, using cached config:', error);
        return this.cachedApps;
      }

      // 没有缓存就 fallback
      console.warn('[app-registry] Remote fetch failed, using fallback:', error);
      return this.options.fallback.getApps();
    }
  }

  watch(callback: (apps: AppManifest[]) => void): () => void {
    this.watchers.push(callback);

    // 首次启动轮询
    if (this.pollTimer === null && this.options.pollInterval > 0) {
      this.startPolling();
    }

    return () => {
      this.watchers = this.watchers.filter((w) => w !== callback);
      if (this.watchers.length === 0) {
        this.stopPolling();
      }
    };
  }

  private startPolling(): void {
    this.pollTimer = setInterval(async () => {
      const apps = await this.getApps();
      for (const watcher of this.watchers) {
        watcher(apps);
      }
    }, this.options.pollInterval);
  }

  private stopPolling(): void {
    if (this.pollTimer !== null) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }
  }
}
