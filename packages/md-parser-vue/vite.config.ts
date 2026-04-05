import vue from '@vitejs/plugin-vue';
import { resolve } from 'path';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [vue()],
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      name: 'MdParserVue',
      fileName: 'index',
      formats: ['es'],
    },
    rollupOptions: {
      // mermaid 作为 peerDependency，不打包进去（动态 import 由使用者提供）
      external: ['vue', '@luhanxin/md-parser-core', 'mermaid'],
      output: {
        globals: {
          vue: 'Vue',
          '@luhanxin/md-parser-core': 'MdParserCore',
          mermaid: 'mermaid',
        },
      },
    },
    outDir: 'dist',
    sourcemap: true,
    minify: false,
  },
});
