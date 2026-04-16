/// <reference types="vite/client" />

declare module '*.vue' {
  import type { DefineComponent } from 'vue';
  const component: DefineComponent<{}, {}, any>;
  export default component;
}

// External dependencies — 类型声明（作为 peerDependency/external，不打包）
declare module 'mermaid' {
  const mermaid: {
    initialize(config: Record<string, unknown>): void;
    render(id: string, code: string): Promise<{ svg: string }>;
  };
  export default mermaid;
}
