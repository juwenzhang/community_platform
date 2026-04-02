## Context

当前 main 应用中，仅 `useAuthStore` 实现了完整的 Zustand 状态管理（login/register/logout/restore/updateUser）。文章相关的数据操作完全散落在 5 个组件中：

| 组件 | 问题 |
|------|------|
| `stores/useArticleStore.ts` | 空壳，仅有 import，无 state/action/export |
| `components/ArticleList/index.tsx` | 自行创建 `articleClient`，内联 `useState<Article[]>` + fetch |
| `pages/post/pages/detail/index.tsx` | 自行创建 `articleClient`，独立 `useState<Article>` |
| `pages/post/pages/edit/index.tsx` | 自行创建 `articleClient`，独立获取文章 + 更新 |
| `pages/profile/pages/manage/index.tsx` | 自行创建 `articleClient`，内联完整 CRUD（最重，~377 行） |

共有 5 处 `createClient(ArticleService, transport)` 重复调用。每个组件独立管理 loading/error 状态，无法跨组件共享数据或联动刷新。

## Goals / Non-Goals

**Goals:**
1. 将 `useArticleStore` 从空壳实现为完整的 Zustand store，集中管理文章 CRUD + 列表/详情数据
2. 消除所有组件中重复的 `createClient(ArticleService, transport)` 调用，统一收口到 store
3. 各页面/组件从"内联 RPC + useState"改为消费 store，大幅瘦身
4. 操作后跨组件自动联动（如管理页删除文章，首页列表同步更新）

**Non-Goals:**
- UserList 的 store 化（数据量小，保持独立 fetch）
- EditProfileForm 的 store 化（已有 useAuthStore.updateUser）
- SSR / 服务端状态管理
- 无限滚动 / 虚拟列表
- 文章缓存策略（localStorage / IndexedDB）
- ArticleEditor 本地编辑态的 store 化（保持本地 state 合理）

## Decisions

### Decision 1: Store 结构设计 — 分离列表与详情

**方案**: `useArticleStore` 内部同时管理 `articles`（列表）和 `currentArticle`（单篇详情），通过不同 action 分别操作。

```typescript
interface ArticleState {
  // 列表
  articles: Article[];
  totalCount: number;
  listLoading: boolean;
  listError: string | null;

  // 详情
  currentArticle: Article | null;
  detailLoading: boolean;
  detailError: string | null;

  // Actions
  fetchArticles: (params?: FetchArticlesParams) => Promise<void>;
  fetchArticle: (id: string) => Promise<void>;
  createArticle: (data: CreateArticleData) => Promise<Article>;
  updateArticle: (id: string, data: UpdateArticleData) => Promise<void>;
  deleteArticle: (id: string) => Promise<void>;
  clearCurrentArticle: () => void;
}
```

**理由**: 列表页和详情页的数据生命周期不同。列表页需要持久化（切换 tab 不重新 fetch），详情页随导航变化。单 store 两组 state 是 Zustand 推荐的简单做法，无需引入复杂的 selector 或拆分 store。

**替代方案**:
- 方案 B: 拆成 `useArticleListStore` + `useArticleDetailStore` — 过度拆分，增加维护成本，两个 store 之间还需手动同步
- 方案 C: 用 React Query / SWR — 引入额外依赖，与项目 Connect RPC 集成不直观，且项目已确定用 Zustand

### Decision 2: articleClient 单例收口

**方案**: `articleClient` 唯一定义在 `useArticleStore.ts` 模块顶层，所有 RPC 调用通过 store action 发起。

```typescript
// stores/useArticleStore.ts
const articleClient = createClient(ArticleService, transport);
```

**理由**: 消除 5 处重复 `createClient`，统一请求入口便于后续添加错误处理、请求去重、缓存等中间逻辑。

### Decision 3: 组件瘦身策略 — 渐进式替换

**方案**: 逐个组件替换，保持每个组件的 UI 和交互不变，仅替换数据来源。

替换顺序：
1. `useArticleStore.ts` — 实现完整 store
2. `ArticleList/index.tsx` — 消费 `store.fetchArticles` + `store.articles`
3. `post/detail/index.tsx` — 消费 `store.fetchArticle` + `store.currentArticle`
4. `post/edit/index.tsx` — 消费 `store.fetchArticle` + `store.updateArticle`
5. `profile/manage/index.tsx` — 消费 store 全部 CRUD action

**理由**: 每步可独立验证，降低大规模重构风险。UI 不变意味着 E2E 测试无需修改。

### Decision 4: 列表查询参数设计

**方案**: store 内部维护查询参数，支持按 tag、authorId、query 筛选：

```typescript
interface FetchArticlesParams {
  tag?: string;
  authorId?: string;
  query?: string;
  pageSize?: number;
  pageToken?: string;
}
```

**理由**: 首页 ArticleList 需要按 tag 筛选，管理页需要按 authorId 筛选。统一参数接口避免各组件自定义 fetch 逻辑。

## Risks / Trade-offs

| 风险 | 缓解措施 |
|------|---------|
| 列表/详情共用一个 store 导致状态干扰 | 列表和详情使用完全独立的 state 字段，action 之间不交叉影响 |
| 管理页操作后首页列表数据过期 | CRUD 操作后调用 `fetchArticles()` 刷新列表，或直接 optimistic update |
| 重构过程中引入回归 bug | 逐组件替换 + 保持 UI 不变 + 现有 E2E 测试覆盖 |
| store 过大 | 当前仅 5 个 action + 2 组 state，复杂度可控；后续如需拆分可用 Zustand slice pattern |
