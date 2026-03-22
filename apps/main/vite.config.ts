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
