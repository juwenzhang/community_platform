import type { AppManifest, ConfigProvider } from '../types';

/**
 * 安全获取当前环境模式
 *
 * ⚠️ 关键：必须使用 `import.meta.env.MODE` 直接访问语法！
 * Vite 在构建时会静态替换 `import.meta.env.MODE` → `"production"`，
 * 但如果用间接方式（如 `const meta = import.meta; meta.env?.MODE`）
 * Vite 无法识别并替换，导致运行时 import.meta.env 为 undefined，
 * 始终 fallback 到 'development'，子应用 entry 指向 localhost:5174。
 */
function getEnvMode(): string {
  try {
    // Vite 会在构建时将 import.meta.env.MODE 静态替换为 "production" 字符串
    return import.meta.env.MODE ?? 'development';
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
