import { copyFileSync } from 'node:fs';
import { defineConfig } from 'tsup';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
  },
  format: ['esm'],
  dts: true,
  splitting: false,
  sourcemap: true,
  clean: true,
  treeshake: true,
  minify: true,
  external: [
    'react',
    'react-dom',
    'react/jsx-runtime',
    '@luhanxin/md-parser-core',
    '@tiptap/core',
    '@tiptap/pm',
    '@tiptap/react',
    '@tiptap/starter-kit',
    '@tiptap/suggestion',
    '@tiptap/extension-code-block-lowlight',
    '@tiptap/extension-image',
    '@tiptap/extension-link',
    '@tiptap/extension-placeholder',
    '@tiptap/extension-table',
    '@tiptap/extension-table-cell',
    '@tiptap/extension-table-header',
    '@tiptap/extension-table-row',
    '@tiptap/extension-task-item',
    '@tiptap/extension-task-list',
    'idb',
    'lowlight',
    'tippy.js',
  ],
  esbuildOptions(options) {
    options.jsx = 'automatic';
  },
  async onSuccess() {
    // 把 src/theme.css 拷贝到 dist/（package.json exports 指向它）
    copyFileSync('src/theme.css', 'dist/theme.css');
  },
});
