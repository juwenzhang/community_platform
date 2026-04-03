## Context

当前 Gateway 的 4 个 REST route 模块（`user`、`article`、`comment`、`social`）各自内联定义了 DTO struct 和 ApiError，存在：
- 4 种不同的 ApiError 格式
- `ArticleDto` 通过 `super::super::routes::user::UserDto` 交叉引用 user DTO
- 每个模块重复定义 `extract_bearer()`、`build_metadata()`、`get_client()` 等工具函数
- ListComments/ListFavorites 作为纯透传，不做 BFF 聚合

## Goals / Non-Goals

**Goals:**
1. DTO 集中管理 — 统一到 `gateway/src/dto/` 目录
2. ApiError 格式统一 — `{ code: String, message: String }`
3. BFF 聚合增强 — ListComments 填充评论者信息，ListFavorites 填充作者信息

**Non-Goals:**
- 前端代码变更
- Proto schema 调整
- BatchGetUsers 优化（逐个 GetUser → 批量查询）

## Decisions

### Decision 1: DTO 目录结构

```
gateway/src/
├── dto/
│   ├── mod.rs           # 统一导出
│   ├── common.rs        # ApiError, PaginationQuery, timestamp_to_string()
│   ├── user.rs          # UserDto, SocialLinkDto, AuthDto, RegisterDto, LoginDto, etc.
│   ├── article.rs       # ArticleDto — 引用 dto::user::UserDto（不再交叉引用 routes）
│   ├── comment.rs       # CommentDto, CommentAuthorDto
│   └── social.rs        # InteractionDto, LikeResponseDto, FavoriteResponseDto
├── routes/
│   ├── helpers.rs       # 已有，不变
│   ├── user/mod.rs      # 改为 use crate::dto::*
│   ├── article/mod.rs   # 改为 use crate::dto::*
│   ├── comment/mod.rs   # 改为 use crate::dto::*
│   └── social/mod.rs    # 改为 use crate::dto::*
```

### Decision 2: 统一 ApiError 格式

```rust
// gateway/src/dto/common.rs
#[derive(Serialize, Deserialize, ToSchema)]
pub struct ApiError {
    /// 错误码（如 "NOT_FOUND"、"UNAUTHENTICATED"）
    pub code: String,
    /// 人类可读的错误描述
    pub message: String,
}
```

所有 route handler 的错误响应统一使用此格式。`status_to_response()` 移到 `dto/common.rs` 作为 `ApiError::from_status()` 方法。

### Decision 3: BFF 聚合模式

复用 `gateway/services/article/mod.rs` 已有的 `fill_authors()` 模式：
1. 收集所有 author_id → HashSet 去重
2. 逐个调用 svc-user GetUser（后续可优化为 BatchGetUsers）
3. 填充到响应中

ListComments 聚合：Gateway comment service 拿到评论列表后，提取 author_id，批量查用户信息。
ListFavorites 聚合：Gateway social service 拿到收藏文章列表后，提取 author_id，批量查用户信息。

## Risks / Trade-offs

| 风险 | 影响 | 缓解 |
|------|------|------|
| REST ApiError BREAKING | Swagger UI 测试和外部消费者需适配 | 前端走 gRPC-Web 不受影响；Swagger 文档自动更新 |
| BFF 聚合 N+1 | 评论/收藏列表多了 N 次 GetUser 调用 | 可接受范围（通常 < 50 条），后续 BatchGetUsers 优化 |
| DTO 迁移可能遗漏字段 | Swagger 文档不一致 | 编译时检查 + Swagger UI 人工验证 |

## Migration Plan

1. 创建 `dto/` 模块（纯新增，不影响现有代码）
2. 逐个 route 模块迁移 DTO（删除内联 → use dto::*）
3. 增强 BFF 聚合（comment + social service）
4. 更新 main.rs 中的 Swagger schemas 引用
5. 编译验证 + Swagger UI 人工验证
