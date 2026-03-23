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
  optimizeDeps: {
    include: ['axios', 'lodash'], // 强制预构建高频依赖，提升启动速度
    exclude: [], // 排除无需预构建的包
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            // 解析真实包名（兼容 pnpm 虚拟存储路径）
            const parts = id.split('node_modules/');
            const lastPart = parts[parts.length - 1];
            const pkgName = lastPart.startsWith('@')
              ? lastPart.split('/').slice(0, 2).join('/')
              : lastPart.split('/')[0];

            // React 核心运行时
            if (['react', 'react-dom', 'scheduler', 'react-is'].includes(pkgName)) {
              return 'vendor-react';
            }
            // Ant Design 全家桶（antd + rc-* + @ant-design/* + @rc-component/*）
            if (
              pkgName === 'antd' ||
              pkgName.startsWith('rc-') ||
              pkgName.startsWith('@ant-design/') ||
              pkgName.startsWith('@rc-component/')
            ) {
              return 'vendor-antd';
            }
            // 其余第三方依赖合并
            return 'vendor-misc';
          }
          // 页面按目录分组
          if (id.includes('src/views/') || id.includes('src/pages/')) {
            return id.includes('src/pages/')
              ? 'page_' + id.toString().split('src/pages/')[1].split('/')[0]
              : 'view_' + id.toString().split('src/views/')[1].split('/')[0];
          }
        },
        // chunk 文件（动态 import 拆分的 JS）
        chunkFileNames: 'js/[name]-[hash].js',
        // 入口文件
        entryFileNames: 'js/[name]-[hash].js',
        // 静态资源（CSS、图片、字体等）
        assetFileNames: 'assets/[name]-[hash].[ext]',
      },
    },
    // 静态资源优化：小于4KB转base64，减少请求
    assetsInlineLimit: 4096,
    // CSS拆分（默认开启，确保每个chunk的CSS独立）
    cssCodeSplit: true,
    // 清空输出目录（避免冗余文件）
    emptyOutDir: true,
    minify: 'esbuild',
    // 标准应用模式：产出 index.html + JS/CSS 资源
    // Garfish 通过 HTML 入口加载，不需要 lib 模式的纯 UMD
    outDir: 'dist',
    assetsDir: 'assets',
  },
  // esbuild 压缩选项：生产构建时移除 console 和 debugger
  esbuild: {
    drop: ['console', 'debugger'],
  },
  server: {
    port: 5174,
    // 不使用 strictPort — 端口被占用时自动 +1，而非报错退出
    // 真实端口会通过 garfishSubApp 插件注册到 .dev-registry.json
    strictPort: false,
    cors: true,
  },
  base: './',
});
