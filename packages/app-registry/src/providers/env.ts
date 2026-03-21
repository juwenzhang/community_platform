import type { AppManifest, ConfigProvider } from '../types';

/** 安全获取当前环境模式 */
function getEnvMode(): string {
  try {
    // Vite 环境下 import.meta.env.MODE 可用
    const meta = import.meta as unknown as { env?: { MODE?: string } };
    return meta.env?.MODE ?? 'development';
  } catch {
    return 'development';
  }
}

/**
 * 环境配置提供者
 *
 * Phase 2 使用：根据 `import.meta.env.MODE` 自动选择对应环境的 entry URL。
 * 子应用需要提供 `envEntries` 字段，包含各环境的入口地址。
 *
 * @example
 * ```ts
 * const provider = new EnvConfigProvider([
 *   {
 *     name: 'feed',
 *     entry: '', // 由 envEntries 覆盖
 *     activeWhen: '/feed',
 *     envEntries: {
 *       development: 'http://localhost:5174',
 *       production: 'https://feed.luhanxin.com',
 *     },
 *   },
 * ]);
 * ```
 */
export class EnvConfigProvider implements ConfigProvider {
  private readonly apps: AppManifest[];
  private readonly env: string;

  constructor(apps: AppManifest[], env?: string) {
    this.apps = apps;
    // 默认通过 import.meta.env.MODE 获取，也支持手动指定
    this.env = env ?? getEnvMode();
  }

  async getApps(): Promise<AppManifest[]> {
    return this.apps.map((app) => {
      if (!app.envEntries) return { ...app };

      const entry = app.envEntries[this.env] ?? app.envEntries.production ?? app.entry;
      return { ...app, entry };
    });
  }
}
