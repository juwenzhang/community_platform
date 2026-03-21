# Spec: @luhanxin/app-registry Package

## Module: packages/app-registry

### ADDED Requirements

#### R1: Package Configuration
- **R1.1**: 包名 `@luhanxin/app-registry`，private: true
- **R1.2**: 纯 TypeScript，无运行时框架依赖
- **R1.3**: 导出 `"."` → `./src/index.ts`
- **R1.4**: 零生产依赖（所有类型来自项目内部）

#### R2: Core Types (types.ts)
- **R2.1**: `AppManifest` — 子应用完整描述（name, entry, activeWhen, meta, healthCheckUrl, type, props）
- **R2.2**: `HealthStatus` — 健康状态（name, status, latency, lastCheck, error）
- **R2.3**: `ConfigProvider` 接口 — getApps(): Promise<AppManifest[]>, watch?()
- **R2.4**: `RegistryOptions` — healthCheck 配置（interval, timeout, unhealthyThreshold）
- **R2.5**: `RouteMeta` 复用 `@/router` 中的定义

#### R3: ConfigProvider Implementations
- **R3.1**: `StaticConfigProvider` — 接收 AppManifest[] 构造函数，getApps() 直接返回
- **R3.2**: `EnvConfigProvider` — 根据 `import.meta.env.MODE` 自动选择对应环境 entry
- **R3.3**: `RemoteConfigProvider` — 从 URL 拉取配置，支持 pollInterval + fallback Provider
- **R3.4**: 所有 Provider 实现 `ConfigProvider` 接口

#### R4: HealthChecker
- **R4.1**: 对子应用 entry URL 发送 HEAD 请求
- **R4.2**: 默认超时 3000ms
- **R4.3**: 支持自定义 healthCheckUrl 覆盖默认地址
- **R4.4**: 缓存上次检查结果，避免重复检查
- **R4.5**: 可选定时检查（interval 配置）

#### R5: AppRegistry
- **R5.1**: `init()` — 从 Provider 加载配置，可选健康检查
- **R5.2**: `getAll()` — 返回所有已注册子应用
- **R5.3**: `resolve(name)` — 按名称查找子应用
- **R5.4**: `getHealthy()` — 返回健康状态的子应用
- **R5.5**: `register(manifest)` — 运行时动态注册
- **R5.6**: `unregister(name)` — 运行时注销
- **R5.7**: `onChange(callback)` — 订阅注册表变更，返回取消订阅函数
- **R5.8**: `destroy()` — 清理定时器、取消订阅

#### R6: Adapters
- **R6.1**: `createGarfishAdapter(registry)` — 生成 Garfish.run apps 配置
- **R6.2**: Garfish 适配器支持 `syncToGarfish()` 监听变更自动注册
- **R6.3**: `registryToRoutes(registry)` — 生成 RouteConfig[] 供路由表合并
- **R6.4**: Router 适配器自动处理 activeWhen → path 映射

### MODIFIED Requirements (主应用集成)

#### M1: GarfishContainer.tsx
- **M1.1**: 移除硬编码的 `subApps` 常量
- **M1.2**: 从 `registry.resolve(appName)` 获取子应用配置
- **M1.3**: 未找到子应用时显示友好提示（非静默失败）

#### M2: routes/routes.tsx
- **M2.1**: garfish 类型路由仅指定 `garfish: { appName: 'xxx' }`
- **M2.2**: 实际 entry URL 在运行时从 registry 解析

#### M3: App.tsx
- **M3.1**: 应用启动时调用 `registry.init()` 初始化
- **M3.2**: init 完成前显示全局 Loading
