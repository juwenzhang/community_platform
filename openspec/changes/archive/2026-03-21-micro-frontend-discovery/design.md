# Design: 微前端服务发现

## Decision 1: Provider 模式 vs 单一配置文件

### 选项

A. **Provider 模式**（接口抽象，多种实现）
B. 单一 JSON 配置文件
C. 直接调用后端 API

### 决策: 选项 A — Provider 模式

**理由：**
- 渐进式演进：Phase 1 用 StaticProvider（零成本），Phase 3 用 RemoteProvider
- 开闭原则：新增配置源只需实现 `ConfigProvider` 接口
- 支持 fallback 链：Remote → Env → Static

## Decision 2: 健康检查策略

### 选项

A. **HEAD 请求检测**（轻量，检查子应用入口是否可达）
B. 自定义 `/health` 端点
C. WebSocket 心跳

### 决策: 选项 A — HEAD 请求检测

**理由：**
- 零侵入：子应用无需新增任何端点
- 足够有效：只需确认子应用 dev server / CDN 可达
- 生产环境子应用通常部署在 CDN，HEAD 请求成本极低
- 可选升级到 B：通过 `healthCheckUrl` 字段覆盖

## Decision 3: 与 Garfish 的集成方式

### 选项

A. **适配器模式**（AppRegistry → Garfish Adapter → Garfish.run）
B. 直接 monkey-patch Garfish
C. 封装一个新的微前端容器，隐藏 Garfish

### 决策: 选项 A — 适配器模式

**理由：**
- 低耦合：app-registry 不直接依赖 Garfish
- 利用 Garfish 原生 `registerApp` API 进行动态注册
- 如果未来迁移微前端框架，只需替换适配器
- 透明性好：主应用仍直接使用 Garfish API，adapter 只做数据转换

## Decision 4: 子应用路由与主路由的关系

### 选项

A. **混合模式**（本地页面 + 注册表微前端子应用 合并到同一路由表）
B. 完全分离（微前端子应用不参与路由配置）
C. 微前端子应用全部走注册表，本地页面也走注册表

### 决策: 选项 A — 混合模式

**理由：**
- 本地页面（home、demo、article、profile）走 `routes.tsx` 配置
- 微前端子应用从注册表动态注入路由表
- 两者合并后统一渲染，菜单统一生成
- 保持灵活性：部分路由可以从本地页面渐进迁移为微前端子应用

## Decision 5: 包的技术定位

### 决策: 纯 TypeScript 包，无框架依赖

- `@luhanxin/app-registry` 核心是纯 TS（types + registry + providers + health）
- 适配器层（garfish adapter、router adapter）作为可选导出
- 这样 Vue 子应用未来也可以复用同一个注册表

## Risks

| 风险 | 概率 | 影响 | 缓解措施 |
|------|------|------|---------|
| 健康检查 CORS 问题 | 中 | 开发环境跨域 HEAD 请求可能被拦截 | 使用 `mode: 'no-cors'` 或 Vite 代理 |
| 远程配置服务不可用 | 低 | 子应用无法加载 | fallback 到本地 StaticProvider |
| 注册表初始化延迟 | 低 | 首屏菜单闪烁 | init() 在 App mount 前完成 |
