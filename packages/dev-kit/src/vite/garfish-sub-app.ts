import type { ResolvedConfig, ViteDevServer } from 'vite';
import { getRegistryFilePath, removeRegistryEntry, writeRegistryEntry } from '../registry-file';
import type { GarfishSubAppOptions } from '../types';

/**
 * Vite 插件 — 子应用自动注册
 *
 * 在 Vite dev server 启动后：
 * 1. 获取真实监听的端口（处理了 Vite strictPort=false 时自动 +1 的情况）
 * 2. 将 { name, url, port } 写入 monorepo 根目录的 .dev-registry.json
 * 3. 进程退出时自动清理注册条目
 *
 * @example
 * ```ts
 * // apps/feed/vite.config.ts
 * import { garfishSubApp } from '@luhanxin/dev-kit/vite';
 *
 * export default defineConfig({
 *   plugins: [
 *     react(),
 *     garfishSubApp({ name: 'feed' }),
 *   ],
 * });
 * ```
 */
// biome-ignore lint/suspicious/noExplicitAny: 跨包 Plugin 类型兼容
export function garfishSubApp(options: GarfishSubAppOptions): any {
  const { name } = options;
  let config: ResolvedConfig;
  let registryFilePath: string;
  let cleanedUp = false;

  const cleanup = () => {
    if (cleanedUp) return;
    cleanedUp = true;
    try {
      removeRegistryEntry(registryFilePath, name);
    } catch {
      // 退出时忽略错误
    }
  };

  return {
    name: 'luhanxin:garfish-sub-app',
    apply: 'serve', // 仅 dev 模式生效

    configResolved(resolvedConfig: ResolvedConfig) {
      config = resolvedConfig;
      registryFilePath = getRegistryFilePath(options.registryFile);
    },

    configureServer(server: ViteDevServer) {
      // httpServer.listening 事件在端口确定后触发
      server.httpServer?.once('listening', () => {
        const address = server.httpServer?.address();
        if (!address || typeof address === 'string') return;

        const resolvedPort = address.port;
        const preferredPort = config.server.port ?? 5173;
        const protocol = config.server.https ? 'https' : 'http';
        const host = typeof config.server.host === 'string' ? config.server.host : 'localhost';
        const url = `${protocol}://${host}:${resolvedPort}`;

        writeRegistryEntry(registryFilePath, {
          name,
          url,
          preferredPort,
          resolvedPort,
          startedAt: Date.now(),
          pid: process.pid,
        });

        const portChanged = resolvedPort !== preferredPort;
        const portInfo = portChanged
          ? ` (preferred ${preferredPort}, resolved ${resolvedPort})`
          : ` (port ${resolvedPort})`;

        config.logger.info(`\n  🔗 [dev-registry] ${name} registered at ${url}${portInfo}\n`, {
          timestamp: true,
        });

        // 注册退出清理
        process.on('exit', cleanup);
        process.on('SIGINT', () => {
          cleanup();
          process.exit(0);
        });
        process.on('SIGTERM', () => {
          cleanup();
          process.exit(0);
        });
      });
    },
  };
}
