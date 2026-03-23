import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { devRegistryMiddleware } from '@luhanxin/dev-kit/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig({
  plugins: [react(), devRegistryMiddleware()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
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
            // Garfish 微前端运行时
            if (pkgName.startsWith('@garfish/') || pkgName === 'garfish') {
              return 'vendor-garfish';
            }
            // 路由
            if (pkgName.startsWith('react-router') || pkgName === '@remix-run/router') {
              return 'vendor-router';
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
  },
  // esbuild 压缩选项：生产构建时移除 console 和 debugger
  esbuild: {
    drop: ['console', 'debugger'],
  },
  server: {
    port: 5173,
    proxy: {
      // gRPC-Web 请求：路径格式为 /<package>.<Service>/<Method>
      '/luhanxin.community.v1': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
      // REST 端点（文件上传、health check 等）
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
    },
  },
  preview: {
    port: 4173,
  },
});
