import type { IncomingMessage, ServerResponse } from 'node:http';
import type { ViteDevServer } from 'vite';
import { getRegistryFilePath, readRegistryFile } from '../registry-file';

/**
 * Vite 插件 — 开发态注册表 API 端点
 *
 * 在主应用的 Vite dev server 上添加 `/__dev_registry__` 中间件，
 * 前端 DevConfigProvider 通过 fetch 该端点获取所有子应用的真实地址。
 *
 * @example
 * ```ts
 * // apps/main/vite.config.ts
 * import { devRegistryMiddleware } from '@luhanxin/dev-kit/vite';
 *
 * export default defineConfig({
 *   plugins: [
 *     react(),
 *     devRegistryMiddleware(),
 *   ],
 * });
 * ```
 */
// biome-ignore lint/suspicious/noExplicitAny: 跨包 Plugin 类型兼容
export function devRegistryMiddleware(options?: {
  /** .dev-registry.json 文件路径 */
  registryFile?: string;
}): any {
  let registryFilePath: string;

  return {
    name: 'luhanxin:dev-registry-middleware',
    apply: 'serve', // 仅 dev 模式生效

    configResolved() {
      registryFilePath = getRegistryFilePath(options?.registryFile);
    },

    configureServer(server: ViteDevServer) {
      server.middlewares.use((req: IncomingMessage, res: ServerResponse, next: () => void) => {
        if (req.url !== '/__dev_registry__') {
          return next();
        }

        try {
          const registry = readRegistryFile(registryFilePath);
          res.setHeader('Content-Type', 'application/json');
          res.setHeader('Cache-Control', 'no-store');
          res.end(JSON.stringify(registry));
        } catch (error) {
          res.statusCode = 500;
          res.end(JSON.stringify({ error: 'Failed to read dev registry' }));
        }
      });
    },
  };
}
