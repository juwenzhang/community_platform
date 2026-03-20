import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5174,
    cors: true,
    origin: 'http://localhost:5174',
  },
  build: {
    // Garfish 子应用需要 UMD 格式
    lib: {
      entry: './src/main.tsx',
      name: 'feed',
      formats: ['umd'],
      fileName: 'feed',
    },
    rollupOptions: {
      external: ['react', 'react-dom'],
      output: {
        globals: {
          react: 'React',
          'react-dom': 'ReactDOM',
        },
      },
    },
  },
});
