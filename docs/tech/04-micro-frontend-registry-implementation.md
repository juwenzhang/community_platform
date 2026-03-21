# 微前端服务发现 — @luhanxin/app-registry 实现总结

> **关联变更**：`micro-frontend-discovery`（已归档 2026-03-21）
> **前置调研**：[03-micro-frontend-service-discovery.md](./03-micro-frontend-service-discovery.md)

---

## 1. 背景与动机

在完成开发态服务发现（`@luhanxin/dev-kit` Vite 插件 + `.dev-registry.json`）之后，我们需要一个**运行时注册表**来统一管理微前端子应用的配置。之前的问题：

| 问题 | 影响 |
|------|------|
| 子应用 URL 硬编码在 `GarfishContainer.tsx` | 无法自动适配 dev/staging/prod 环境 |
| 子应用未启动时静默失败 | 用户看到空白页，无错误提示 |
| 新增子应用需修改多处代码 | GarfishContainer、路由配置、菜单配置分散维护 |
| 配置不是单一数据源 | 子应用信息散落在路由、Garfish 配置、菜单组件三处 |

## 2. 核心技术决策

### Decision 1: Provider 模式（接口抽象 + 多实现）

**选定方案**：Provider 模式（`ConfigProvider` 接口 + Static / Env / Remote 三种实现）

**淘汰方案**：
- ❌ 单一 JSON 配置文件 — 不够灵活，无法支持远程配置
- ❌ 直接调用后端 API — 过早引入后端依赖，当前阶段不需要

**核心优势**：
- 渐进式演进：Phase 1 用 `StaticProvider`（零成本），Phase 3 切 `RemoteProvider`
- 开闭原则：新增配置源只需实现 `ConfigProvider` 接口
- 支持 fallback 链：Remote → Env → Static

### Decision 2: HEAD 请求健康检查

**选定方案**：对子应用 entry URL 发送 `HEAD` 请求

**淘汰方案**：
- ❌ 自定义 `/health` 端点 — 要求子应用改造，侵入性高
- ❌ WebSocket 心跳 — 过于重量级

**核心优势**：
- 零侵入：子应用无需新增任何端点
- 生产环境子应用通常部署在 CDN，HEAD 请求成本极低
- 可选升级：通过 `healthCheckUrl` 字段覆盖为自定义端点

### Decision 3: 适配器模式集成 Garfish

**选定方案**：`AppRegistry → Garfish Adapter → Garfish.run`

**淘汰方案**：
- ❌ Monkey-patch Garfish — 侵入性强，升级困难
- ❌ 封装新微前端容器 — 过度封装，失去 Garfish 原生能力

**核心优势**：
- 低耦合：`app-registry` 不直接依赖 Garfish
- 适配器只做数据转换，主应用仍直接使用 Garfish API
- 未来迁移微前端框架只需替换适配器

### Decision 4: 混合路由模式

**选定方案**：本地页面 + 注册表微前端子应用合并到同一路由表

**核心优势**：
- 本地页面（home、demo、article、profile）走 `routes.tsx` 静态配置
- 微前端子应用从注册表动态注入路由
- 两者合并后统一渲染，菜单统一生成
- 保持渐进迁移能力

### Decision 5: 纯 TypeScript 包，无框架依赖

- 核心代码（types + registry + providers + health）是纯 TS
- 适配器层（garfish adapter、router adapter）作为可选导出
- Vue 子应用未来也可以复用同一个注册表

## 3. 包结构

```
packages/app-registry/
├── package.json            # @luhanxin/app-registry, private: true
├── tsconfig.json
├── README.md
└── src/
    ├── index.ts            # 统一导出
    ├── types.ts            # AppManifest, HealthStatus, ConfigProvider, RegistryOptions
    ├── constants.ts        # 默认配置常量
    ├── registry.ts         # AppRegistry 核心类
    ├── health/
    │   └── checker.ts      # HealthChecker（HEAD 请求 + 超时 + 重试）
    ├── providers/
    │   ├── index.ts
    │   ├── static.ts       # StaticConfigProvider
    │   ├── env.ts          # EnvConfigProvider（多环境自动切换）
    │   └── remote.ts       # RemoteConfigProvider（远程拉取 + 轮询）
    └── adapters/
        ├── index.ts
        ├── garfish.ts      # Garfish 适配器
        └── router.ts       # Router 适配器
```

## 4. 主应用集成方式

```tsx
// apps/main/src/lib/registry.ts — 创建全局实例
import { AppRegistry, EnvConfigProvider } from '@luhanxin/app-registry';

export const registry = new AppRegistry({
  provider: new EnvConfigProvider({ ... }),
  healthCheck: { interval: 30000, timeout: 3000 },
});

// apps/main/src/App.tsx — 初始化
await registry.init();  // init 完成前显示 Loading

// apps/main/src/routes/routes.tsx — 路由注入
const microRoutes = registryToRoutes(registry);
const allRoutes = [...localRoutes, ...microRoutes];
```

## 5. 风险与缓解

| 风险 | 概率 | 缓解措施 |
|------|------|---------|
| 健康检查 CORS 问题 | 中 | 使用 `mode: 'no-cors'` 或 Vite 代理 |
| 远程配置服务不可用 | 低 | fallback 到本地 StaticProvider |
| 注册表初始化延迟 | 低 | `init()` 在 App mount 前完成 |

## 6. 前端目录结构升级

本次变更同时建立了前端子应用的目录规范：

### 标准 src/ 结构

```
src/
├── components/     # 全局公共组件
├── stores/         # 全局状态（Zustand / Pinia）
├── router/         # 路由配置化
├── hooks/          # React 自定义 Hooks
├── utils/          # 纯工具函数
├── lib/            # SDK 封装
├── logicals/       # 业务逻辑层
├── styles/         # 全局样式
├── pages/          # 页面模块（自相似结构）
├── App.tsx
└── main.tsx
```

### 页面模块化原则

- **页面即模块**：每个页面是 `pages/<name>/` 目录
- **结构自相似**：页面内部结构与 `src/` 顶层一致
- **就近原则**：页面私有资源放在页面目录下
- **向上提升**：被 ≥2 个页面引用的资源提升到 `src/`
- **子路由自治**：有嵌套页面的 page 自管 `router/routes.tsx`

## 7. 演进路线

| 阶段 | 配置来源 | 状态 |
|------|---------|------|
| **Phase 1** (当前) | `StaticConfigProvider` — 硬编码在代码中 | ✅ 已实现 |
| **Phase 2** | `EnvConfigProvider` — 根据 `import.meta.env.MODE` 自动切换 | ✅ 已实现 |
| **Phase 3** | `RemoteConfigProvider` — 从后端 API 拉取 | ✅ 已实现（待后端服务就绪） |

## 8. 相关文档

| 文档 | 说明 |
|------|------|
| [01-data-serialization-formats.md](./01-data-serialization-formats.md) | 数据序列化格式选型（Protobuf vs JSON） |
| [02-frontend-backend-protocols.md](./02-frontend-backend-protocols.md) | 前后端通信协议选型（HTTP/2 + Connect） |
| [03-micro-frontend-service-discovery.md](./03-micro-frontend-service-discovery.md) | 微前端服务发现方案调研与设计 |
| **本文** | app-registry 包实现总结与技术决策 |
