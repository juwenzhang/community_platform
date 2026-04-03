## ADDED Requirements

### Requirement: Article Sort Parameter
ListArticlesRequest 支持排序参数。

#### Scenario: Proto 定义
- **WHEN** article.proto 更新
- **THEN** ListArticlesRequest 新增 `ArticleSort sort` 字段
- **THEN** ArticleSort 枚举：UNSPECIFIED(0), RECOMMENDED(1), LATEST(2)

#### Scenario: 推荐排序
- **WHEN** sort = RECOMMENDED
- **THEN** 按 `view_count + like_count * 3` 降序排列

#### Scenario: 最新排序
- **WHEN** sort = LATEST
- **THEN** 按 `published_at` 降序排列

#### Scenario: 默认排序
- **WHEN** sort = UNSPECIFIED
- **THEN** 等同 RECOMMENDED

### Requirement: Frontend Sort Tab
首页推荐/最新 Tab 实际生效。

#### Scenario: 切换排序
- **WHEN** 用户点击「推荐」或「最新」Tab
- **THEN** 重新请求文章列表，传入对应 sort 参数
- **THEN** 文章列表按选择的排序方式展示

### Requirement: Infinite Scroll Pagination
首页文章列表支持滚动加载。

#### Scenario: 初始加载
- **WHEN** 首页加载
- **THEN** 加载第一页文章（pageSize=20）

#### Scenario: 滚动加载
- **WHEN** 用户滚动到列表底部哨兵元素
- **THEN** 自动加载下一页文章（使用 nextPageToken）
- **THEN** 新文章追加到列表末尾（不替换）

#### Scenario: 加载完毕
- **WHEN** 没有更多文章（nextPageToken 为空）
- **THEN** 显示「没有更多了」提示
- **THEN** 不再触发加载

### Requirement: Store Enhancement
useArticleStore 支持追加加载和排序。

#### Scenario: Store 新增状态
- **WHEN** useArticleStore 初始化
- **THEN** 包含 `nextPageToken: string`, `hasMore: boolean` 状态

#### Scenario: 追加加载
- **WHEN** 调用 `loadMoreArticles()`
- **THEN** 使用当前的 nextPageToken 请求下一页
- **THEN** 新文章追加到 articles 数组末尾
- **THEN** 更新 nextPageToken 和 hasMore

#### Scenario: 排序切换
- **WHEN** 排序参数变更
- **THEN** 清空现有文章列表
- **THEN** 重新加载第一页
