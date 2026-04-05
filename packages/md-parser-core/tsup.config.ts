import { defineConfig } from 'tsup';

export default defineConfig([
  {
    entry: ['src/index.ts'],
    format: ['esm'],
    dts: false, // 暂时禁用 DTS 生成
    splitting: false,
    sourcemap: true,
    clean: true,
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
      'shiki',
      'mdast-util-to-hast',
      'unist-util-visit',
      'vfile',
      'js-yaml',
    ],
  },
  {
    // 单独生成类型文件
    entry: ['src/index.ts'],
    format: ['esm'],
    dts: true,
    splitting: false,
    sourcemap: false,
    clean: false,
  },
]);
