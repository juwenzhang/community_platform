## ADDED Capability: article-service

svc-content 微服务，提供文章 CRUD 的 gRPC 接口。

### Requirement: ArticleService gRPC 实现

svc-content SHALL 实现 `ArticleService` 的 5 个 RPC 方法：

- `GetArticle`: 按 ID 查询，返回文章详情，**异步自增 view_count**
- `ListArticles`: 分页列表，支持 author_id / tag / query 筛选，游标分页，返回 total_count
- `CreateArticle`: 创建文章，从 `x-user-id` metadata 获取 author_id，自动生成 slug，summary 为空时自动截取 content 前 200 字
- `UpdateArticle`: 更新文章，校验 `x-user-id == author_id`
- `DeleteArticle`: 软删除（status → ARCHIVED），校验 `x-user-id == author_id`

#### Scenario: 创建文章

- **WHEN** 认证用户调用 CreateArticle（title, content, tags, status=DRAFT）
- **THEN** 插入 articles 表，slug 自动生成，author_id 从 x-user-id 获取，返回完整 Article

#### Scenario: 非作者尝试编辑

- **WHEN** 用户 A 尝试 UpdateArticle 用户 B 的文章
- **THEN** 返回 PERMISSION_DENIED

#### Scenario: 删除文章（软删除）

- **WHEN** 作者调用 DeleteArticle
- **THEN** 文章 status 改为 ARCHIVED（不从数据库删除），返回成功

#### Scenario: 列表查询 — 首页

- **WHEN** 调用 ListArticles（无 author_id 筛选）
- **THEN** 只返回 status=PUBLISHED 的文章，按 published_at DESC 排序

#### Scenario: 列表查询 — 查看自己的文章

- **WHEN** 调用 ListArticles（author_id=当前用户，x-user-id=当前用户）
- **THEN** 返回该用户的所有文章（含 DRAFT），按 created_at DESC 排序

#### Scenario: 列表查询 — 查看他人的文章

- **WHEN** 调用 ListArticles（author_id=其他用户）
- **THEN** 只返回该用户的 PUBLISHED 文章（不含草稿）
