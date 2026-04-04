# @luhanxin/dev-kit — 开发工具包

> [English](./README.en.md) | 中文

Monorepo 开发态工具：**Vite 插件 + 子应用服务发现 + 端口注册**。

## 功能

| 模块 | 说明 |
|------|------|
| `garfishSubApp` | Vite 插件：子应用 dev server 启动后自动注册端口到 `.dev-registry.json` |
| `devRegistryMiddleware` | Vite 插件：主应用暴露 `/__dev_registry__` API 供前端读取子应用地址 |
| `registry-file` | `.dev-registry.json` 读写工具（单一数据源） |
| `types` | TypeScript 接口定义（Registry/Manifest） |

## 使用

### 子应用（如 feed）

```ts
// vite.config.ts
import { garfishSubApp } from '@luhanxin/dev-kit/vite';

export default defineConfig({
  plugins: [react(), garfishSubApp({ name: 'feed' })],
});
```

### 主应用

```ts
// vite.config.ts
import { devRegistryMiddleware } from '@luhanxin/dev-kit/vite';

export default defineConfig({
  plugins: [react(), devRegistryMiddleware()],
});
```

## 构建

```bash
pnpm --filter @luhanxin/dev-kit build  # tsup 构建
pnpm --filter @luhanxin/dev-kit dev    # tsup --watch
```

## 导出

```json
{
  ".": "./dist/index.js",
  "./vite": "./dist/vite/index.js"
}
```
