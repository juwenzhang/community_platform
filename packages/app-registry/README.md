# @luhanxin/app-registry

> [English](./README.en.md) | 中文

微前端子应用服务发现注册表。

## 功能

- **子应用配置集中管理** — 单一数据源，替代散落各处的硬编码
- **多环境自动切换** — Static → Env → Remote 三阶段渐进演进
- **健康检查** — HEAD 请求检测子应用可达性，支持定时轮询
- **运行时动态注册** — 支持运行时 register/unregister 子应用
- **适配器模式** — Garfish 适配器 + Router 适配器，低耦合集成

## 快速使用

```ts
import { AppRegistry, StaticConfigProvider } from '@luhanxin/app-registry';
import { getGarfishApps } from '@luhanxin/app-registry/adapters';

const registry = new AppRegistry({
  provider: new StaticConfigProvider([
    { name: 'feed', entry: 'http://localhost:5174', activeWhen: '/feed' },
  ]),
});

await registry.init();

// 获取所有子应用
const apps = registry.getAll();

// 按名称查找
const feed = registry.resolve('feed');

// 生成 Garfish 配置
const garfishApps = getGarfishApps(registry);
```

## API

### AppRegistry

| 方法 | 说明 |
|------|------|
| `init()` | 初始化（加载配置 + 健康检查） |
| `getAll()` | 获取所有子应用 |
| `resolve(name)` | 按名称查找 |
| `getHealthy()` | 获取健康的子应用 |
| `register(manifest)` | 运行时注册 |
| `unregister(name)` | 运行时注销 |
| `onChange(callback)` | 订阅变更事件 |
| `destroy()` | 清理资源 |

### ConfigProvider

| 实现 | 说明 |
|------|------|
| `StaticConfigProvider` | 硬编码配置（Phase 1） |
| `EnvConfigProvider` | 多环境切换（Phase 2） |
| `RemoteConfigProvider` | 远程配置拉取（Phase 3） |

### Adapters

| 函数 | 说明 |
|------|------|
| `getGarfishApps(registry)` | 生成 Garfish.run apps 配置 |
| `syncToGarfish(registry, garfish)` | 监听变更自动同步 |
| `registryToRoutes(registry)` | 生成路由配置 |
