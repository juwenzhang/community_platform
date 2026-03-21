import type { AppManifest, ConfigProvider } from '../types';

/**
 * 静态配置提供者
 *
 * Phase 1 使用：直接传入硬编码的子应用配置数组。
 * 等价于当前方案，但统一了数据结构。
 *
 * @example
 * ```ts
 * const provider = new StaticConfigProvider([
 *   { name: 'feed', entry: 'http://localhost:5174', activeWhen: '/feed' },
 * ]);
 * ```
 */
export class StaticConfigProvider implements ConfigProvider {
  private readonly apps: AppManifest[];

  constructor(apps: AppManifest[]) {
    this.apps = apps;
  }

  async getApps(): Promise<AppManifest[]> {
    return [...this.apps];
  }
}
