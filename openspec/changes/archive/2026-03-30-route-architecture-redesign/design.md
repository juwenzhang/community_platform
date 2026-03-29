## Context

当前 React main 应用有 4 条本地一级路由 + 2 条微前端路由：

```
本地: /（首页）, /auth, /article/*, /profile/*
微前端: /feed（Vue feed 子应用）, /user/*（Vue user-profile 子应用）
```

首页和 `/article` 功能重复（都是文章列表），`/profile` 和 `/user/:username` 功能重叠，创作中心 `/article/create` 挂在公开的文章路由下但需要认证。

### 当前文件依赖关系

```
pages/home/index.tsx ──引用──→ pages/article/components/ArticleList  ⚠️ 跨模块
pages/profile/index.tsx ──引用──→ pages/article/components/ArticleList  ⚠️ 跨模块
pages/article/index.tsx ──独立 <Routes>──→ 内部 4 条子路由
```

## Goals / Non-Goals

**Goals:**
- 消除首页与文章页的功能重复
- 文章详情/编辑提升为一级路由 `/post/:id`
- 创作中心归属个人中心 `/profile/create`
- 跨模块引用的组件提升到 `src/components/`
- 清理不再需要的文件
- 更新所有相关 import 路径

**Non-Goals:**
- Vue 子应用 Tab 内容实现（只预留路由结构）
- 首页排序/搜索功能
- 后端路由变更

## Decisions

### 决策 1：文件操作计划（精确到每个文件）

**Phase A — 组件提升（移动到 `src/components/`）**

| 源路径 | 目标路径 | 原因 |
|--------|---------|------|
| `pages/article/components/ArticleCard/` | `components/ArticleCard/` | 首页、Vue 子应用、详情页都用 |
| `pages/article/components/ArticleList/` | `components/ArticleList/` | 首页、profile 都引用 |
| `pages/article/components/ArticleEditor/` | `components/ArticleEditor/` | create 和 edit 页都用 |
| `pages/article/components/ArticleToc/` | `components/ArticleToc/` | 详情页引用 |

**Phase B — 页面重组**

| 操作 | 文件 | 说明 |
|------|------|------|
| 移动 | `pages/article/pages/detail/` → `pages/post/` | 文章详情变成一级路由 `/post/:id` |
| 移动 | `pages/article/pages/edit/` → `pages/post/pages/edit/` | 文章编辑变成 `/post/:id/edit` |
| 移动 | `pages/article/pages/create/` → `pages/profile/pages/create/` | 创作中心归属 profile |
| 重构 | `pages/post/index.tsx` | 新的 post 模块入口（子路由：详情 + 编辑） |
| 重构 | `pages/profile/index.tsx` | 增加子路由（设置 + 创作中心） |

**Phase C — 删除旧文件**

| 删除文件 | 原因 |
|---------|------|
| `pages/article/index.tsx` | 文章模块入口不再需要 |
| `pages/article/article.module.less` | 对应样式 |
| `pages/article/components/ArticleSidebar/index.tsx` | 侧边栏功能被首页替代 |
| `pages/article/components/ArticleSidebar/articleSidebar.module.less` | 对应样式 |

删除后 `pages/article/` 目录应该为空，整个目录删除。

### 决策 2：新路由配置表

```typescript
const localRoutes: RouteConfig[] = [
  {
    path: '/',
    index: true,
    component: lazy(() => import('@/pages/home')),
    meta: { title: '首页', icon: 'HomeOutlined' },
  },
  {
    path: '/auth',
    component: lazy(() => import('@/pages/auth')),
    meta: { title: '登录', hidden: true },
  },
  {
    path: '/post/*',
    component: lazy(() => import('@/pages/post')),
    meta: { title: '文章', hidden: true },  // 不显示在导航栏
  },
  {
    path: '/profile/*',
    component: lazy(() => import('@/pages/profile')),
    meta: { title: '我的', icon: 'UserOutlined', auth: true },
  },
];
```

**关键变化**：
- 删除 `/article/*` 路由
- 新增 `/post/*` 路由（hidden，不在导航栏显示）
- 导航栏只剩：首页 | 我的（+ 微前端注入的路由）

### 决策 3：post 模块内部子路由

```typescript
// pages/post/index.tsx
<Routes>
  <Route path=":id" element={<DetailPage />} />
  <Route path=":id/edit" element={<EditPage />} />
</Routes>
```

无 index 路由（不允许直接访问 `/post/`，会被顶层 `*` 兜底重定向到 `/`）。

### 决策 4：profile 模块子路由扩展

```typescript
// pages/profile/index.tsx
<Routes>
  <Route index element={<ProfileSettings />} />      // /profile — 个人设置
  <Route path="manage" element={<ManagePage />} />    // /profile/manage — 文章管理
</Routes>
```

### 决策 5：Import 路径更新策略

**使用 VS Code 全局替换**，按以下规则批量更新：

| 旧 import | 新 import |
|-----------|-----------|
| `../article/components/ArticleList` | `@/components/ArticleList` |
| `../article/components/ArticleCard` | `@/components/ArticleCard` |
| `../../components/ArticleEditor` | `@/components/ArticleEditor` |
| `../../components/ArticleToc` | `@/components/ArticleToc` |
| `/article/${id}` (链接) | `/post/${id}` (链接) |
| `/article/create` (链接) | `/profile/manage` (链接) |

### 决策 6：Header 菜单路由更新

```
"创作中心" → /profile/manage（原 /article/create）
```

其他菜单项不变。

## Risks / Trade-offs

| 风险 | 缓解措施 |
|------|---------|
| 大量文件移动可能遗漏 import 更新 | 移动一批→编译检查→修复→继续，分批操作 |
| `/article/:id` 旧链接失效 | 当前无外部链接，且可以后期加 `/article/:id` → `/post/:id` 重定向 |
| Vue 子应用中 `/article/:id` 硬编码链接 | 本次一并更新 |
| `pages/article/` 目录删除后 git diff 较大 | 可接受，commit message 说明清楚 |
| feed 子应用与首页 Feed 功能重叠 | 暂保留不动，后期改名或合并 |

### 决策 7：首页三栏布局 + NavSidebar

参考掘金首页：左侧分类导航 + 中间文章 Feed + 右侧信息栏。

```
┌──────────────────────────────────────────────────┐
│  Header（Logo + 导航 + UserArea）                  │
├─────────┬──────────────────────┬─────────────────┤
│ NavSidebar │    文章 Feed        │   右侧栏       │
│           │  ┌──────────────┐   │  HeroBanner    │
│ ● 综合    │  │ ArticleCard  │   │  社区数据      │
│ ○ 后端    │  │ ArticleCard  │   │  活跃用户      │
│ ○ 前端    │  │ ArticleCard  │   │  技术栈标签    │
│ ○ AI      │  │ ...          │   │                │
│ ○ 移动端  │  └──────────────┘   │                │
│ ○ 工具    │                     │                │
│ ○ 阅读    │                     │                │
└─────────┴──────────────────────┴─────────────────┘
```

**NavSidebar 组件** (`pages/home/components/NavSidebar/`)：
- 导航项对应文章标签分类
- 点击分类 → ArticleList 按 `tag` 参数筛选文章
- "综合"= 不传 tag（显示全部）
- 选中态高亮
- 固定宽度 160px，sticky 定位

**响应式降级策略**：
```
> 1200px: 三栏（NavSidebar + Feed + 右侧栏）
800~1200px: 两栏（Feed + 右侧栏），NavSidebar 隐藏
< 800px: 单栏（Feed only）
```

### 决策 8：ArticleList 修复 — 响应 props 变更重新 fetch

**问题**: 当前 `ArticleList` 使用 `fetchedRef = useRef(false)` 阻止重复 fetch（StrictMode 优化），但副作用是 **props 变更时不会重新拉取数据**。NavSidebar 传 tag → ArticleList 不响应 → 筛选失效。

**修复方案**: 将 `fetchedRef` 逻辑改为依赖 `tag`/`authorId`/`query` 变更时重新 fetch：
```typescript
// 移除 fetchedRef，改用 useEffect 依赖数组自然触发
useEffect(() => {
  fetchArticles();
}, [tag, authorId, query]);
```

### 决策 9：路径命名修正

| 原路径 | 问题 | 新路径 |
|--------|------|--------|
| `/article/create` | 实际是文章管理台，不只是创建 | `/profile/manage` |
| edit 取消 → `/article/create` | 取消编辑应回到文章详情 | `/post/:id` |
| edit 失败 → `/article/create` | 加载失败应回首页 | `/` |

### 决策 10：Vue 子应用 username 获取方式改进

**问题**: 当前通过 `window.location.pathname.split('/')` 手动解析 URL，脆弱且难维护。

**改进**: 通过 Garfish props 传递路由参数：
```typescript
// GarfishContainer.tsx — 补充传递当前路径
props: {
  getCurrentUser: () => useAuthStore.getState().user,
  getRouteParams: () => {
    const match = window.location.pathname.match(/^\/user\/([^/]+)/);
    return { username: match?.[1] || '' };
  },
}
```

Vue 子应用接收：
```typescript
const garfishProps = ...;
const username = ref(garfishProps.getRouteParams?.().username || '');
```

## Open Questions

- 无
