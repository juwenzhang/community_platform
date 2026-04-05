import { defineConfig } from 'tsup';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    'worker-entry': 'src/worker/worker-entry.ts',
  },
  format: ['esm'],
  dts: true,
  splitting: true,
  sourcemap: true,
  clean: true,
  treeshake: true,
  external: [
    'unified',
    'remark-parse',
    'remark-gfm',
    'remark-math',
    'remark-frontmatter',
    'remark-rehype',
    'rehype-stringify',
    'rehype-katex',
    'rehype-sanitize',
    'rehype-raw',
    'hast-util-sanitize',
    'shiki',
    'mdast-util-to-hast',
    'unist-util-visit',
    'vfile',
    'js-yaml',
    'mermaid',
  ],
  esbuildOptions(options) {
    // 修复 worker URL：构建产物中 .ts 扩展名需要替换为 .js
    // new URL('./worker-entry.ts', import.meta.url) → new URL('./worker-entry.js', import.meta.url)
    options.define = {
      ...options.define,
    };
  },
  // 构建后替换 worker-entry.ts → worker-entry.js（tsup 不自动重写 URL 字面量）
  async onSuccess() {
    const { readFileSync, writeFileSync } = await import('fs');
    const indexPath = 'dist/index.js';
    const content = readFileSync(indexPath, 'utf8');
    const fixed = content.replace(/worker-entry\.ts/g, 'worker-entry.js');
    if (fixed !== content) {
      writeFileSync(indexPath, fixed);
      console.log('  ✓ Fixed worker-entry.ts → worker-entry.js in dist/index.js');
    }
  },
});
