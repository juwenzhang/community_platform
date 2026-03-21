/**
 * Vite 环境变量类型声明
 *
 * 此文件使 `import.meta.env.MODE` 等在 TypeScript 中通过类型检查。
 * Vite 在构建时会静态替换 `import.meta.env.MODE` → `"production"` 等。
 *
 * 独立声明，不依赖 vite/client（因为 app-registry 包没有 vite 作为依赖）。
 */

interface ImportMetaEnv {
  readonly MODE: string;
  readonly DEV: boolean;
  readonly PROD: boolean;
  readonly BASE_URL: string;
  readonly SSR: boolean;
  [key: string]: unknown;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
