## 1. 实现 useArticleStore

- [x] 1.1 实现 `useArticleStore` 完整的 Zustand store：定义 `ArticleState` 接口（articles、totalCount、listLoading、listError、currentArticle、detailLoading、detailError），收口 `articleClient` 单例，实现 `fetchArticles`、`fetchArticle`、`createArticle`、`updateArticle`、`deleteArticle`、`clearCurrentArticle` 六个 action

## 2. ArticleList 组件消费 Store

- [x] 2.1 重构 `components/ArticleList/index.tsx`：移除内联 `createClient` + `useState<Article[]>` + fetch 逻辑，改为从 `useArticleStore` 读取 `articles`/`listLoading`/`totalCount`，调用 `fetchArticles` 获取数据。保持 `onLoad` 回调和 `tag` 筛选功能不变

## 3. 文章详情页消费 Store

- [x] 3.1 重构 `pages/post/pages/detail/index.tsx`：移除内联 `createClient` + `useState<Article>` + `fetchedRef` 逻辑，改为从 `useArticleStore` 读取 `currentArticle`/`detailLoading`/`detailError`，调用 `fetchArticle(id)` 获取数据。离开页面时调用 `clearCurrentArticle()`

## 4. 文章编辑页消费 Store

- [x] 4.1 重构 `pages/post/pages/edit/index.tsx`：移除内联 `createClient` + 独立 fetch/update 逻辑，改为从 `useArticleStore` 读取 `currentArticle`，调用 `fetchArticle(id)` 获取待编辑文章，通过 `updateArticle` action 保存。保持 ArticleEditor 组件的 props 接口不变

## 5. 文章管理页消费 Store

- [x] 5.1 重构 `pages/profile/pages/manage/index.tsx`：移除内联 `createClient` + `useState<Article[]>` + 全部 CRUD 内联函数（~130 行），改为从 `useArticleStore` 读取 `articles`/`listLoading`，通过 store action 执行 `fetchArticles({ authorId })`、`createArticle`、`updateArticle`、`deleteArticle`。保持编辑器 Portal 和 UI 交互不变

## 6. 清理与验证

- [x] 6.1 确认所有组件中不再有 `createClient(ArticleService, transport)` 调用（仅 store 内部保留），运行 `pnpm typecheck` 确保类型正确，运行 `pnpm lint` 确保代码规范
