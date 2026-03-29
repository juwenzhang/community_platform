import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { garfishSubApp } from '@luhanxin/dev-kit/vite';
import vue from '@vitejs/plugin-vue';
import { defineConfig } from 'vite';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * user-profile 子应用 — Vue 3
 *
 * 公开个人主页 /user/:username，通过 Garfish 挂载到 React 主应用中。
 *
 * Garfish 加载子应用通过 HTML 入口（fetch HTML → 解析 script/link → 注入沙箱），
 * 因此使用标准应用模式构建（产出 index.html + JS/CSS 资源），不使用 lib 模式。
 *
 * garfishSubApp 插件会在 dev server 启动后，将真实监听地址写入 .dev-registry.json，
 * 主应用 DevConfigProvider 从该文件读取。
 */
export default defineConfig({
  plugins: [vue(), garfishSubApp({ name: 'user-profile' })],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      // @garfish/bridge-vue-v3 内部使用 template 字符串，
      // 需要 Vue 的 runtime + compiler 版本
      vue: 'vue/dist/vue.esm-bundler.js',
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            const parts = id.split('node_modules/');
            const lastPart = parts[parts.length - 1];
            const pkgName = lastPart.startsWith('@')
              ? lastPart.split('/').slice(0, 2).join('/')
              : lastPart.split('/')[0];

            // Vue 核心运行时
            if (
              [
                'vue',
                '@vue/runtime-core',
                '@vue/runtime-dom',
                '@vue/reactivity',
                '@vue/shared',
                '@vue/compiler-dom',
                '@vue/compiler-core',
              ].includes(pkgName)
            ) {
              return 'vendor-vue';
            }
            // Garfish bridge
            if (pkgName.startsWith('@garfish/')) {
              return 'vendor-garfish';
            }
            // Connect / Protobuf
            if (pkgName.startsWith('@connectrpc/') || pkgName.startsWith('@bufbuild/')) {
              return 'vendor-grpc';
            }
            // 其余第三方依赖合并
            return 'vendor-misc';
          }
          // 页面按目录分组
          if (id.includes('src/views/')) {
            return 'view_' + id.toString().split('src/views/')[1].split('/')[0];
          }
        },
        chunkFileNames: 'js/[name]-[hash].js',
        entryFileNames: 'js/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]',
      },
    },
    assetsInlineLimit: 4096,
    cssCodeSplit: true,
    emptyOutDir: true,
    minify: 'esbuild',
    outDir: 'dist',
    assetsDir: 'assets',
  },
  // 生产构建移除 console 和 debugger
  esbuild: process.env.NODE_ENV === 'production' ? { drop: ['console', 'debugger'] } : undefined,
  server: {
    port: 5175,
    // 不使用 strictPort — 端口被占用时自动 +1
    // 真实端口通过 garfishSubApp 插件注册到 .dev-registry.json
    strictPort: false,
    cors: true,
  },
  base: './',
});
