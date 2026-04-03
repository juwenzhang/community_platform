## ADDED Requirements

### Requirement: Gateway DTO 统一模块

Gateway SHALL 在 `src/dto/` 目录下统一定义所有 REST DTO，各 route 文件不再内联定义 DTO。

- `dto/common.rs` — `ApiError`（统一格式 `{ code, message }`）、`PaginationQuery`
- `dto/user.rs` — `UserDto`、`LoginDto`、`RegisterDto`、`AuthResponseDto` 等
- `dto/article.rs` — `ArticleDto`、`GetArticleDto`、`ListArticlesDto`、`CreateArticleDto` 等
- `dto/comment.rs` — `CommentDto`、`CreateCommentDto`、`ListCommentsDto` 等
- `dto/social.rs` — `FavoriteDto`、`InteractionDto`、`LikeDto` 等
- 所有 DTO 派生 `Serialize`、`Deserialize`、`ToSchema`（utoipa Swagger 支持）
- `ArticleDto` 中引用 `UserDto` 时使用 `dto::user::UserDto`，不再跨模块 `super::super::routes::user::UserDto`

#### Scenario: ApiError 格式统一

- **WHEN** 任何 REST 接口返回错误（不论是 article、user、comment 还是 social）
- **THEN** 响应体格式均为 `{ "code": "NOT_FOUND", "message": "Article not found" }`

#### Scenario: 旧的 user routes ApiError 格式兼容

- **WHEN** user routes 之前返回 `{ "code": 404, "message": "..." }` 格式
- **THEN** 新格式改为 `{ "code": "NOT_FOUND", "message": "..." }`（**BREAKING**：code 从 int 变为 string）

#### Scenario: routes 文件不再包含 DTO 定义

- **WHEN** 查看 `gateway/src/routes/article/mod.rs`
- **THEN** 文件中不再有 `struct ArticleDto`、`struct ApiError` 等定义，改为 `use crate::dto::*`

### Requirement: REST 路由工具函数提取

Gateway SHALL 在 `src/routes/helpers.rs` 中统一提供 REST 路由的通用工具函数：

- `extract_bearer(headers) -> Option<String>` — 从 Authorization header 提取 Bearer token
- `build_metadata(headers) -> MetadataMap` — 将 HTTP headers 转换为 gRPC MetadataMap
- `status_to_response(status) -> (StatusCode, Json<ApiError>)` — tonic Status 到 HTTP 错误的映射
- 各 route 文件内的同名函数 SHALL 被移除，改为 `use super::helpers::*`

#### Scenario: extract_bearer 正确提取 token

- **WHEN** HTTP 请求包含 `Authorization: Bearer abc123`
- **THEN** `extract_bearer(headers)` 返回 `Some("abc123".to_string())`

#### Scenario: status_to_response 映射一致

- **WHEN** 传入 `tonic::Status::not_found("Article not found")`
- **THEN** 返回 `(StatusCode::NOT_FOUND, Json(ApiError { code: "NOT_FOUND", message: "Article not found" }))`

#### Scenario: 所有 route 文件使用共享 helpers

- **WHEN** 查看 `routes/article/mod.rs`、`routes/comment/mod.rs`、`routes/social/mod.rs`
- **THEN** 均使用 `use super::helpers::*`，不再各自定义 `extract_bearer` 等函数
