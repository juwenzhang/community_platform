# 微前端服务发现设计文档

> 作者: Luhanxin | 日期: 2026-03-21 | 状态: 设计中

## 1. 问题背景

### 1.1 当前痛点

目前 `GarfishContainer.tsx` 中子应用配置是**硬编码**的：

```tsx
const subApps: Record<string, { entry: string; activeWhen: string }> = {
  feed: {
    entry: 'http://localhost:5174',   // ❌ 写死 URL
    activeWhen: '/feed',
  },
};
```

这带来的问题：
- **环境切换困难**：开发/测试/生产环境的子应用 URL 不同，需要手动改代码
- **找不到子应用**：子应用未启动时，主应用静默失败，没有错误反馈
- **扩展性差**：每新增一个子应用，都要改 `GarfishContainer.tsx` 代码
- **无健康检查**：不知道子应用是否存活
- **配置分散**：子应用信息散落在多处（路由配置、Garfish 配置、菜单配置）

### 1.2 目标

设计一个 **前端服务发现机制**（`@luhanxin/app-registry`），解决：
1. 子应用注册表集中管理
2. 多环境自动切换（dev/staging/prod）
3. 子应用健康检查
4. 运行时动态注册/卸载子应用
5. 与 Garfish + 路由配置表无缝集成

## 2. 架构设计

### 2.1 整体架构

```
┌─────────────────────────────────────────────────────┐
│                    主应用 (main)                      │
│                                                      │
│  ┌──────────────┐    ┌──────────────────────────┐    │
│  │ router/      │    │ @luhanxin/app-registry   │    │
│  │ routes.tsx   │───▶│                          │    │
│  │              │    │  ┌─────────────────────┐  │    │
│  └──────────────┘    │  │  AppRegistry        │  │    │
│                      │  │  - register()       │  │    │
│  ┌──────────────┐    │  │  - resolve()        │  │    │
│  │ Garfish      │◀───│  │  - healthCheck()    │  │    │
│  │ Container    │    │  │  - getAll()         │  │    │
│  └──────────────┘    │  └─────────────────────┘  │    │
│                      │            │               │    │
│                      │  ┌─────────▼─────────┐    │    │
│                      │  │ Config Providers   │    │    │
│                      │  │ ┌───────┐┌──────┐  │    │    │
│                      │  │ │Static ││Remote│  │    │    │
│                      │  │ │Config ││Config│  │    │    │
│                      │  │ └───────┘└──────┘  │    │    │
│                      │  └────────────────────┘   │    │
│                      └──────────────────────────┘    │
└─────────────────────────────────────────────────────┘
          │ healthCheck             │ resolve
          ▼                         ▼
   ┌─────────────┐          ┌─────────────┐
   │ Feed App    │          │ Admin App   │
   │ :5174       │          │ :5175       │
   └─────────────┘          └─────────────┘
```

### 2.2 三层架构

```
Layer 1: Config Provider     — 提供子应用配置数据（静态/远程/混合）
Layer 2: AppRegistry         — 核心注册表（解析、缓存、健康检查）
Layer 3: Integrations        — 与 Garfish / Router 的适配层
```

## 3. 核心设计

### 3.1 AppManifest — 子应用描述

```typescript
/** 子应用完整描述 */
interface AppManifest {
  /** 子应用唯一名称 */
  name: string;
  /** 子应用入口 URL（支持多环境 override） */
  entry: string;
  /** 路由激活路径 */
  activeWhen: string;
  /** 元信息（用于菜单、权限等） */
  meta?: {
    title: string;
    icon?: string;
    hidden?: boolean;
    auth?: boolean;
    order?: number;         // 菜单排序
  };
  /** 健康检查端点（默认: {entry}/health） */
  healthCheckUrl?: string;
  /** 子应用类型 */
  type?: 'garfish' | 'iframe' | 'component';
  /** 子应用额外 props */
  props?: Record<string, unknown>;
}
```

### 3.2 ConfigProvider — 配置提供者

```typescript
/** 配置提供者接口 */
interface ConfigProvider {
  /** 获取所有子应用配置 */
  getApps(): Promise<AppManifest[]>;
  /** 监听配置变更（可选，用于热更新） */
  watch?(callback: (apps: AppManifest[]) => void): () => void;
}
```

**三种内置实现：**

#### (1) StaticConfigProvider — 静态配置

```typescript
// 最简单的方式：直接在代码中声明
const provider = new StaticConfigProvider([
  {
    name: 'feed',
    entry: 'http://localhost:5174',
    activeWhen: '/feed',
    meta: { title: '动态', icon: 'ReadOutlined' },
  },
  {
    name: 'admin',
    entry: 'http://localhost:5175',
    activeWhen: '/admin',
    meta: { title: '管理后台', icon: 'SettingOutlined', auth: true },
  },
]);
```

#### (2) EnvConfigProvider — 环境变量驱动

```typescript
// 根据 import.meta.env.MODE 自动选择对应环境的 URL
const provider = new EnvConfigProvider({
  feed: {
    activeWhen: '/feed',
    meta: { title: '动态', icon: 'ReadOutlined' },
    entries: {
      development: 'http://localhost:5174',
      staging: 'https://feed.staging.luhanxin.com',
      production: 'https://feed.luhanxin.com',
    },
  },
});
```

#### (3) RemoteConfigProvider — 远程配置中心

```typescript
// 从 Gateway 后端拉取子应用注册表（适合大规模团队）
const provider = new RemoteConfigProvider({
  url: '/api/v1/app-registry/manifests',
  pollInterval: 60_000,  // 60 秒轮询刷新
  fallback: staticProvider,  // 远程不可用时的降级配置
});
```

### 3.3 AppRegistry — 核心注册表

```typescript
class AppRegistry {
  constructor(provider: ConfigProvider, options?: RegistryOptions);

  /** 初始化：加载配置、执行健康检查 */
  async init(): Promise<void>;

  /** 获取所有已注册子应用 */
  getAll(): AppManifest[];

  /** 按名称解析子应用 */
  resolve(name: string): AppManifest | undefined;

  /** 获取所有健康的子应用 */
  getHealthy(): AppManifest[];

  /** 运行时动态注册一个子应用 */
  register(manifest: AppManifest): void;

  /** 运行时注销一个子应用 */
  unregister(name: string): void;

  /** 对指定子应用执行健康检查 */
  async healthCheck(name: string): Promise<HealthStatus>;

  /** 对所有子应用执行健康检查 */
  async healthCheckAll(): Promise<Map<string, HealthStatus>>;

  /** 监听注册表变更 */
  onChange(callback: (apps: AppManifest[]) => void): () => void;

  /** 销毁（清理定时器等） */
  destroy(): void;
}
```

### 3.4 健康检查机制

```typescript
interface HealthStatus {
  name: string;
  status: 'healthy' | 'unhealthy' | 'unknown';
  latency?: number;       // 响应时间 (ms)
  lastCheck: number;       // 时间戳
  error?: string;
}

interface HealthCheckOptions {
  /** 检查间隔（ms），0 = 不自动检查 */
  interval: number;
  /** 超时时间（ms） */
  timeout: number;
  /** 连续失败多少次后标记为 unhealthy */
  unhealthyThreshold: number;
  /** 检查方式 */
  method: 'fetch' | 'head';
}
```

**检查策略：**
- 开发环境：首次加载时检查，之后按需
- 生产环境：60 秒间隔轮询 + 加载失败时立即重检
- 对 `{entry}` 发送 HEAD 请求，2 秒超时
- 连续 3 次失败标记为 unhealthy

### 3.5 与 Garfish 集成

```typescript
/** Garfish 适配器 — 自动同步注册表到 Garfish.run */
function createGarfishAdapter(registry: AppRegistry) {
  return {
    /** 生成 Garfish.run 的 apps 配置 */
    getGarfishApps(): GarfishAppInfo[] {
      return registry.getHealthy()
        .filter(app => app.type !== 'iframe')
        .map(app => ({
          name: app.name,
          entry: app.entry,
          activeWhen: app.activeWhen,
          props: app.props,
        }));
    },

    /** 监听注册表变更，自动调用 Garfish.registerApp 动态注册新应用 */
    syncToGarfish(garfish: typeof Garfish): () => void {
      return registry.onChange((apps) => {
        // Garfish 支持 registerApp 动态注册
        for (const app of apps) {
          garfish.registerApp({
            name: app.name,
            entry: app.entry,
            activeWhen: app.activeWhen,
          });
        }
      });
    },
  };
}
```

### 3.6 与路由配置集成

```typescript
/** 从注册表生成路由配置（替代手写 garfish 路由） */
function registryToRoutes(registry: AppRegistry): RouteConfig[] {
  return registry.getAll()
    .filter(app => app.meta && !app.meta.hidden)
    .sort((a, b) => (a.meta?.order ?? 99) - (b.meta?.order ?? 99))
    .map(app => ({
      path: `${app.activeWhen}/*`,
      garfish: { appName: app.name },
      meta: {
        title: app.meta!.title,
        icon: app.meta?.icon,
        auth: app.meta?.auth,
      },
    }));
}
```

## 4. 使用方式

### 4.1 开发阶段（Phase 1 — StaticConfigProvider）

最简单的落地方式，无需后端支持：

```typescript
// packages/app-registry/src/index.ts
import { AppRegistry, StaticConfigProvider } from '@luhanxin/app-registry';

const registry = new AppRegistry(
  new StaticConfigProvider([
    { name: 'feed', entry: 'http://localhost:5174', activeWhen: '/feed',
      meta: { title: '动态', icon: 'ReadOutlined' } },
  ]),
  { healthCheck: { interval: 0 } },  // 开发环境关闭定时检查
);

export { registry };
```

### 4.2 多环境（Phase 2 — EnvConfigProvider）

```typescript
const registry = new AppRegistry(
  new EnvConfigProvider({
    feed: {
      activeWhen: '/feed',
      meta: { title: '动态', icon: 'ReadOutlined' },
      entries: {
        development: 'http://localhost:5174',
        staging: 'https://feed.staging.luhanxin.com',
        production: 'https://feed.luhanxin.com',
      },
    },
  }),
);
```

### 4.3 动态配置（Phase 3 — RemoteConfigProvider）

```typescript
const registry = new AppRegistry(
  new RemoteConfigProvider({
    url: '/api/v1/app-registry/manifests',
    pollInterval: 60_000,
    fallback: new EnvConfigProvider({ /* ... */ }),
  }),
);
```

## 5. 包结构

```
packages/app-registry/
├── package.json            # @luhanxin/app-registry
├── tsconfig.json
├── src/
│   ├── index.ts            # 公共导出
│   ├── types.ts            # AppManifest, HealthStatus 等类型
│   ├── registry.ts         # AppRegistry 核心类
│   ├── providers/
│   │   ├── static.ts       # StaticConfigProvider
│   │   ├── env.ts          # EnvConfigProvider
│   │   └── remote.ts       # RemoteConfigProvider
│   ├── health/
│   │   └── checker.ts      # 健康检查器
│   └── adapters/
│       ├── garfish.ts      # Garfish 适配器
│       └── router.ts       # Router 适配器
└── __tests__/
    └── registry.test.ts
```

## 6. 渐进式演进路线

| 阶段 | 方案 | 复杂度 | 适用场景 |
|------|------|--------|---------|
| Phase 1 | StaticConfigProvider | 低 | 当前开发阶段，子应用少 |
| Phase 2 | EnvConfigProvider | 中 | 多环境部署（dev/staging/prod） |
| Phase 3 | RemoteConfigProvider | 高 | 大规模团队，子应用动态上下线 |

## 7. 对比：Garfish 原生 vs app-registry

| 维度 | Garfish 原生 | @luhanxin/app-registry |
|------|-------------|------------------------|
| 子应用配置 | 硬编码在 Garfish.run | 集中配置，多 Provider 支持 |
| 多环境 | 手动切换 | EnvConfigProvider 自动切换 |
| 健康检查 | 无 | 内置 healthCheck，支持定时/按需 |
| 动态注册 | Garfish.registerApp | 注册表 → 自动同步 Garfish |
| 菜单生成 | 手动维护 | 从注册表自动生成 |
| 路由集成 | 分开配置 | registryToRoutes 自动生成 |
| 降级策略 | 无 | fallback Provider 链 |

## 8. 核心改造点

| 文件 | 改造内容 |
|------|---------|
| `GarfishContainer.tsx` | 从 app-registry 获取子应用配置，不再硬编码 |
| `routes/routes.tsx` | Garfish 类型路由从注册表自动注入 |
| `Layout.tsx` | 菜单项包含微前端子应用（从注册表生成） |
| `App.tsx` | 初始化时调用 `registry.init()` |
