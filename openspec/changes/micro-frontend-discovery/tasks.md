# Tasks: 微前端服务发现

## 1. @luhanxin/app-registry 包骨架

- [x] 1.1 创建 `packages/app-registry/package.json`（name: @luhanxin/app-registry）
- [x] 1.2 创建 `packages/app-registry/tsconfig.json`
- [x] 1.3 创建 `packages/app-registry/src/index.ts`（公共导出）
- [x] 1.4 在根 `pnpm-workspace.yaml` 确认 packages/* 已包含

## 2. 核心类型定义

- [x] 2.1 创建 `src/types.ts` — AppManifest、HealthStatus、ConfigProvider 接口、RegistryOptions
- [x] 2.2 创建 `src/constants.ts` — 默认配置常量

## 3. ConfigProvider 实现

- [x] 3.1 创建 `src/providers/static.ts` — StaticConfigProvider
- [x] 3.2 创建 `src/providers/env.ts` — EnvConfigProvider（多环境支持）
- [x] 3.3 创建 `src/providers/remote.ts` — RemoteConfigProvider（远程配置）
- [x] 3.4 创建 `src/providers/index.ts` — 统一导出

## 4. 健康检查器

- [x] 4.1 创建 `src/health/checker.ts` — HealthChecker 类
- [x] 4.2 实现 HEAD 请求检测 + 超时 + 重试逻辑
- [x] 4.3 实现定时检查 + 状态缓存

## 5. AppRegistry 核心

- [x] 5.1 创建 `src/registry.ts` — AppRegistry 类
- [x] 5.2 实现 init / getAll / resolve / register / unregister
- [x] 5.3 实现 onChange 事件订阅
- [x] 5.4 实现与 HealthChecker 联动
- [x] 5.5 实现 destroy 清理

## 6. 适配器

- [x] 6.1 创建 `src/adapters/garfish.ts` — Garfish 适配器（getGarfishApps、syncToGarfish）
- [x] 6.2 创建 `src/adapters/router.ts` — Router 适配器（registryToRoutes）
- [x] 6.3 创建 `src/adapters/index.ts` — 统一导出

## 7. 主应用集成

- [x] 7.1 `apps/main/package.json` — 添加 `@luhanxin/app-registry: workspace:*` 依赖
- [x] 7.2 创建 `apps/main/src/lib/registry.ts` — 初始化 AppRegistry 实例
- [x] 7.3 改造 `GarfishContainer.tsx` — 从 registry 获取配置
- [x] 7.4 改造 `routes/routes.tsx` — 微前端路由从 registry 注入
- [x] 7.5 改造 `App.tsx` — 初始化 registry
- [x] 7.6 改造 `Layout.tsx` — 菜单包含注册表中的应用

## 8. 文档与测试

- [x] 8.1 创建 `packages/app-registry/README.md`
- [x] 8.2 更新根 `README.md` 的 packages 列表
