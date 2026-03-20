import path from 'node:path';
import react from '@vitejs/plugin-react';
/// <reference types="vitest/config" />
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      // 支持各 app 的 @ 别名 — 测试文件中通过相对路径引用源码
      '@main': path.resolve(__dirname, 'apps/main/src'),
      '@feed': path.resolve(__dirname, 'apps/feed/src'),
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
    include: ['tests/**/*.test.{ts,tsx}'],
    css: true,
    coverage: {
      provider: 'v8',
      include: ['apps/*/src/**/*.{ts,tsx}'],
      exclude: ['apps/*/src/main.tsx', 'apps/*/src/vite-env.d.ts', '**/*.d.ts'],
    },
  },
});
