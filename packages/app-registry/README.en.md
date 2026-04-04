# @luhanxin/app-registry — App Registry

> English | [中文](./README.md)

Micro-frontend sub-app service discovery registry.

## Features

- **Centralized app config** — Single source of truth, replaces hardcoded URLs
- **Multi-environment** — Static → Env → Remote progressive evolution
- **Health checks** — HEAD request detection with polling support
- **Runtime registration** — Dynamic register/unregister at runtime
- **Adapter pattern** — Garfish adapter + Router adapter, low-coupling integration

## Quick Start

```ts
import { AppRegistry, StaticConfigProvider } from '@luhanxin/app-registry';
import { getGarfishApps } from '@luhanxin/app-registry/adapters';

const registry = new AppRegistry({
  provider: new StaticConfigProvider([
    { name: 'feed', entry: 'http://localhost:5174', activeWhen: '/feed' },
  ]),
});

await registry.init();
const garfishApps = getGarfishApps(registry);
```

## API

| Method | Description |
|--------|-------------|
| `init()` | Initialize (load config + health check) |
| `getAll()` | Get all sub-apps |
| `resolve(name)` | Find by name |
| `getHealthy()` | Get healthy sub-apps |
| `register(manifest)` | Runtime register |
| `unregister(name)` | Runtime unregister |
| `onChange(callback)` | Subscribe to changes |
| `destroy()` | Cleanup |
