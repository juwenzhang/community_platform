# @luhanxin/dev-kit — Development Toolkit

> English | [中文](./README.md)

Monorepo development tools: **Vite plugins + sub-app service discovery + port registration**.

## Features

| Module | Description |
|--------|-------------|
| `garfishSubApp` | Vite plugin: auto-registers sub-app port to `.dev-registry.json` on dev server start |
| `devRegistryMiddleware` | Vite plugin: exposes `/__dev_registry__` API on main app for sub-app discovery |
| `registry-file` | `.dev-registry.json` read/write utilities (single source of truth) |
| `types` | TypeScript interfaces (Registry/Manifest) |

## Usage

### Sub-app (e.g., feed)

```ts
import { garfishSubApp } from '@luhanxin/dev-kit/vite';
export default defineConfig({
  plugins: [react(), garfishSubApp({ name: 'feed' })],
});
```

### Main app

```ts
import { devRegistryMiddleware } from '@luhanxin/dev-kit/vite';
export default defineConfig({
  plugins: [react(), devRegistryMiddleware()],
});
```

## Build

```bash
pnpm --filter @luhanxin/dev-kit build  # tsup build
pnpm --filter @luhanxin/dev-kit dev    # tsup --watch
```
