## 1. Gateway DTO 模块创建

- [x] 1.1 创建 `gateway/src/dto/mod.rs` — 统一导出所有 DTO
- [x] 1.2 创建 `gateway/src/dto/common.rs` — `ApiError { code: String, message: String }`、`PaginationQuery`、`timestamp_to_string()`、`ApiError::from_status()` 方法
- [x] 1.3 创建 `gateway/src/dto/user.rs` — 从 `routes/user/mod.rs` 迁移 `UserDto`、`SocialLinkDto`、`GetUserDto`、`AuthDto`、`RegisterDto`、`LoginDto`、`UpdateProfileDto`、`ListUsersDto`、`ListUsersQuery`、`user_to_dto()`
- [x] 1.4 创建 `gateway/src/dto/article.rs` — 从 `routes/article/mod.rs` 迁移 `ArticleDto`、`GetArticleDto`、`ListArticlesDto`、`ListArticlesQuery`、`CreateArticleDto`、`UpdateArticleDto`、`proto_to_article_dto()`；`ArticleDto.author` 改为引用 `super::user::UserDto`
- [x] 1.5 创建 `gateway/src/dto/comment.rs` — 从 `routes/comment/mod.rs` 迁移 `CommentDto`、`CommentAuthorDto`、`ListCommentsDto`、`CreateCommentBody`、`ListCommentsQuery`、`proto_comment_to_dto()`
- [x] 1.6 创建 `gateway/src/dto/social.rs` — 从 `routes/social/mod.rs` 迁移 `InteractionDto`、`LikeResponseDto`、`FavoriteResponseDto`
- [x] 1.7 在 `gateway/src/main.rs` 中注册 `mod dto`

> **依赖**：无。

## 2. Route 模块迁移

- [x] 2.1 重构 `routes/user/mod.rs` — 删除所有内联 DTO（UserDto、ApiError 等），改为 `use crate::dto::*`；删除 `headers_to_metadata()`、`status_to_response()`、`timestamp_to_string()`、`user_to_dto()`，改为引用 dto 和 helpers
- [x] 2.2 重构 `routes/article/mod.rs` — 删除内联 DTO 和 `proto_to_article_dto()`、`extract_bearer()`、`build_metadata()`，改为 `use crate::dto::*` 和 `use super::helpers::*`
- [x] 2.3 重构 `routes/comment/mod.rs` — 同上
- [x] 2.4 重构 `routes/social/mod.rs` — 同上
- [x] 2.5 更新 `main.rs` 中 Swagger `#[openapi(components(schemas(...)))]` — 所有 schema 引用从 `user_routes::UserDto` 改为 `dto::user::UserDto` 等

> **依赖**：依赖 Phase 1。

## 3. BFF 聚合增强

- [x] 3.1 增强 `gateway/src/services/comment/mod.rs` — `ListComments` 方法拿到评论列表后，提取所有 author_id，调用 svc-user 批量查用户信息，填充到评论的 `author` 字段（复用 article service 的 `fill_authors()` 模式）
- [x] 3.2 增强 `gateway/src/services/social/mod.rs` — `ListFavorites` 方法拿到收藏文章列表后，提取 author_id，调用 svc-user 批量查用户信息，填充到 Article.author 字段
- [x] 3.3 REST 路由 `routes/comment/mod.rs` 的 `list_comments` — 确保 REST 响应也包含聚合后的用户信息

> **依赖**：依赖 Phase 2（DTO 统一后 REST 路由才能正确序列化聚合结果）。

## 4. 验证

- [x] 4.1 编译验证 — `cargo build -p gateway` 无错误
- [x] 4.2 Swagger UI 验证 — schema 引用已更新，格式统一
