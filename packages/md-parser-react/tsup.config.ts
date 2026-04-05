import { defineConfig } from 'tsup';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    styles: 'src/styles/markdown.module.css', // 提取 CSS 到单独文件
  },
  format: ['esm'],
  dts: true,
  splitting: false,
  sourcemap: true,
  clean: true,
  external: ['react', 'react-dom', '@luhanxin/md-parser-core'],
  esbuildOptions(options) {
    options.jsx = 'automatic';
  },
});
