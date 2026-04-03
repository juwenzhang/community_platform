## ADDED Requirements

### Requirement: UserRepository trait 定义

每个微服务 SHALL 定义 Repository trait 封装数据库查询，handler 不再直接操作 `DatabaseConnection`。

svc-user SHALL 提供 `UserRepository` trait 及其 SeaORM 实现 `SeaOrmUserRepository`：

- `find_by_id(id: Uuid) -> Result<Option<users::Model>, RepositoryError>` — 按 ID 查询
- `find_by_username(username: &str) -> Result<Option<users::Model>, RepositoryError>` — 按用户名查询
- `find_by_email(email: &str) -> Result<Option<users::Model>, RepositoryError>` — 按邮箱查询
- `create(model: users::ActiveModel) -> Result<users::Model, RepositoryError>` — 创建用户
- `update(model: users::ActiveModel) -> Result<users::Model, RepositoryError>` — 更新用户
- `list_paginated(page_token, page_size, search) -> Result<(Vec<users::Model>, Option<String>, i64), RepositoryError>` — 分页查询
- `find_by_ids(ids: &[Uuid]) -> Result<Vec<users::Model>, RepositoryError>` — 批量按 ID 查询
- trait 使用 `#[async_trait]`，所有方法为 async
- `RepositoryError` 枚举封装 `sea_orm::DbErr` 和 `NotFound`
- `UserServiceImpl` 持有 `Arc<dyn UserRepository>` 而非 `Option<DatabaseConnection>`

#### Scenario: handler 通过 repository 查询用户

- **WHEN** `GetUser` handler 调用 `repo.find_by_id(uuid)`
- **THEN** 返回 `Ok(Some(user))` 或 `Ok(None)`，handler 不直接构造 SeaORM 查询

#### Scenario: handler 单元测试可 mock repository

- **WHEN** 测试 `GetUser` handler 时传入 mock `UserRepository` 实现
- **THEN** handler 测试无需连接真实数据库

#### Scenario: 批量查询用户

- **WHEN** 调用 `repo.find_by_ids(&[uuid1, uuid2, uuid3])`
- **THEN** 返回匹配的用户列表，单次 SQL 查询（`WHERE id IN (...)`）

### Requirement: ArticleRepository trait 定义

svc-content SHALL 提供 `ArticleRepository` trait 及其 SeaORM 实现：

- `find_by_id(id: Uuid) -> Result<Option<articles::Model>, RepositoryError>`
- `find_by_slug(slug: &str) -> Result<Option<articles::Model>, RepositoryError>`
- `create(model: articles::ActiveModel) -> Result<articles::Model, RepositoryError>`
- `update(model: articles::ActiveModel) -> Result<articles::Model, RepositoryError>`
- `delete(id: Uuid) -> Result<(), RepositoryError>`
- `list_paginated(page_token, page_size, author_id, status) -> Result<(Vec<articles::Model>, Option<String>, i64), RepositoryError>`
- `increment_view_count(id: Uuid) -> Result<(), RepositoryError>`

#### Scenario: 按 slug 查询文章

- **WHEN** 调用 `repo.find_by_slug("hello-world")`
- **THEN** 返回匹配的文章 Model 或 None

#### Scenario: 分页查询支持按作者和状态过滤

- **WHEN** 调用 `repo.list_paginated(None, 20, Some(author_uuid), Some(ArticleStatus::Published))`
- **THEN** 返回该作者的已发布文章，按创建时间倒序，最多 20 条

### Requirement: CommentRepository trait 定义

svc-content SHALL 提供 `CommentRepository` trait 及其 SeaORM 实现：

- `find_by_id(id: Uuid) -> Result<Option<comments::Model>, RepositoryError>`
- `create(model: comments::ActiveModel) -> Result<comments::Model, RepositoryError>`
- `delete(id: Uuid) -> Result<(), RepositoryError>`
- `list_by_article(article_id: Uuid, page_token, page_size) -> Result<(Vec<comments::Model>, Option<String>, i64), RepositoryError>`
- comment handler SHALL NOT 直接查询 `users` 表 — 用户信息由 Gateway BFF 层填充

#### Scenario: 评论列表不查 users 表

- **WHEN** 调用 `repo.list_by_article(article_id, None, 20)`
- **THEN** 返回评论列表，每条评论只有 `author_id` 字段，不含用户详细信息

### Requirement: SocialRepository trait 定义

svc-content SHALL 提供 `SocialRepository` trait（涵盖点赞、收藏等社交互动操作）：

- `find_like(user_id: Uuid, article_id: Uuid) -> Result<Option<likes::Model>, RepositoryError>`
- `create_like(model: likes::ActiveModel) -> Result<likes::Model, RepositoryError>`
- `delete_like(user_id: Uuid, article_id: Uuid) -> Result<(), RepositoryError>`
- `find_favorite(user_id: Uuid, article_id: Uuid) -> Result<Option<favorites::Model>, RepositoryError>`
- `create_favorite(model: favorites::ActiveModel) -> Result<favorites::Model, RepositoryError>`
- `delete_favorite(user_id: Uuid, article_id: Uuid) -> Result<(), RepositoryError>`
- `list_favorites(user_id: Uuid, page_token, page_size) -> Result<(Vec<favorites::Model>, Option<String>, i64), RepositoryError>`
- `get_interaction_status(user_id: Uuid, article_id: Uuid) -> Result<InteractionStatus, RepositoryError>`

#### Scenario: 获取用户收藏列表

- **WHEN** 调用 `repo.list_favorites(user_uuid, None, 20)`
- **THEN** 返回该用户的收藏列表（含 article_id），不含文章和作者详细信息

### Requirement: Repository 目录结构规范

每个微服务 SHALL 在 `src/repositories/` 目录下组织 Repository 代码：

```
svc-xxx/src/
├── repositories/
│   ├── mod.rs           # 公共 RepositoryError 定义 + re-export
│   └── <entity>/
│       └── mod.rs       # trait 定义 + SeaORM 实现
```

- `RepositoryError` 在 `repositories/mod.rs` 中统一定义，所有 repository 共用
- 每个 entity 的 repository 独立一个子目录

#### Scenario: svc-user 目录包含 repositories

- **WHEN** 查看 `svc-user/src/` 目录结构
- **THEN** 包含 `repositories/mod.rs` 和 `repositories/user/mod.rs`

#### Scenario: svc-content 目录包含多个 repository

- **WHEN** 查看 `svc-content/src/` 目录结构
- **THEN** 包含 `repositories/article/mod.rs`、`repositories/comment/mod.rs`、`repositories/social/mod.rs`
