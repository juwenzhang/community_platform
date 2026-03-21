import { defineConfig } from 'tsup';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    'vite/index': 'src/vite/index.ts',
  },
  format: ['esm'],
  dts: false, // 类型直接从源文件读取（package.json exports.types 指向 .ts）
  clean: true,
  external: ['vite'],
  platform: 'node',
  target: 'node20',
});
