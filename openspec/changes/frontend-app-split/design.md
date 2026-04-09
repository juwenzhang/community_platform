## Context

当前前端架构采用 Garfish 微前端，已有 3 个子应用：

| 子应用 | 框架 | 端口 | 功能 |
|--------|------|------|------|
| `apps/main` | React 18 | 5173 | 宿主应用（首页/认证/文章CRUD/个人中心/搜索） |
| `apps/feed` | React 18 | 5174 | Feed 流（Mock 数据，MVP 阶段） |
| `apps/user-profile` | Vue 3 | 5175 | 用户资料（已接入 API） |

main app 的 `pages/` 目录包含 6 个模块：auth、home、post、profile、search、user。其中 post（文章）和 search（搜索）是独立的业务域，各自有完整的 CRUD 操作和私有组件。

本次拆分的目标是：
1. 将 post 模块拆为独立的 `apps/article` 子应用
2. 将 search 模块拆为独立的 `apps/search` 子应用
3. main app 精简为纯宿主（首页 + 认证 + 个人中心）

## Goals / Non-Goals

**Goals:**

1. 从 main 中拆出 `apps/article` 子应用，承载所有文章相关页面和组件
2. 从 main 中拆出 `apps/search` 子应用，承载所有搜索相关页面和组件
3. main app Bundle 体积减少 40%+
4. 路由路径保持不变，用户无感知
5. 新子应用接入 dev-registry 和 app-registry，复用现有微前端基础设施

**Non-Goals:**

- 不引入新编辑器（TipTap/Yjs），另见 `next-gen-document-editor` change
- 不增强搜索功能（RAG/向量检索），另见 `rag-plugin-system` change
- 不拆 profile 子应用
- 不修改后端 API
- 不引入新的 npm 包

## Decisions

### Decision 1: 拆分范围与原则

**拆分原则**：

| 原则 | 说明 |
|------|------|
| **页面即模块** | 整个 `pages/post/` 目录迁移，包括子页面（detail、edit） |
| **就近原则** | 只被文章使用的组件（ArticleEditor/MarkdownRender/ArticleCard）跟随迁移 |
| **向上提升** | 被多个子应用共享的组件提升到 `packages/` |

**article 子应用迁移清单**：

```
apps/article/
├── src/
│   ├── main.tsx              # Garfish 子应用入口
│   ├── ArticleApp.tsx         # App 根（export for Garfish）
│   ├── pages/
│   │   ├── index.tsx          # 文章列表（原 /post → /articles）
│   │   ├── components/
│   │   │   └── ArticleList.tsx
│   │   └── pages/
│   │       ├── detail/        # /article/:id
│   │       │   ├── index.tsx
│   │       │   └── components/
│   │       │       ├── CommentSection.tsx
│   │       │       └── ArticleContent.tsx
│   │       └── edit/          # /article/:id/edit 和 /article/new
│   │           ├── index.tsx
│   │           └── components/
│   │               └── ArticleEditor.tsx
│   ├── components/
│   │   ├── MarkdownRender/    # 从 main/components 迁移
│   │   │   ├── index.tsx
│   │   │   └── markdownRender.module.less
│   │   └── ArticleCard/
│   │       ├── index.tsx
│   │       └── articleCard.module.less
│   ├── stores/
│   │   └── useArticleStore.ts
│   ├── hooks/
│   │   └── useArticle.ts
│   ├── routes/
│   │   ├── routes.tsx
│   │   └── renderRoutes.tsx
│   ├── styles/
│   │   └── article.module.less
│   └── lib/
│       └── connect.ts         # 子应用独立 Connect transport
├── vite.config.ts
├── tsconfig.json
└── package.json
```

**search 子应用迁移清单**：

```
apps/search/
├── src/
│   ├── main.tsx
│   ├── SearchApp.tsx
│   ├── pages/
│   │   ├── index.tsx          # /search?q=xxx
│   │   └── components/
│   │       ├── SearchBar.tsx
│   │       ├── SearchResultList.tsx
│   │       └── SearchFilter.tsx
│   ├── stores/
│   │   └── useSearchStore.ts
│   ├── routes/
│   │   └── routes.tsx
│   ├── styles/
│   │   └── search.module.less
│   └── lib/
│       └── connect.ts
├── vite.config.ts
├── tsconfig.json
└── package.json
```

### Decision 2: 路由迁移策略

**现有路由**（`apps/main/src/routes/routes.tsx`）：

```tsx
// 当前 main 的路由
{ path: '/post/*', component: lazy(() => import('@/pages/post')), meta: { title: '文章' } }
{ path: '/search', component: lazy(() => import('@/pages/search')), meta: { title: '搜索', hidden: true } }
```

**拆分后**：

1. main 的 `routes.tsx` 移除 article/search 本地路由
2. main 通过 app-registry 动态注册子应用路由：

```tsx
// apps/article 的子路由
const articleRoutes: RouteConfig[] = [
  { path: '/articles', component: lazy(() => import('./pages/index')), meta: { title: '文章列表', hidden: true } },
  { path: '/article/:id', component: lazy(() => import('./pages/detail')), meta: { title: '文章详情', hidden: true } },
  { path: '/article/:id/edit', component: lazy(() => import('./pages/edit')), meta: { title: '编辑文章', hidden: true, auth: true } },
  { path: '/article/new', component: lazy(() => import('./pages/edit')), meta: { title: '写文章', hidden: true, auth: true } },
];

// apps/search 的子路由
const searchRoutes: RouteConfig[] = [
  { path: '/search', component: lazy(() => import('./pages/index')), meta: { title: '搜索', hidden: true } },
  { path: '/search/advanced', component: lazy(() => import('./pages/advanced')), meta: { title: '高级搜索', hidden: true } },
];
```

**向后兼容**：路由路径 `/article/:id` 保持不变。如果原路径是 `/post/*`，在 main 中添加 redirect：

```tsx
{ path: '/post/*', redirect: '/articles' }
```

### Decision 3: 子应用配置（Vite + Garfish）

**vite.config.ts 模板**：

```typescript
// apps/article/vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { garfishSubApp } from '@luhanxin/dev-kit/vite';

export default defineConfig({
  plugins: [
    react(),
    garfishSubApp({ name: 'article' }),  // 自动注册到 .dev-registry.json
  ],
  server: {
    port: 5176,  // article 端口
    proxy: {
      '/luhanxin.community.v1': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
    },
  },
  resolve: {
    alias: { '@': './src' },
  },
});
```

**package.json 模板**：

```json
{
  "name": "@luhanxin/article",
  "version": "0.0.1",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "@connectrpc/connect": "^2.0.0",
    "@connectrpc/connect-web": "^2.0.0",
    "@luhanxin/shared-types": "workspace:*",
    "@luhanxin/dev-kit": "workspace:*",
    "react": "^18.3.0",
    "react-dom": "^18.3.0",
    "react-router-dom": "^7.0.0",
    "zustand": "^5.0.0",
    "antd": "^5.22.0"
  },
  "devDependencies": {
    "@types/react": "^18.3.0",
    "@types/react-dom": "^18.3.0",
    "@vitejs/plugin-react": "^4.3.0",
    "typescript": "^5.6.0",
    "vite": "^6.0.0"
  }
}
```

### Decision 4: 端口分配

| 子应用 | 端口 | 状态 |
|--------|------|------|
| main | 5173 | 已有 |
| feed | 5174 | 已有 |
| user-profile | 5175 | 已有 |
| **article** | **5176** | 新增 |
| **search** | **5177** | 新增 |

### Decision 5: dev-registry 集成

新子应用复用现有的 dev-registry 中间件（`@luhanxin/dev-kit/vite`），启动时自动注册到 `.dev-registry.json`：

```json
{
  "main": { "url": "http://localhost:5173", "status": "running" },
  "feed": { "url": "http://localhost:5174", "status": "running" },
  "user-profile": { "url": "http://localhost:5175", "status": "running" },
  "article": { "url": "http://localhost:5176", "status": "running" },
  "search": { "url": "http://localhost:5177", "status": "running" }
}
```

main app 的 dev-registry-middleware 会自动发现新子应用并注入路由。

### Decision 6: 管理后台（Admin Dashboard）独立部署

**管理后台 `apps/admin/` 不作为微前端子应用，而是独立前端工程。**

原因：

| 维度 | 独立 APP 方案 | 微前端子应用方案 |
|------|--------------|----------------|
| **安全性** | ✅ 内网隔离，与主站完全分离 | ❌ 暴露 `/admin` 路由，安全隐患大 |
| **技术栈** | ✅ Vue 3 + Naive UI（符合规范） | ⚠️ Garfish 跨框架加载 Vue 较复杂 |
| **权限隔离** | ✅ 独立登录入口，VPN 保护 | ⚠️ 需与主站共享认证，边界不清 |
| **部署** | ✅ 独立域名、独立 CDN、独立扩展 | ⚠️ 与主站耦合，无法独立扩缩容 |

**架构定位**：

```
┌─────────────────────────────────────────────────────────────┐
│                     用户访问层                                │
├─────────────────────────────────────────────────────────────┤
│  主站 (luhanxin.com)          管理后台 (admin.luhanxin.com)  │
│  ├─ apps/main (React)         ├─ apps/admin (Vue 3)        │
│  ├─ apps/feed (React)         └─ 内网/VPN 保护               │
│  ├─ apps/article (React)                                    │
│  ├─ apps/search (React)                                     │
│  └─ apps/user-profile (Vue)                                 │
└─────────────────────────────────────────────────────────────┘
```

**端口分配更新**：

| 子应用 | 端口 | 类型 | 部署域名 |
|--------|------|------|---------|
| main | 5173 | 微前端宿主 | luhanxin.com |
| feed | 5174 | 微前端子应用 | luhanxin.com |
| user-profile | 5175 | 微前端子应用 | luhanxin.com |
| article | 5176 | 微前端子应用 | luhanxin.com |
| search | 5177 | 微前端子应用 | luhanxin.com |
| **admin** | **5178** | **独立前端工程** | **admin.luhanxin.com** |

**详细设计见**: `openspec/changes/admin-dashboard/`

## Risks / Trade-offs

| 风险 | 影响 | 缓解措施 |
|------|------|---------|
| **迁移过程中路由断裂** | 拆分期间用户访问 `/article/:id` 可能 404 | 使用 redirect 兜底；灰度发布：先在 main 中保留旧代码，子应用就绪后再切换 |
| **共享组件耦合** | ArticleEditor/MarkdownRender 可能被其他页面引用 | 拆分前检查引用关系，如被多处引用则提升到 `packages/shared-ui/` |
| **子应用间通信** | main 需要跳转到 article/search 页面 | 使用 `window.history.pushState` 或 Garfish 路由能力 |
| **Bundle 拆分后加载速度** | 子应用首次加载需要额外请求 | 预加载策略 + Skeleton loading + 子应用独立 Code Splitting |
| **团队开发协调** | 多人同时修改子应用和 main 的路由 | 先完成拆分 PR，再并行开发各子应用功能 |

## Migration Plan

### 实施顺序

1. **Phase 1: 评估共享依赖** — 检查 post/search 模块中的组件被哪些外部页面引用
2. **Phase 2: 搭建 article 子应用骨架** — vite.config.ts、main.tsx、Garfish 入口
3. **Phase 3: 迁移 post 模块** — 页面 + 组件 + stores + hooks + styles
4. **Phase 4: 搭建 search 子应用骨架 + 迁移** — 同上
5. **Phase 5: main 路由切换** — 从本地路由切换为 app-registry 子应用路由
6. **Phase 6: 清理 main** — 删除已迁移的代码和依赖
7. **Phase 7: 验证** — 全链路测试，确保路由、功能、样式正常

### 回滚策略

保留 main 中的旧代码，通过配置开关控制路由来源（本地 vs app-registry），发现问题可秒级切回。

## Open Questions（已解决）

1. **`/post/*` 路径是否保留 redirect？**
   - ✅ 选择：**保留 redirect（301 永久重定向）**
   - 理由：SEO 友好，向后兼容，避免旧链接 404
   - 实现：Nginx 配置 `return 301 /article$request_uri;`

2. **`ArticleEditor` 组件是否现在就提升到 `packages/`？**
   - ✅ 选择：**等编辑器升级 change 再处理**
   - 理由：避免过早抽象，编辑器即将重构，提升后再移动

3. **`MarkdownRender` 是否需要提升到 `packages/shared-ui/`？**
   - ✅ 选择：**提升到 `packages/shared-ui/`**
   - 理由：复用性高，评论系统、通知系统、搜索结果都需要渲染 Markdown
   - 包名：`@luhanxin/shared-ui`（导出 `MarkdownRender` 组件）

4. **feed 子应用是否与 article 子应用合并？**
   - ✅ 选择：**保持独立**
   - 理由：职责分离（feed = 信息流推荐，article = 内容详情），微前端优势，独立部署扩展
