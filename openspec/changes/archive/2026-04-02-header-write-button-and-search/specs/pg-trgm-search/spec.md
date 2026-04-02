## ADDED Requirements

### Requirement: 启用 pg_trgm 扩展并创建 trigram 索引

数据库 SHALL 启用 `pg_trgm` 扩展。articles 表的 `title` 和 `content` 列 SHALL 创建 GIN trigram 索引以加速模糊搜索。

#### Scenario: migration 启用 pg_trgm
- **WHEN** 运行数据库迁移
- **THEN** 执行 `CREATE EXTENSION IF NOT EXISTS pg_trgm`，创建 `idx_articles_title_trgm` 和 `idx_articles_content_trgm` GIN 索引

### Requirement: 搜索支持 title + content 模糊匹配

`list_articles` handler SHALL 在 `query` 非空时同时搜索 `title` 和 `content` 字段，使用 `ILIKE` 进行大小写不敏感匹配。

#### Scenario: 搜索匹配标题
- **WHEN** 调用 `listArticles({ query: "vue" })`
- **THEN** 返回标题包含 "vue"（不区分大小写）的文章

#### Scenario: 搜索匹配正文
- **WHEN** 调用 `listArticles({ query: "PostgreSQL" })`，某文章标题不含该词但正文包含
- **THEN** 该文章出现在搜索结果中

### Requirement: 搜索支持相似度匹配

`list_articles` handler SHALL 使用 `pg_trgm` 的 `similarity()` 函数进行相似度匹配，similarity 阈值为 0.1。

#### Scenario: 相似度模糊搜索
- **WHEN** 数据库有文章标题 "vue的使用"，用户搜索 "vue 的利用"
- **THEN** 该文章出现在搜索结果中（三元组相似度 > 0.1）

#### Scenario: 搜索结果按相似度排序
- **WHEN** `query` 非空
- **THEN** 搜索结果按 `similarity(title, query)` 降序排列（最相关的排在前面）

#### Scenario: 无 query 时保持时间排序
- **WHEN** `query` 为空
- **THEN** 排序不变（按 published_at 或 created_at 降序）
