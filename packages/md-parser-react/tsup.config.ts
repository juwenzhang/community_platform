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
  external: ['react', 'react-dom', '@luhanxin/md-parser-core', 'mermaid'],
  esbuildOptions(options) {
    options.jsx = 'automatic';
  },
});
