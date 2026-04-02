## Why

当前 main 应用中，只有 `useAuthStore` 是完整的 Zustand store（login/register/logout/restore/updateUser）。而文章相关的数据获取、缓存、变更操作完全散落在 4 个组件中，每个组件各自创建 `articleClient`、各自 `useState<Article[]>`、各自发 RPC 请求。`useArticleStore.ts` 是一个空壳（只有 import 没有任何 state/action）。

核心问题：
1. **无状态共享**：首页 ArticleList、文章管理 ManagePage、详情页 DetailPage 各自 fetch 同一份数据，无法跨组件联动刷新
2. **RPC 调用散落**：6 处组件各自创建 `createClient`，违反集中管理原则
3. **Loading 骨架屏体验差**：当前用 Ant `Skeleton` 堆叠，缺乏业务针对性的占位态

## What Changes

### 状态管理集中化
- **完善 `useArticleStore`**：实现文章列表/详情/CRUD 的集中 store（listArticles、getArticle、createArticle、updateArticle、deleteArticle）
- **组件瘦身**：ArticleList、DetailPage、EditPage、ManagePage 从"内联 RPC + useState"改为消费 `useArticleStore`
- **消除重复 `createClient`**：所有 `articleClient` 调用收口到 store 内部

### Loading 态优化
- ArticleList 的 Skeleton 替换为自定义文章卡片占位骨架（模拟 ArticleCard 的真实布局）

## Non-goals（非目标）

- 用户列表 UserList 的 store 化（数据量小，保持现有方式）
- EditProfileForm 的 store 化（已有 useAuthStore.updateUser，够用）
- SSR / 服务端状态管理
- 无限滚动 / 虚拟列表（后续 change）
- 文章缓存策略（localStorage / IndexedDB）

## Capabilities

### New Capabilities
- `article-store`: 文章 Zustand store — 集中管理文章列表、详情、CRUD 操作、loading/error 状态

### Modified Capabilities
- `frontend-auth`: useAuthStore 无需改动，但 EditProfileForm 中的动态 import createClient 可顺带收口到 store

## Impact

- **前端 stores/**: `useArticleStore.ts` 从空壳实现为完整 store
- **前端 components/**: `ArticleList/index.tsx` 消费 store 替代内联 RPC
- **前端 pages/**: `post/detail`、`post/edit`、`profile/manage` 消费 store
- **无后端变更**：纯前端重构

## 与现有设计文档的关系

- 遵循 `docs/design/2026-03-20/02-frontend-architecture.md` 的 Zustand 状态管理规范
- 遵循项目规范中 `stores/` 目录仅存放跨页面共享状态的原则
