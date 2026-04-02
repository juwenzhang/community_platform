## ADDED Requirements

### Requirement: Article Store 提供集中的文章列表管理

`useArticleStore` SHALL 提供 `fetchArticles` action，支持按 tag、authorId、query 筛选文章列表，并将结果存入 `articles` state。

#### Scenario: 首页加载文章列表
- **WHEN** 首页 ArticleList 组件挂载并调用 `fetchArticles()`
- **THEN** store 发起 `ArticleService.listArticles` RPC 请求，将返回的文章数组存入 `articles`，将 `totalCount` 存入 state

#### Scenario: 按标签筛选文章
- **WHEN** 用户选择标签筛选，调用 `fetchArticles({ tag: 'React' })`
- **THEN** store 发起带 `tag` 参数的 `listArticles` RPC，用新结果替换 `articles` state

#### Scenario: 管理页按作者加载文章
- **WHEN** 管理页调用 `fetchArticles({ authorId: currentUser.id })`
- **THEN** store 发起带 `authorId` 参数的 `listArticles` RPC，返回当前用户的所有文章（含草稿）

#### Scenario: 列表加载中显示 loading 状态
- **WHEN** `fetchArticles` 正在执行
- **THEN** `listLoading` 为 `true`，请求完成后变为 `false`

#### Scenario: 列表加载失败
- **WHEN** `fetchArticles` RPC 请求失败
- **THEN** `listError` 存储错误信息，`listLoading` 变为 `false`，`articles` 保持上次成功值

### Requirement: Article Store 提供单篇文章详情获取

`useArticleStore` SHALL 提供 `fetchArticle(id)` action，获取单篇文章并存入 `currentArticle` state。

#### Scenario: 查看文章详情
- **WHEN** 详情页调用 `fetchArticle(articleId)`
- **THEN** store 发起 `ArticleService.getArticle` RPC，将返回的文章存入 `currentArticle`

#### Scenario: 文章不存在
- **WHEN** `fetchArticle` 返回空结果
- **THEN** `detailError` 设为 '文章不存在'，`currentArticle` 为 `null`

#### Scenario: 详情加载中
- **WHEN** `fetchArticle` 正在执行
- **THEN** `detailLoading` 为 `true`，请求完成后变为 `false`

#### Scenario: 清除当前文章
- **WHEN** 调用 `clearCurrentArticle()`
- **THEN** `currentArticle` 设为 `null`，`detailError` 设为 `null`

### Requirement: Article Store 提供文章创建能力

`useArticleStore` SHALL 提供 `createArticle` action，调用 RPC 创建文章并返回新创建的 Article。

#### Scenario: 创建草稿文章
- **WHEN** 调用 `createArticle({ title, content, tags, status: DRAFT })`
- **THEN** store 发起 `ArticleService.createArticle` RPC，成功后返回创建的 Article 对象

#### Scenario: 创建并发布文章
- **WHEN** 调用 `createArticle({ title, content, tags, status: PUBLISHED })`
- **THEN** store 发起 RPC 创建文章，成功后返回 Article 对象

### Requirement: Article Store 提供文章更新能力

`useArticleStore` SHALL 提供 `updateArticle` action，调用 RPC 更新文章，成功后同步更新 store 中的相关 state。

#### Scenario: 更新文章内容
- **WHEN** 调用 `updateArticle(id, { title, content, tags, status })`
- **THEN** store 发起 `ArticleService.updateArticle` RPC，成功后更新 `articles` 列表中对应文章（如存在）和 `currentArticle`（如 id 匹配）

#### Scenario: 发布草稿
- **WHEN** 调用 `updateArticle(id, { status: PUBLISHED })`
- **THEN** store 发起 RPC 更新状态，成功后同步 `articles` 中该文章的 `status`

#### Scenario: 撤回为草稿
- **WHEN** 调用 `updateArticle(id, { status: DRAFT })`
- **THEN** store 发起 RPC 更新状态，成功后同步 `articles` 中该文章的 `status`

### Requirement: Article Store 提供文章删除能力

`useArticleStore` SHALL 提供 `deleteArticle` action，调用 RPC 删除文章，成功后从 `articles` 列表中移除。

#### Scenario: 删除文章
- **WHEN** 调用 `deleteArticle(articleId)`
- **THEN** store 发起 `ArticleService.deleteArticle` RPC，成功后从 `articles` 数组中移除该文章

### Requirement: articleClient 单例收口

所有 `ArticleService` RPC 调用 SHALL 通过 `useArticleStore` 内部的 `articleClient` 单例发起。组件中 SHALL NOT 直接创建 `createClient(ArticleService, transport)`。

#### Scenario: 组件不直接调用 RPC
- **WHEN** ArticleList、DetailPage、EditPage、ManagePage 需要文章数据
- **THEN** 这些组件通过 `useArticleStore` 的 action 获取数据，不自行创建 articleClient

### Requirement: 消费 Store 的组件瘦身

ArticleList、DetailPage、EditPage、ManagePage SHALL 从 `useArticleStore` 获取数据和调用操作，移除内联的 `useState<Article>` / `useState<Article[]>` 和直接 RPC 调用。

#### Scenario: ArticleList 消费 store
- **WHEN** ArticleList 组件渲染
- **THEN** 从 `useArticleStore` 读取 `articles`、`listLoading`、`totalCount`，调用 `fetchArticles` 获取数据

#### Scenario: DetailPage 消费 store
- **WHEN** 文章详情页渲染
- **THEN** 从 `useArticleStore` 读取 `currentArticle`、`detailLoading`、`detailError`，调用 `fetchArticle(id)` 获取数据

#### Scenario: EditPage 消费 store
- **WHEN** 文章编辑页渲染
- **THEN** 从 `useArticleStore` 读取 `currentArticle`，调用 `fetchArticle(id)` 获取待编辑文章，调用 `updateArticle` 保存

#### Scenario: ManagePage 消费 store
- **WHEN** 文章管理页渲染
- **THEN** 从 `useArticleStore` 读取 `articles`、`listLoading`，调用 `fetchArticles({ authorId })` 获取我的文章，通过 store action 执行 CRUD 操作
