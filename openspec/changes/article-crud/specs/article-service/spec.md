## ADDED Capability: article-service

svc-content 微服务，提供文章 CRUD 的 gRPC 接口。

### Requirement: ArticleService gRPC 实现

svc-content SHALL 实现 `ArticleService` 的 5 个 RPC 方法：

- `GetArticle`: 按 ID 查询，返回文章详情（含作者信息查询预留）
- `ListArticles`: 分页列表，支持 author_id / tag 筛选，游标分页，返回 total_count
- `CreateArticle`: 创建文章，从 `x-user-id` metadata 获取 author_id，自动生成 slug
- `UpdateArticle`: 更新文章，校验 `x-user-id == author_id`
- `DeleteArticle`: 删除文章，校验 `x-user-id == author_id`

#### Scenario: 创建文章

- **WHEN** 认证用户调用 CreateArticle（title, content, tags, status=DRAFT）
- **THEN** 插入 articles 表，slug 自动生成，author_id 从 x-user-id 获取，返回完整 Article

#### Scenario: 非作者尝试编辑

- **WHEN** 用户 A 尝试 UpdateArticle 用户 B 的文章
- **THEN** 返回 PERMISSION_DENIED

#### Scenario: 列表查询 — 首页

- **WHEN** 调用 ListArticles（无 author_id 筛选）
- **THEN** 只返回 status=PUBLISHED 的文章，按 published_at DESC 排序

#### Scenario: 列表查询 — 用户主页

- **WHEN** 调用 ListArticles（author_id=当前用户）
- **THEN** 返回该用户的所有文章（含草稿），按 created_at DESC 排序
