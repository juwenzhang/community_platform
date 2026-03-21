# Spec: 前端目录结构升级

## Module: apps/*/src/ 目录规范

### ADDED Requirements

#### R1: src 顶层目录标准化
- **R1.1**: 所有前端子应用 src/ 下必须遵循统一目录结构
- **R1.2**: 必须目录：`components/`, `stores/`, `router/`, `pages/`（React）或 `views/`（Vue）
- **R1.3**: 可选目录：`hooks/`（React）或 `composables/`（Vue）、`utils/`、`lib/`、`logicals/`、`styles/`、`i18n/`
- **R1.4**: `utils/` 存放纯函数工具（无框架依赖），`lib/` 存放 SDK 封装

#### R2: pages 模块化规范
- **R2.1**: 每个页面是 `pages/<name>/` 目录，`index.tsx` 为入口组件
- **R2.2**: 页面内部结构与 src/ 顶层自相似：components/、stores/、hooks/、utils/、styles/
- **R2.3**: 页面私有资源只被本页面使用；≥2 个页面引用时提升到 src/ 对应目录
- **R2.4**: 页面入口组件必须 `export default`

#### R3: 子路由自治规范
- **R3.1**: 有子页面的 page 可以有自己的 `router/routes.tsx`
- **R3.2**: 子页面放在 `pages/<parent>/pages/<child>/` 下
- **R3.3**: 根路由 `src/router/routes.tsx` 只注册一级页面
- **R3.4**: 子路由配置 meta 通常设 `hidden: true`（不显示在主菜单）
- **R3.5**: 子路由在页面入口组件中通过 `renderRoutes()` 渲染

#### R4: 路由配置化
- **R4.1**: 所有路由通过 `RouteConfig` 配置表定义，不在组件中硬编码 `<Route>`
- **R4.2**: 菜单从路由配置表 meta 字段自动生成
- **R4.3**: 支持 lazy import 代码分割
- **R4.4**: 支持 garfish 微前端子应用路由
- **R4.5**: 支持嵌套子路由递归渲染

### MODIFIED Requirements

#### M1: apps/main/src/
- **M1.1**: 补充缺失的 `hooks/`、`utils/` 目录
- **M1.2**: 将 `index.css` 移入 `styles/` 目录
- **M1.3**: 确保路由目录名统一为 `router/`（当前代码使用 `routes/`，需统一）

#### M2: apps/feed/src/
- **M2.1**: 添加 `pages/`、`components/`、`stores/`、`router/` 目录结构
- **M2.2**: 将 FeedApp 内容迁移到 `pages/feed/` 模块化结构
