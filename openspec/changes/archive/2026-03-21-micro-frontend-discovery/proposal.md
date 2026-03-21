# Proposal: 微前端服务发现 (@luhanxin/app-registry)

## Why

当前微前端子应用配置硬编码在 `GarfishContainer.tsx` 中，存在以下问题：

1. **环境耦合**：子应用 URL 写死为 `localhost:5174`，无法自动适配 dev/staging/prod 环境
2. **脆弱性**：子应用未启动时主应用静默失败，无健康检查反馈
3. **扩展性差**：每新增子应用需修改多处代码（GarfishContainer、路由配置、菜单配置）
4. **配置分散**：子应用信息散落在路由配置、Garfish 配置、菜单组件三处，不是单一数据源

## What Changes

创建 `@luhanxin/app-registry` 共享包，作为微前端子应用的**服务发现层**：

### 新增
- `packages/app-registry/` — 子应用注册表核心包
  - `AppRegistry` 类 — 注册表管理（注册、解析、健康检查）
  - `ConfigProvider` 接口 — 配置提供者（Static / Env / Remote 三种实现）
  - `HealthChecker` — 子应用健康检查器
  - Garfish 适配器 — 自动同步注册表到 Garfish.run
  - Router 适配器 — 从注册表自动生成路由配置

### 修改
- `apps/main/src/components/GarfishContainer.tsx` — 从 app-registry 获取配置
- `apps/main/src/routes/routes.tsx` — 微前端路由从注册表自动注入
- `apps/main/src/components/Layout.tsx` — 菜单包含注册表中的微前端应用
- `apps/main/src/App.tsx` — 初始化 registry

## Capabilities

完成后系统具备：
- 子应用配置集中管理，单一数据源
- 多环境自动切换（开发/测试/生产）
- 子应用健康检查（首次加载 + 定时轮询）
- 运行时动态注册/卸载子应用
- 从注册表自动生成路由和菜单
- 渐进式演进（Static → Env → Remote 三阶段）

## Impact

| 维度 | 影响 |
|------|------|
| 新增包 | `packages/app-registry/` (~15 个文件) |
| 修改文件 | 4 个文件（GarfishContainer、routes、Layout、App） |
| 破坏性变更 | 无，向后兼容 |
| 依赖变更 | 主应用新增 `@luhanxin/app-registry: workspace:*` |
| 风险 | 低 — Phase 1 使用 StaticConfigProvider，等价于当前硬编码 |
