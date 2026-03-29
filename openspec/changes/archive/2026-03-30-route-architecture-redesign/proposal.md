## Why

当前路由架构存在严重的**功能重复**和**职责不清**问题：

1. **首页 `/` 和文章 `/article` 重复**：首页展示的就是文章列表，`/article` 也展示文章列表，两个一级路由做同样的事情。参考掘金，**首页即文章 Feed**，不需要独立的 `/article` 一级路由。
2. **个人页面两套重叠**：React `/profile` 和 Vue `/user/:username` 都展示用户信息+文章列表，功能重复。
3. **创作中心作为全局路由不合理**：`/article/create` 是一个需认证的个人功能，不应该是一级路由下的子页面，应该归属于个人页面体系。
4. **文章详情/编辑嵌套在 `/article/*` 内部**：用独立 `<Routes>` 嵌套，与配置化路由不一致。

参考掘金的路由设计：首页是文章 Feed，文章详情是独立页面，个人主页有 Tabs（动态/文章/专栏/收藏集/关注）。

## What Changes

### 路由重构

| 变更前 | 变更后 | 说明 |
|--------|--------|------|
| `/` 首页（文章列表+侧边栏） | `/` 首页 = 文章 Feed（保持不变） | 首页就是文章 Feed |
| `/article` 文章列表 + 侧边栏 | **删除** | 与首页重复，合并到首页 |
| `/article/:id` 文章详情 | `/post/:id` 文章详情 | 提升为一级路由，不嵌套在 article 下 |
| `/article/:id/edit` 文章编辑 | `/post/:id/edit` 文章编辑 | 同上 |
| `/article/create` 创作中心 | `/profile/create` 创作中心 | 归属个人页面子路由 |
| `/profile` 个人设置 | `/profile/*` 个人中心 | 保留，增加子路由 |
| `/user/:username` Vue 子应用 | `/user/:username/*` Vue 子应用 | 保留，增加 Tab 子路由 |

### 新路由表

```
/                    → 首页 = 文章 Feed + 侧边栏（React main）
/post/:id            → 文章详情页（React main，一级路由）
/post/:id/edit       → 文章编辑页（React main，需认证）
/auth                → 登录页（hidden）
/profile/*           → 个人中心（React main，需认证）
  ├── /profile       → 个人设置（编辑资料）
  └── /profile/create → 创作中心（文章管理）
/user/:username/*    → 个人主页（Vue 子应用，公开）
  ├── 动态 Tab        → 默认（后期）
  ├── 文章 Tab        → 文章列表
  └── ...            → 收藏集/关注等（后期）
```

### 文件删除/移动/重构清单

**删除（6 个文件）：**
- `pages/article/index.tsx` — 文章模块入口（被首页替代）
- `pages/article/article.module.less` — 文章模块样式
- `pages/article/components/ArticleSidebar/` (2 个文件) — 文章侧边栏（首页已有侧边栏）

**移动（组件提升到全局共享）：**
- `pages/article/components/ArticleCard/` → `components/ArticleCard/` — 被首页和 Vue 都引用
- `pages/article/components/ArticleList/` → `components/ArticleList/` — 被首页和 profile 都引用
- `pages/article/components/ArticleEditor/` → `components/ArticleEditor/` — 被 create 和 edit 都引用
- `pages/article/components/ArticleToc/` → `components/ArticleToc/` — 详情页引用

**重构：**
- `pages/article/pages/detail/` → `pages/post/index.tsx` — 提升为一级路由
- `pages/article/pages/edit/` → `pages/post/pages/edit/index.tsx` — post 子路由
- `pages/article/pages/create/` → `pages/profile/pages/create/index.tsx` — profile 子路由
- `pages/home/index.tsx` — 移除对 `../article/components/ArticleList` 的跨模块引用，改用 `@/components/ArticleList`
- `pages/profile/index.tsx` — 增加子路由（设置 + 创作中心）

## Non-goals（非目标）

- **Vue 子应用 Tab 系统实现**：本次只预留路由结构，Tab 内容（动态/收藏集/关注）属于后续 change
- **文章搜索/排序**：首页文章 Feed 的排序/搜索功能属于 `article-search` change
- **SEO/SSR**：路由重构不涉及 SSR
- **feed 子应用**：`/feed` 路由暂不变动

## Capabilities

### New Capabilities
- `post-route`: 文章详情/编辑提升为独立一级路由 `/post/:id`
- `profile-subroutes`: 个人中心子路由体系（设置 + 创作中心）

### Modified Capabilities
- `frontend-structure-upgrade`: 路由配置表重构 + 共享组件提升
- `frontend-auth`: 创作中心从 `/article/create` 移到 `/profile/create`，AuthGuard 路径变更
- `header-user-status`: Header 下拉菜单路由指向更新

## Impact

- **路由配置**: `routes/routes.tsx` 完全重写
- **页面文件**: 删除 6 个文件，移动 8+ 个文件，重构 5+ 个文件
- **导入路径**: 所有引用 `pages/article/components/*` 的文件需要更新 import
- **Vue 子应用**: UserProfile.vue 文章链接从 `/article/:id` 改为 `/post/:id`
- **Header 菜单**: UserArea 菜单项路由更新
- **apiTester.http**: 无影响（后端路由不变）

## 与现有设计文档的关系

- 遵循 `docs/design/2025-03-20/02-frontend-architecture.md` 的页面即模块、向上提升原则
- 遵循项目规范中的子路由自治规范
