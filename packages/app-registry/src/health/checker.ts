import { DEFAULT_HEALTH_CHECK_OPTIONS } from '../constants';
import type { AppManifest, HealthCheckOptions, HealthStatus, HealthStatusValue } from '../types';

/**
 * 子应用健康检查器
 *
 * 使用 HEAD 请求检测子应用入口是否可达。
 * - 零侵入：子应用无需新增任何端点
 * - 支持自定义 healthCheckUrl 覆盖默认地址
 * - 支持定时轮询 + 状态缓存
 */
export class HealthChecker {
  private readonly options: HealthCheckOptions;
  private statusCache = new Map<string, HealthStatus>();
  private failureCounts = new Map<string, number>();
  private pollTimer: ReturnType<typeof setInterval> | null = null;
  private listeners: Array<(status: HealthStatus) => void> = [];

  constructor(options?: Partial<HealthCheckOptions>) {
    this.options = { ...DEFAULT_HEALTH_CHECK_OPTIONS, ...options };
  }

  /**
   * 检查单个子应用的健康状态
   */
  async check(app: AppManifest): Promise<HealthStatus> {
    const url = app.healthCheckUrl ?? app.entry;
    const startTime = Date.now();

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.options.timeout);

      const _response = await fetch(url, {
        method: 'HEAD',
        mode: 'no-cors', // 避免 CORS 问题
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      const latency = Date.now() - startTime;

      // mode: 'no-cors' 成功会返回 opaque response（status = 0）
      // 只要不抛异常就认为可达
      const status: HealthStatus = {
        name: app.name,
        status: 'healthy',
        latency,
        lastCheck: new Date(),
      };

      // 重置失败计数
      this.failureCounts.set(app.name, 0);
      this.updateCache(status);
      return status;
    } catch (error) {
      const failCount = (this.failureCounts.get(app.name) ?? 0) + 1;
      this.failureCounts.set(app.name, failCount);

      const statusValue: HealthStatusValue =
        failCount >= this.options.unhealthyThreshold ? 'unhealthy' : 'unknown';

      const status: HealthStatus = {
        name: app.name,
        status: statusValue,
        latency: Date.now() - startTime,
        lastCheck: new Date(),
        error: error instanceof Error ? error.message : String(error),
      };

      this.updateCache(status);
      return status;
    }
  }

  /**
   * 批量检查多个子应用
   */
  async checkAll(apps: AppManifest[]): Promise<HealthStatus[]> {
    return Promise.all(apps.map((app) => this.check(app)));
  }

  /**
   * 获取缓存的健康状态
   */
  getStatus(appName: string): HealthStatus | undefined {
    return this.statusCache.get(appName);
  }

  /**
   * 获取所有缓存的健康状态
   */
  getAllStatuses(): HealthStatus[] {
    return Array.from(this.statusCache.values());
  }

  /**
   * 启动定时轮询检查
   */
  startPolling(apps: AppManifest[]): void {
    if (this.pollTimer !== null || this.options.interval <= 0) return;

    this.pollTimer = setInterval(() => {
      this.checkAll(apps);
    }, this.options.interval);
  }

  /**
   * 停止定时轮询
   */
  stopPolling(): void {
    if (this.pollTimer !== null) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }
  }

  /**
   * 订阅健康状态变更
   */
  onChange(callback: (status: HealthStatus) => void): () => void {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== callback);
    };
  }

  /**
   * 清理所有资源
   */
  destroy(): void {
    this.stopPolling();
    this.listeners = [];
    this.statusCache.clear();
    this.failureCounts.clear();
  }

  private updateCache(status: HealthStatus): void {
    const previous = this.statusCache.get(status.name);
    this.statusCache.set(status.name, status);

    // 状态变更时通知监听者
    if (previous?.status !== status.status) {
      for (const listener of this.listeners) {
        listener(status);
      }
    }
  }
}
