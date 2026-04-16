## Why

当前 `apps/main/` 宿主应用承载了过多业务模块：首页、认证、文章 CRUD（列表/详情/编辑）、个人中心、搜索。随着平台功能的快速扩展（新一代编辑器、评论升级、RAG 搜索等），main app 的代码量和 Bundle 体积将持续膨胀，违背了 Garfish 微前端架构「子应用自治」的设计初衷。

具体问题：
- **main app 过重**：pages/ 下有 6 个页面模块（auth/home/post/profile/search/user），其中 post 和 search 是独立的业务域
- **编辑器升级受阻**：计划中的类飞书块编辑器（TipTap/Yjs）将引入大量依赖（协同编辑、CRDT、版本历史），放在 main app 会导致主站首屏性能下降
- **搜索功能独立性强**：搜索涉及 Meilisearch + 未来 RAG 向量检索，是独立的功能域，不应与主站耦合
- **团队协作困难**：所有功能都在一个 app 里，多人并行开发时 Git 冲突频繁

## What Changes

### 拆出 `apps/article` 子应用

从 main 中提取 `pages/post/` 相关的页面和组件：

- **文章列表页** — `/articles`（文章 Feed）
- **文章详情页** — `/article/:id`
- **文章编辑页** — `/article/:id/edit`
- **文章创建页** — `/article/new`
- 相关私有组件：`ArticleCard`、`ArticleEditor`、`MarkdownRender`、`CommentSection` 等
- 相关私有 stores、hooks、styles

### 拆出 `apps/search` 子应用

从 main 中提取 `pages/search/` 相关的页面和组件：

- **搜索结果页** — `/search?q=xxx`
- **高级搜索** — `/search/advanced`
- 相关私有组件、stores、hooks

### main app 精简后保留

- 首页（home）
- 认证（auth）
- 个人中心（profile）
- 用户信息页（user）
- 全局导航、布局、路由注册

### 共享依赖提升

拆分过程中，被 ≥2 个子应用引用的资源提升到对应位置：
- 组件 → `packages/` 或新建 `packages/shared-ui/`
- Stores → 各子应用独立（通过 Connect RPC 获取数据）
- Hooks/Utils → `packages/shared-utils/`

## 非目标 (Non-goals)

- **不拆 profile 子应用** — 个人中心与主站导航耦合较强（头像下拉、设置入口等），暂保留在 main
- **不涉及编辑器升级** — 本次只做拆分迁移，不引入 TipTap/Yjs 等新编辑器（另见 `next-gen-document-editor` change）
- **不涉及搜索功能增强** — 本次只做拆分迁移，不引入 RAG/向量检索（另见 `rag-plugin-system` change）
- **不涉及后端 API 变更** — 前后端交互接口不变，只是前端消费侧从 main 移到子应用
- **不涉及 Garfish 架构变更** — 子应用加载机制、dev-registry、app-registry 保持不变

## 与现有设计文档的关系

- **`docs/design/2026-03-20/02-frontend-architecture.md`** — 本次拆分遵循其微前端架构设计，将过度集中的模块独立为子应用
- **`docs/design/2026-03-20/01-tech-overview.md`** — 技术栈不变，React + Garfish + Connect RPC
- **`docs/tech/03-micro-frontend-service-discovery.md`** — 新子应用复用现有的 app-registry 服务发现机制
- **`docs/tech/04-micro-frontend-registry-implementation.md`** — 新子应用复用现有的注册中心实现

## Capabilities

### New Capabilities

- `article-sub-app`: 文章子应用 — 独立的文章列表/详情/编辑/创建页面，包含文章相关的所有私有组件和状态管理
- `search-sub-app`: 搜索子应用 — 独立的搜索结果页和高级搜索，包含搜索相关的所有私有组件和状态管理

### Modified Capabilities

- `main-host-app`: 主站精简 — 移除文章和搜索页面后，main app 职责更清晰，Bundle 更小
- `micro-frontend-registry`: 注册中心扩展 — 新增 article 和 search 子应用的注册配置

## Impact

### 代码影响

| 范围 | 变更类型 | 说明 |
|------|---------|------|
| `apps/article/` | 新增 | 从 main/pages/post 迁移，新建完整子应用 |
| `apps/search/` | 新增 | 从 main/pages/search 迁移，新建完整子应用 |
| `apps/main/src/pages/post/` | 删除 | 迁移到 article 子应用 |
| `apps/main/src/pages/search/` | 删除 | 迁移到 search 子应用 |
| `apps/main/src/components/` | 部分 | ArticleEditor/MarkdownRender/ArticleCard 等迁移到 article，搜索相关迁移到 search |
| `apps/main/src/routes/routes.tsx` | 修改 | 移除 article/search 本地路由，改为通过 app-registry 注册子应用路由 |
| `apps/main/package.json` | 修改 | 移除文章/搜索相关依赖 |
| `pnpm-workspace.yaml` | 无变更 | `apps/*` 通配符已覆盖新子应用 |

### API 影响

- 无后端 API 变更
- 前端路由路径保持不变（`/article/:id`、`/search`），用户无感知

### 依赖影响

- 新增 `apps/article/package.json` — 依赖 @luhanxin/shared-types、@connectrpc/connect-web、antd 等
- 新增 `apps/search/package.json` — 依赖 @luhanxin/shared-types、@connectrpc/connect-web 等
- 如果 ArticleEditor/MarkdownRender 被提取为共享包，需新增 `packages/shared-ui/`

### 测试影响

- main app 的现有测试需更新（移除文章/搜索相关测试）
- article/search 子应用需新建独立测试
