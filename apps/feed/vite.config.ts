import { garfishSubApp } from '@luhanxin/dev-kit/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

/**
 * Feed 子应用 Vite 配置
 *
 * Garfish 加载子应用通过 HTML 入口（fetch HTML → 解析 script/link → 注入沙箱）。
 * 因此子应用使用标准应用模式构建（产出 index.html + JS/CSS 资源），
 * **不要**使用 lib 模式（lib 模式产出纯 UMD/ES 模块，没有 HTML 入口）。
 *
 * garfishSubApp 插件会在 dev server 启动后，将真实的监听地址
 * （含自动分配的端口）写入 monorepo 根目录的 .dev-registry.json，
 * 主应用的 DevConfigProvider 会从该文件读取真实地址。
 */
export default defineConfig({
  plugins: [react(), garfishSubApp({ name: 'feed' })],
  server: {
    port: 5174,
    // 不使用 strictPort — 端口被占用时自动 +1，而非报错退出
    // 真实端口会通过 garfishSubApp 插件注册到 .dev-registry.json
    strictPort: false,
    cors: true,
  },
  base: './',
  build: {
    // 标准应用模式：产出 index.html + JS/CSS 资源
    // Garfish 通过 HTML 入口加载，不需要 lib 模式的纯 UMD
    outDir: 'dist',
    assetsDir: 'assets',
  },
});
