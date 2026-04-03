## Why

上一次重构（`backend-shared-refactor`）完成了后端共享层的代码收敛和硬编码治理，但遗留了两项工作：

1. **Gateway REST 路由的 DTO 散落在 4 个 route 模块中**，每个模块各自定义 `ApiError`、`UserDto` 等结构体，存在格式不一致（user 用 `{code:u32, message}`，其他三个用 `{error}`）和交叉引用（article DTO 用 `super::super::routes::user::UserDto`）
2. **Gateway BFF 聚合不完整** — ListComments 和 ListFavorites 返回数据缺少用户信息（作者头像、用户名），影响前端展示

这两项是 `backend-shared-refactor` 中标记为 FOLLOW-UP 的 Phase 6（6.0-6.5）和 Phase 8（8.1-8.4）。

## What Changes

### Part A: Gateway DTO 集中管理

1. 创建 `gateway/src/dto/` 目录，从 4 个 route 模块迁移所有 DTO struct
2. 统一 `ApiError` 格式为 `{ code: String, message: String }`
3. 修复 `ArticleDto` 中 `super::super::routes::user::UserDto` 的交叉引用
4. 4 个 route 模块改为 `use crate::dto::*`

### Part B: Gateway BFF 聚合增强

5. `gateway/services/comment/mod.rs` — ListComments 聚合评论者用户信息（调 svc-user 批量查）
6. `gateway/services/social/mod.rs` — ListFavorites 聚合文章作者信息
7. REST 路由对齐 — 文章列表接口复用 gRPC service 层聚合逻辑

## Non-Goals

- 前端代码变更（前端走 Connect RPC / gRPC-Web，不消费 REST API 的 `{error}` 字段）
- Proto schema 调整
- 性能优化（N+1 → BatchGetUsers 是独立优化）

## Impact

- **REST API BREAKING**：`/api/v1/` 所有 REST 端点的错误响应格式统一（影响 Swagger UI 测试和潜在的外部消费者）
- **前端无影响**：前端通过 Connect RPC 调用，错误通过 `ConnectError.message` 消费
- **用户体验提升**：评论列表和收藏列表将包含作者信息，前端不再需要额外请求

## Relation to Existing Design

延续 `docs/design/2026-04-01/` 的架构设计和 `docs/tech/10-backend-shared-refactor.md` 的技术决策。本次变更是 `backend-shared-refactor` 的直接后续。
