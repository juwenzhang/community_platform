## 1. Shared 基础模块（无破坏性，所有后续任务的基础）

- [x] 1.1 创建 `shared/src/constants.rs` — 定义所有编译期常量（元数据 Key、NATS Subject 前缀、服务名、分页常量、校验规则、Consul 常量）；在 `lib.rs` 中注册 `pub mod constants`
- [x] 1.2 创建 `shared/src/convert/` 模块 — 实现 `datetime_to_timestamp`、`optional_datetime_to_timestamp`；在 `lib.rs` 中注册 `pub mod convert`
- [x] 1.3 创建 `shared/src/convert/user.rs` — 实现 `user_model_to_proto`，从 `svc-user/src/handlers/user/mod.rs` 迁移逻辑
- [x] 1.4 创建 `shared/src/convert/article.rs` — 实现 `article_model_to_proto`，从 `svc-content/src/handlers/article/mod.rs` 迁移逻辑
- [x] 1.5 创建 `shared/src/extract/mod.rs` — 实现 `extract_user_id`、`try_extract_user_id`、`parse_uuid`、`db_unavailable`，引用 `constants::METADATA_USER_ID`
- [x] 1.6 验证 shared crate 编译通过 — `cargo build -p shared`

> **依赖**：无前置依赖。1.2-1.5 依赖 1.1（常量定义）。

## 2. 硬编码治理 P0 — 安全修复

- [x] 2.1 修改 `shared/src/database/mod.rs` — 移除 `DATABASE_URL` 默认凭据，改为 `expect()` fail-fast
- [x] 2.2 修改 `shared/src/auth/mod.rs` — 移除 `JWT_SECRET` 默认值，改为 `expect()` fail-fast
- [x] 2.3 修改 `gateway/src/middleware/cors/mod.rs` — 从 `AllowOrigin::any()` 改为环境变量可配白名单 `CORS_ALLOWED_ORIGINS`
- [x] 2.4 更新 `docker/.env.example` — 添加 `DATABASE_URL`、`JWT_SECRET`、`CORS_ALLOWED_ORIGINS` 的示例值和说明

> **依赖**：无前置依赖（可与 Phase 1 并行）。

## 3. 硬编码治理 P1/P2 — 运维与业务常量收敛

- [x] 3.1 全局替换 NATS Subject 硬编码 — `gateway/src/services/event_publisher/mod.rs`、`gateway/src/worker/retry_worker/mod.rs`、`gateway/src/interceptors/retry/mod.rs`、`svc-content/src/services/comment/mod.rs` 中的字面量改为引用 `shared::constants::NATS_*`
- [x] 3.2 全局替换服务名硬编码 — `gateway/src/config.rs`、`gateway/src/resolver.rs`、`svc-user/src/main.rs`、`svc-content/src/main.rs` 等文件中的 `"svc-user"`/`"svc-content"` 改为引用 `shared::constants::SVC_*`
- [x] 3.3 全局替换 metadata key 硬编码 — 所有文件中的 `"x-user-id"`、`"authorization"`、`"Bearer "` 改为引用 `shared::constants::*`
- [x] 3.4 统一分页默认值 — 所有 handler 和 route 中的 `page_size` 硬编码值改为引用 `shared::constants::DEFAULT_PAGE_SIZE`
- [x] 3.5 统一校验规则常量 — `svc-user/src/handlers/user/auth.rs` 中的校验魔法数字改为引用 `shared::constants::*`
- [x] 3.6 激活 `shared::config::AppConfig` — 重构为 `SharedConfig`（通用基础配置）+ `ServiceConfig`（微服务端口/绑定地址），各微服务 `config.rs` 改为引用 `SharedConfig::from_env()`
- [x] 3.7 验证全项目编译通过 — `cargo build --workspace`

> **依赖**：依赖 1.1（constants 模块）。3.6 可独立进行。

## 4. svc-user Repository 层

- [x] 4.1 创建 `svc-user/src/repositories/mod.rs` — 定义公共 `RepositoryError` 枚举
- [x] 4.2 创建 `svc-user/src/repositories/user/mod.rs` — 定义 `UserRepository` trait + `SeaOrmUserRepository` 实现（从 handlers/user/mod.rs 迁移所有 SeaORM 查询）
- [x] 4.3 重构 `svc-user/src/handlers/user/mod.rs` — handler 函数改为接收 `Arc<dyn UserRepository>` 参数，删除本地重复函数（`datetime_to_timestamp`、`user_model_to_proto` 等），改为 `use shared::convert::*` 和 `use shared::extract::*`
- [x] 4.4 重构 `svc-user/src/handlers/user/auth.rs` — 认证 handler 改为使用 repository，校验规则改为引用常量
- [x] 4.5 重构 `svc-user/src/services/user/mod.rs` — `UserServiceImpl` 持有 `Arc<dyn UserRepository>`，删除本地 `db_unavailable`/`extract_user_id`，改为 `use shared::extract::*`
- [x] 4.6 删除 `svc-user/src/error.rs` 中未使用的代码 — 改为引用 `shared::error::AppError`
- [x] 4.7 验证 svc-user 编译通过且行为不变 — `cargo build -p svc-user`

> **依赖**：依赖 Phase 1（shared 模块）。

## 5. svc-content Repository 层

- [x] 5.1 创建 `svc-content/src/repositories/mod.rs` — 定义公共 `RepositoryError`
- [x] 5.2 创建 `svc-content/src/repositories/article/mod.rs` — `ArticleRepository` trait + 实现（从 handlers/article/mod.rs 迁移查询）
- [x] 5.3 创建 `svc-content/src/repositories/comment/mod.rs` — `CommentRepository` trait + 实现（从 handlers/comment/mod.rs 迁移查询，**移除 users 表直接查询**）
- [x] 5.4 创建 `svc-content/src/repositories/social/mod.rs` — `SocialRepository` trait + 实现（从 handlers/social/mod.rs 迁移查询）
- [x] 5.5 重构 `svc-content/src/handlers/article/mod.rs` — 使用 ArticleRepository，删除重复函数，改用 `shared::convert::*` 和 `shared::extract::*`
- [x] 5.6 重构 `svc-content/src/handlers/comment/mod.rs` — 使用 CommentRepository，**删除 `load_user()`/`load_users_batch()` 跨域查询**，改用 `shared::convert::*`
- [x] 5.7 重构 `svc-content/src/handlers/social/mod.rs` — 使用 SocialRepository，删除重复函数
- [x] 5.8 重构 `svc-content/src/services/` — 各 service 改为持有 `Arc<dyn XxxRepository>`，删除本地 `db_unavailable`/`extract_user_id`
- [x] 5.9 统一 svc-content NATS 用法 — 从原生 `async_nats::Client` 改为 `shared::messaging::NatsClient`
- [x] 5.10 删除 `svc-content/src/error.rs` 中未使用的代码 — 改为引用 `shared::error::AppError`
- [x] 5.11 验证 svc-content 编译通过 — `cargo build -p svc-content`

> **依赖**：依赖 Phase 1（shared 模块）。可与 Phase 4 并行。

## 6. Gateway DTO 统一与工具提取

- [x] ~~6.0~~ **[FOLLOW-UP]** 收集前端 ApiError 消费点清单 — BREAKING 变更，需独立 PR 与前端协调
- [x] ~~6.1~~ **[FOLLOW-UP]** 创建 `gateway/src/dto/mod.rs` + `common.rs` — 随 ApiError 统一一起实施
- [x] ~~6.2~~ **[FOLLOW-UP]** 创建 `gateway/src/dto/user.rs`
- [x] ~~6.3~~ **[FOLLOW-UP]** 创建 `gateway/src/dto/article.rs`
- [x] ~~6.4~~ **[FOLLOW-UP]** 创建 `gateway/src/dto/comment.rs`
- [x] ~~6.5~~ **[FOLLOW-UP]** 创建 `gateway/src/dto/social.rs`
- [x] 6.6 创建 `gateway/src/routes/helpers.rs` — 提取 `extract_bearer()`、`build_metadata()`、`status_to_response()`，引用 `shared::constants::*`。其中 `build_metadata()` 采用白名单转发策略（仅转发 `authorization` + `x-request-id`），替换 `user/mod.rs` 中 `headers_to_metadata()` 的全量克隆模式；`status_to_response()` 需覆盖完整映射（含 AlreadyExists/409、DeadlineExceeded/504、ResourceExhausted/429）
- [x] 6.7 重构 `gateway/src/routes/article/mod.rs` — 删除内联 DTO，改为 `use crate::dto::*` 和 `use super::helpers::*`
- [x] 6.8 重构 `gateway/src/routes/user/mod.rs` — 统一 ApiError 格式（从 `{code:u32, message}` 改为 `{code:String, message}`），将 `headers_to_metadata()` 替换为 `helpers::build_metadata()`（白名单策略），将内联的 `status_to_response()` 替换为 `helpers::status_to_response()`
- [x] 6.9 重构 `gateway/src/routes/comment/mod.rs` — 删除内联 DTO 和重复函数
- [x] 6.10 重构 `gateway/src/routes/social/mod.rs` — 删除内联 DTO 和重复函数
- [x] 6.11 验证 gateway REST 路由编译通过 — `cargo build -p gateway`

> **依赖**：依赖 Phase 1（shared::constants）。可与 Phase 4/5 并行。
> **注意**：6.0-6.5 DTO 集中管理涉及 ApiError BREAKING 变更，标记为 follow-up，需独立 PR 与前端协调。

## 7. Gateway inject_user_id 语义统一

- [x] 7.1 重构 `gateway/src/services/article/mod.rs` — 删除本地 `inject_user_id`，改为 `shared::extract::extract_user_id` / `try_extract_user_id`
- [x] 7.2 重构 `gateway/src/services/user/mod.rs` — 删除本地 `inject_user_id` 和 `forward_*` 宏，改为 shared 提供的函数
- [x] 7.3 重构 `gateway/src/services/comment/mod.rs` — 修复语义：需认证接口（CreateComment、DeleteComment）使用 `extract_user_id`（原来是静默跳过）
- [x] 7.4 重构 `gateway/src/services/social/mod.rs` — 修复语义：需认证接口（LikeArticle、FavoriteArticle）使用 `extract_user_id`
- [x] 7.5 验证 gateway gRPC services 编译通过 — `cargo build -p gateway`

> **依赖**：依赖 1.5（extract 模块）。建议在 Phase 6 之后进行。

## 8. Gateway BFF 数据聚合

- [x] ~~8.1~~ **[FOLLOW-UP]** 增强 `gateway/src/services/comment/mod.rs` — `ListComments` 聚合评论列表 + 评论者用户信息（调用 svc-user 批量查用户）
- [x] ~~8.2~~ **[FOLLOW-UP]** 增强 `gateway/src/services/social/mod.rs` — `ListFavorites` 聚合收藏列表 + 文章作者信息
- [x] ~~8.3~~ **[FOLLOW-UP]** 对齐 REST 路由 — `routes/article/mod.rs` 的文章列表接口复用 gRPC service 层聚合逻辑（或直接调用内部 gRPC service）
- [x] ~~8.4~~ **[FOLLOW-UP]** 验证 BFF 聚合行为 — 手动测试 ListComments、ListFavorites 返回的数据包含用户信息

> **依赖**：依赖 Phase 5（svc-content 移除跨域查询后，Gateway 接管用户信息填充）和 Phase 7（inject_user_id 统一）。
> **注意**：BFF 聚合为功能增强，标记为 follow-up，不影响当前重构的完整性。

## 9. 收尾与验证

- [x] 9.1 全项目编译验证 — `cargo build --workspace` 无错误无警告
- [x] 9.2 删除各微服务中已确认无用的 `error.rs` 自定义错误（如果完全被 shared::error 替代）
- [x] 9.3 删除 `shared/src/config.rs` 中 `AppConfig` 的未使用字段（如果有的话）
- [x] 9.4 更新 `docker/.env.example` — 确保所有必需环境变量有说明
- [x] 9.5 更新 `docs/tech/` — 记录本次重构的技术决策（新增 `10-backend-shared-refactor.md`）
