## Context

当前后端 Rust 代码库（4 个 crate：`gateway`、`svc-user`、`svc-content`、`shared`）在快速迭代中形成了以下状态：

- **shared crate** 已有 `proto`、`config`、`error`、`net`、`discovery`、`messaging`、`database`、`entity`、`auth` 9 个模块，但 `config::AppConfig` 和 `error::AppError` 完全未被任何微服务引用
- **各微服务**各自实现了 `datetime_to_timestamp`、`parse_uuid`、`db_error`、`extract_user_id` 等工具函数，共 30+ 个重复实现
- **Gateway** 的 REST 路由中内联了 4 套不一致的 DTO/ApiError 定义，gRPC service 层大部分接口是纯透传（仅 `services/article/mod.rs` 做了多服务聚合）
- **svc-content** 的 comment handler 直接查询了 `users` 表（跨越 svc-user 的数据域）
- **安全隐患**：`shared/src/database/mod.rs` 和 `shared/src/auth/mod.rs` 包含硬编码凭据默认值；`gateway/middleware/cors/mod.rs` 使用 `AllowOrigin::any()`

本次重构目标是消除这些架构债务，同时不改变外部 API 行为（除 REST ApiError 格式统一外）。

## Goals / Non-Goals

**Goals:**

1. 消灭重复代码 — 30+ 个函数收敛到 shared crate
2. 引入 Repository 层 — handler 不再直接操作 `DatabaseConnection`
3. 统一 Gateway REST DTO — 单一来源的 DTO 定义和 ApiError 格式
4. 治理硬编码 — 安全凭据 fail-fast，运维/业务常量命名化
5. Gateway BFF 聚合 — 关键接口从纯透传升级为多服务数据聚合
6. 修复语义不一致 — `inject_user_id` 行为统一、NATS 客户端统一

**Non-Goals:**

- 前端代码变更
- Proto schema 结构性调整（可新增 message/RPC，但不改已有的）
- 数据库 migration / 表结构变更
- 性能优化（N+1 问题记录但不强制解决）
- 引入新基础设施组件

## Decisions

### Decision 1: Shared Crate 新增模块设计

**方案**：在 `shared/src/` 下新增 3 个模块：`convert`、`extract`、`constants`。

```rust
// shared/src/lib.rs — 新增 3 行
pub mod convert;    // Proto ↔ Model 转换
pub mod extract;    // gRPC 请求提取工具
pub mod constants;  // 编译期常量
```

**为什么不合并为一个 `utils` 模块？**

- `convert` 依赖 `proto` + `entity`（重量级依赖）
- `extract` 依赖 `tonic::Request`（gRPC 专用）
- `constants` 无依赖（纯常量）
- 拆分后各微服务可按需引入，避免编译无关代码

#### convert 模块结构

```rust
// shared/src/convert/mod.rs
mod datetime;
mod user;
mod article;

pub use datetime::*;
pub use user::*;
pub use article::*;
```

```rust
// shared/src/convert/datetime.rs
use prost_types::Timestamp;
use sea_orm::prelude::DateTimeWithTimeZone;

/// DateTimeWithTimeZone → prost Timestamp
pub fn datetime_to_timestamp(dt: &DateTimeWithTimeZone) -> Timestamp {
    Timestamp {
        seconds: dt.timestamp(),
        nanos: dt.timestamp_subsec_nanos() as i32,
    }
}

/// Option<DateTimeWithTimeZone> → Option<Timestamp>
pub fn optional_datetime_to_timestamp(dt: &Option<DateTimeWithTimeZone>) -> Option<Timestamp> {
    dt.as_ref().map(datetime_to_timestamp)
}
```

```rust
// shared/src/convert/user.rs
use crate::entity::users;
use crate::proto::User;

/// users::Model → Proto User
pub fn user_model_to_proto(model: &users::Model) -> User {
    User {
        id: model.id.to_string(),
        username: model.username.clone(),
        email: model.email.clone(),
        display_name: model.display_name.clone().unwrap_or_default(),
        avatar_url: model.avatar_url.clone().unwrap_or_default(),
        bio: model.bio.clone().unwrap_or_default(),
        website: model.website.clone().unwrap_or_default(),
        github_username: model.github_username.clone().unwrap_or_default(),
        social_links: model.social_links.clone().unwrap_or_default(),
        created_at: Some(datetime_to_timestamp(&model.created_at)),
        updated_at: Some(datetime_to_timestamp(&model.updated_at)),
    }
}
```

#### extract 模块结构

```rust
// shared/src/extract/mod.rs
use tonic::{Request, Status};
use uuid::Uuid;

/// 从 gRPC 请求 metadata 中提取 user_id（必需，缺失则返回 Unauthenticated）
pub fn extract_user_id<T>(request: &Request<T>) -> Result<String, Status> {
    request
        .metadata()
        .get(crate::constants::METADATA_USER_ID)
        .and_then(|v| v.to_str().ok())
        .map(|s| s.to_string())
        .ok_or_else(|| Status::unauthenticated("Missing user_id in metadata"))
}

/// 从 gRPC 请求 metadata 中尝试提取 user_id（可选，缺失返回 None）
pub fn try_extract_user_id<T>(request: &Request<T>) -> Option<String> {
    request
        .metadata()
        .get(crate::constants::METADATA_USER_ID)
        .and_then(|v| v.to_str().ok())
        .map(|s| s.to_string())
}

/// 解析 UUID 字符串，失败返回 InvalidArgument
pub fn parse_uuid(id: &str) -> Result<Uuid, Status> {
    Uuid::parse_str(id)
        .map_err(|_| Status::invalid_argument(format!("Invalid UUID: {}", id)))
}

/// 数据库不可用的标准 Status
pub fn db_unavailable() -> Status {
    Status::unavailable("Database service is not available")
}
```

#### constants 模块结构

```rust
// shared/src/constants.rs

// ── 元数据 Key ──
pub const METADATA_USER_ID: &str = "x-user-id";
pub const METADATA_REQUEST_ID: &str = "x-request-id";
pub const AUTH_HEADER: &str = "authorization";
pub const BEARER_PREFIX: &str = "Bearer ";

// ── NATS Subject 前缀 ──
pub const NATS_PREFIX: &str = "luhanxin";
pub const NATS_EVENTS_PREFIX: &str = "luhanxin.events";
pub const NATS_RETRY_PREFIX: &str = "luhanxin.retry";
pub const NATS_DEADLETTER_PREFIX: &str = "luhanxin.deadletter";

// ── 服务名 ──
pub const SVC_USER: &str = "svc-user";
pub const SVC_CONTENT: &str = "svc-content";

// ── 分页 ──
pub const DEFAULT_PAGE_SIZE: i32 = 20;
pub const MAX_PAGE_SIZE: i32 = 100;
pub const MIN_PAGE_SIZE: i32 = 1;

// ── 校验规则 ──
pub const USERNAME_MIN_LEN: usize = 3;
pub const USERNAME_MAX_LEN: usize = 20;
pub const PASSWORD_MIN_LEN: usize = 8;
pub const PASSWORD_MAX_LEN: usize = 72;
pub const BCRYPT_COST: u32 = 12;

// ── Consul ──
pub const CONSUL_HEALTH_INTERVAL: &str = "10s";
pub const CONSUL_DEREGISTER_AFTER: &str = "30s";
pub const CONSUL_TAGS: &[&str] = &["grpc", "v1"];
```

**替代方案考量**：是否用环境变量替代编译期常量？

| 维度 | 编译期常量 (`const`) | 运行时配置 (`env`) |
|------|---------------------|-------------------|
| 适用 | 几乎不变的约定（元数据 key、NATS 前缀） | 部署时可能变化（端口、URL、超时） |
| 性能 | 零开销（编译时内联） | 需要在启动时读取 |
| 选择 | ✅ 用于 metadata key、NATS 前缀、校验规则 | ✅ 用于端口、URL、超时、secret |

### Decision 2: Repository 层设计

**方案**：在每个微服务内新增 `repositories/` 目录，定义 Repository trait + 实现。

```
svc-user/src/
├── repositories/
│   ├── mod.rs
│   └── user/
│       └── mod.rs       # UserRepository trait + SeaOrmUserRepository impl
├── handlers/
│   └── user/
│       └── mod.rs       # 引用 UserRepository trait，不直接用 DatabaseConnection
└── services/
    └── user/
        └── mod.rs       # 持有 Arc<dyn UserRepository>
```

```rust
// svc-user/src/repositories/user/mod.rs
use async_trait::async_trait;
use sea_orm::DatabaseConnection;
use shared::entity::users;
use uuid::Uuid;

/// 用户数据访问抽象
#[async_trait]
pub trait UserRepository: Send + Sync {
    async fn find_by_id(&self, id: Uuid) -> Result<Option<users::Model>, RepositoryError>;
    async fn find_by_username(&self, username: &str) -> Result<Option<users::Model>, RepositoryError>;
    async fn find_by_email(&self, email: &str) -> Result<Option<users::Model>, RepositoryError>;
    async fn create(&self, model: users::ActiveModel) -> Result<users::Model, RepositoryError>;
    async fn update(&self, model: users::ActiveModel) -> Result<users::Model, RepositoryError>;
    async fn list_paginated(
        &self,
        page_token: Option<&str>,
        page_size: i32,
        search: Option<&str>,
    ) -> Result<(Vec<users::Model>, Option<String>, i64), RepositoryError>;
    async fn find_by_ids(&self, ids: &[Uuid]) -> Result<Vec<users::Model>, RepositoryError>;
}

#[derive(Debug, thiserror::Error)]
pub enum RepositoryError {
    #[error("Database error: {0}")]
    Database(#[from] sea_orm::DbErr),
    #[error("Entity not found")]
    NotFound,
}

/// SeaORM 实现
pub struct SeaOrmUserRepository {
    db: DatabaseConnection,
}

impl SeaOrmUserRepository {
    pub fn new(db: DatabaseConnection) -> Self {
        Self { db }
    }
}

#[async_trait]
impl UserRepository for SeaOrmUserRepository {
    async fn find_by_id(&self, id: Uuid) -> Result<Option<users::Model>, RepositoryError> {
        use sea_orm::EntityTrait;
        Ok(users::Entity::find_by_id(id).one(&self.db).await?)
    }
    // ... 其他方法实现
}
```

**为什么用 trait 而不是直接封装 struct？**

- trait 允许 handler 测试时 mock repository（用 `mockall` 或手动 mock）
- 未来可以替换底层实现（如从 SeaORM 换到 SQLx）而不改 handler 代码
- 微服务之间的 repository 可以有不同实现但共享接口模式

**svc-content 的特殊处理**：

当前 `svc-content/handlers/comment/mod.rs` 直接查询 `users` 表。重构后：
1. 移除 comment handler 中的 `load_user()` 和 `load_users_batch()` 函数
2. 评论列表响应中只返回 `author_id`
3. 用户信息由 Gateway BFF 层通过调用 svc-user 来填充

### Decision 3: Gateway DTO 统一方案

**方案**：新增 `gateway/src/dto/` 目录，统一所有 REST DTO。

```
gateway/src/
├── dto/
│   ├── mod.rs           # 统一导出
│   ├── common.rs        # ApiError, ApiResponse, PaginationQuery
│   ├── user.rs          # UserDto, LoginDto, RegisterDto
│   ├── article.rs       # ArticleDto, GetArticleDto, ListArticlesDto
│   ├── comment.rs       # CommentDto, CreateCommentDto
│   └── social.rs        # FavoriteDto, InteractionDto
├── routes/
│   ├── mod.rs
│   ├── helpers.rs       # extract_bearer(), build_metadata(), status_to_response()
│   ├── article/mod.rs   # 引用 dto::article::*，不再内联定义
│   └── ...
```

```rust
// gateway/src/dto/common.rs
use serde::{Deserialize, Serialize};
use utoipa::ToSchema;

/// 统一 API 错误格式
///
/// ⚠️ BREAKING CHANGE — 对所有 4 个路由模块均为破坏性变更：
/// - user/mod.rs 当前格式:      `{ code: u32, message: String }` (含 Deserialize, ToSchema)
/// - article/mod.rs 当前格式:   `{ error: String }` (含 ToSchema)
/// - comment/mod.rs 当前格式:   `{ error: String }` (含 ToSchema)
/// - social/mod.rs 当前格式:    `{ error: String }` (含 ToSchema)
///
/// 目标格式 `{ code: String, message: String }` 是第三种格式，不同于以上任何一种。
/// 前端必须同步适配：将 `.error` 字段访问改为 `.message`，将 `.code` 从 u32 改为 String。
#[derive(Serialize, Deserialize, ToSchema)]
pub struct ApiError {
    /// 错误码（如 "NOT_FOUND"、"UNAUTHENTICATED"）
    pub code: String,
    /// 人类可读的错误描述
    pub message: String,
}

/// 分页查询参数
#[derive(Deserialize, ToSchema)]
pub struct PaginationQuery {
    pub page_token: Option<String>,
    #[serde(default = "default_page_size")]
    pub page_size: i32,
}

fn default_page_size() -> i32 {
    shared::constants::DEFAULT_PAGE_SIZE
}
```

```rust
// gateway/src/routes/helpers.rs
use axum::http::HeaderMap;
use tonic::metadata::MetadataMap;

/// 从 HTTP Authorization header 提取 Bearer token
pub fn extract_bearer(headers: &HeaderMap) -> Option<String> {
    headers
        .get(shared::constants::AUTH_HEADER)
        .and_then(|v| v.to_str().ok())
        .and_then(|s| s.strip_prefix(shared::constants::BEARER_PREFIX))
        .map(|s| s.to_string())
}

/// 将 HTTP headers 转换为 gRPC MetadataMap（白名单策略）
///
/// 设计决策：采用白名单转发，只转发 `authorization` + `x-request-id`。
/// 当前 `user/mod.rs` 的 `headers_to_metadata()` 会全量克隆所有 HTTP headers，
/// 这存在以下风险：
/// 1. 可能泄露敏感 HTTP headers（如 cookie、host）给下游微服务
/// 2. 全量克隆带来不必要的性能开销
/// 3. 下游微服务无法区分哪些 metadata 是 Gateway 有意传递的
///
/// 白名单策略只转发下游需要的：认证信息（authorization）和请求追踪（x-request-id）。
pub fn build_metadata(headers: &HeaderMap) -> MetadataMap {
    let mut metadata = MetadataMap::new();
    // 转发认证信息
    if let Some(auth) = headers.get(shared::constants::AUTH_HEADER) {
        if let Ok(val) = auth.to_str() {
            metadata.insert(shared::constants::AUTH_HEADER, val.parse().unwrap());
        }
    }
    // 转发请求追踪 ID（用于分布式链路追踪）
    if let Some(request_id) = headers.get(shared::constants::METADATA_REQUEST_ID) {
        if let Ok(val) = request_id.to_str() {
            metadata.insert(shared::constants::METADATA_REQUEST_ID, val.parse().unwrap());
        }
    }
    metadata
}

/// tonic Status → (StatusCode, ApiError) 映射
/// 覆盖所有已知的业务状态码，参考 routes/user/mod.rs 的现有实现
pub fn status_to_response(status: tonic::Status) -> (axum::http::StatusCode, axum::Json<super::dto::common::ApiError>) {
    use axum::http::StatusCode;
    let (http_code, error_code) = match status.code() {
        tonic::Code::NotFound => (StatusCode::NOT_FOUND, "NOT_FOUND"),
        tonic::Code::InvalidArgument => (StatusCode::BAD_REQUEST, "INVALID_ARGUMENT"),
        tonic::Code::Unauthenticated => (StatusCode::UNAUTHORIZED, "UNAUTHENTICATED"),
        tonic::Code::PermissionDenied => (StatusCode::FORBIDDEN, "PERMISSION_DENIED"),
        tonic::Code::AlreadyExists => (StatusCode::CONFLICT, "ALREADY_EXISTS"),
        tonic::Code::DeadlineExceeded => (StatusCode::GATEWAY_TIMEOUT, "DEADLINE_EXCEEDED"),
        tonic::Code::ResourceExhausted => (StatusCode::TOO_MANY_REQUESTS, "RESOURCE_EXHAUSTED"),
        tonic::Code::Unavailable => (StatusCode::SERVICE_UNAVAILABLE, "UNAVAILABLE"),
        _ => (StatusCode::INTERNAL_SERVER_ERROR, "INTERNAL"),
    };
    (http_code, axum::Json(super::dto::common::ApiError {
        code: error_code.to_string(),
        message: status.message().to_string(),
    }))
}
```

### Decision 4: 硬编码治理分级策略

| 优先级 | 处理方式 | 涉及文件 |
|--------|---------|---------|
| P0（安全） | 移除默认值，缺失 env var → `panic!` | `shared/src/database/mod.rs`、`shared/src/auth/mod.rs` |
| P0（安全） | CORS 改为 env var 可配白名单 | `gateway/middleware/cors/mod.rs` |
| P1（运维） | 收敛到 `shared::constants` | NATS subjects、服务名、metadata key |
| P1（运维） | 收敛到 `AppConfig` / 各服务 `config.rs` | 端口、URL、超时 |
| P2（业务） | 收敛到 `shared::constants` | 分页默认值、校验规则、bcrypt cost |

```rust
// shared/src/database/mod.rs — 改造前后对比
// ❌ Before: 有默认凭据
let url = env::var("DATABASE_URL")
    .unwrap_or_else(|_| "postgres://luhanxin:luhanxin_dev_2024@localhost:5432/luhanxin_community".to_string());

// ✅ After: fail-fast
let url = env::var("DATABASE_URL")
    .expect("DATABASE_URL must be set — refusing to start with default credentials");
```

```rust
// shared/src/auth/mod.rs — 改造前后对比
// ❌ Before: 可猜测的默认 secret
let secret = env::var("JWT_SECRET")
    .unwrap_or_else(|_| "dev_jwt_secret_luhanxin_2024_change_in_production".to_string());

// ✅ After: fail-fast
let secret = env::var("JWT_SECRET")
    .expect("JWT_SECRET must be set — refusing to start with default secret");
```

```rust
// gateway/middleware/cors/mod.rs — 改造
use std::env;
use tower_http::cors::{CorsLayer, AllowOrigin, AllowMethods, AllowHeaders};

pub fn cors_layer() -> CorsLayer {
    let origins = env::var("CORS_ALLOWED_ORIGINS")
        .unwrap_or_else(|_| "http://localhost:5173,http://localhost:5174,http://localhost:5175".to_string());
    
    let origins: Vec<_> = origins
        .split(',')
        .map(|s| s.trim().parse().expect("Invalid CORS origin"))
        .collect();

    CorsLayer::new()
        .allow_origin(AllowOrigin::list(origins))
        .allow_methods(AllowMethods::list([
            http::Method::GET,
            http::Method::POST,
            http::Method::PUT,
            http::Method::DELETE,
            http::Method::OPTIONS,
        ]))
        .allow_headers(AllowHeaders::list([
            http::header::CONTENT_TYPE,
            http::header::AUTHORIZATION,
            http::header::HeaderName::from_static("x-grpc-web"),
            http::header::HeaderName::from_static("grpc-timeout"),
        ]))
        .max_age(std::time::Duration::from_secs(86400))
}
```

### Decision 5: Gateway BFF 聚合策略

**方案**：在 Gateway gRPC service 层增加聚合逻辑，REST 路由复用聚合结果。

**聚合方式**：Gateway 已有的 `fill_authors()` 模式（collect unique IDs → batch query svc-user → merge back）推广到其他接口。

**新增/增强的聚合接口**：

1. **ListComments 聚合**：Gateway `services/comment/mod.rs` 拿到评论列表后，提取所有 `author_id`，调用 svc-user 批量查用户信息，填充到评论的 `author` 字段。同时移除 svc-content 中违规的 users 表查询。

2. **ListFavorites 聚合**：Gateway `services/social/mod.rs` 拿到收藏列表后，提取 `author_id` 列表，调用 svc-user 批量查用户信息，填充到响应中。

3. **REST 路由聚合对齐**：REST 路由的文章列表接口调用 Gateway gRPC service 层（已有聚合逻辑），而非直接调用下游 svc-content。

**为什么不在本次增加 `GetArticleDetail` 聚合接口？**

`GetArticleDetail` 涉及聚合 3 个下游调用（文章 + 互动状态 + 评论预览），需要新增 Proto message 定义。这与「不做 Proto 结构性调整」的非目标冲突。记录为 follow-up 任务。

### Decision 6: `inject_user_id` 语义统一

**方案**：废弃各服务内的 `inject_user_id` 函数，统一使用 shared 提供的两个函数：

```rust
// 需认证接口（如 CreateArticle、UpdateProfile）→ 用 extract_user_id
let user_id = shared::extract::extract_user_id(&request)?;

// 可选认证接口（如 GetArticle 需要判断当前用户是否已点赞）→ 用 try_extract_user_id
let current_user_id = shared::extract::try_extract_user_id(&request);
```

当前不一致点及修复：
- `gateway/services/article/mod.rs` 和 `services/user/mod.rs`：`Unauthenticated` — ✅ 已正确，改为调用 shared
- `gateway/services/comment/mod.rs` 和 `services/social/mod.rs`：静默跳过 — ⚠️ 需区分接口：CreateComment 应用 `extract_user_id`（强制认证），ListComments 可用 `try_extract_user_id`

**REST 层认证双路径问题**：

当前 Gateway 存在两条认证路径，导致 user_id 注入方式不统一：

| 路径 | 使用者 | 认证流程 | user_id 来源 |
|------|--------|---------|-------------|
| **REST 直连模式** | `routes/article/mod.rs` | HTTP header → `build_metadata()` → gRPC request → auth interceptor 解析 JWT → inject metadata `x-user-id` | auth interceptor 在 gRPC 层注入 |
| **gRPC service 透传模式** | `routes/comment/mod.rs`、`routes/social/mod.rs` | REST handler 直接构造 gRPC request → service 层的 `inject_user_id` 从 `ctx.attrs["user_id"]` 读取 | REST handler 层预解析 |

**统一方案**：所有 REST 路由统一走 `build_metadata()` 路径：
1. REST handler 只负责 HTTP → gRPC 转换，通过 `build_metadata()` 传递 `authorization` header
2. Gateway gRPC service 层通过 auth interceptor 统一解析 JWT 并注入 `x-user-id` metadata
3. 下游微服务统一使用 `shared::extract::extract_user_id()` 从 metadata 提取
4. 废弃 REST handler 中的预解析逻辑和 `ctx.attrs` 传递方式

## Risks / Trade-offs

| 风险 | 影响 | 缓解措施 |
|------|------|---------|
| **REST ApiError 格式变更是全面 BREAKING** | 所有 4 个路由模块的 ApiError 格式均不同于目标格式（user 用 `{code:u32, message}`，其他三个用 `{error}`），前端所有错误处理代码都需要适配 | **实施前**：先用任务 6.0 收集前端所有 ApiError 消费点清单；前端搜索 `.error` → `.message` 和 `.code` 类型变更；此次标注为 BREAKING，后续前端 PR 跟进 |
| **移除 DB/JWT 默认值后开发环境启动** | 开发者忘了 `.env` 文件会导致 panic | 更新 `docker/.env.example`，在 README 和 Makefile 中增加提醒；开发环境使用 `.env` 文件 |
| **Repository trait 增加编译时间** | `async_trait` 宏有一定编译开销 | 可接受范围内（每个微服务只有 1-2 个 repository） |
| **svc-content 移除 users 表查询后** | 评论列表响应暂时没有用户信息 | Gateway BFF 层立即补上 `fill_comment_authors()` 聚合 |
| **CORS 收紧后可能影响开发环境** | 如果忘配 `CORS_ALLOWED_ORIGINS` | 默认值为 `localhost:5173,5174,5175`，只用于开发环境 |

## Migration Plan

### 实施顺序（最小风险路径）

1. **Phase 1: Shared 基础模块**（无破坏性）
   - 新增 `shared::convert`、`shared::extract`、`shared::constants`
   - 现有代码不动，只是新增模块

2. **Phase 2: 微服务内部重构**（行为不变）
   - 新增 `repositories/` 层
   - handler 改为调用 repository
   - 删除各服务内的重复函数，改为引用 shared
   - 运行 gRPC 集成测试确认行为不变

3. **Phase 3: Gateway 重构**（REST API BREAKING）
   - 提取 DTO 到 `dto/` 模块
   - 统一 ApiError 格式
   - 提取 routes helpers
   - BFF 聚合增强

4. **Phase 4: 硬编码治理**（配置变更）
   - P0 安全修复
   - P1 运维常量收敛
   - P2 业务常量

5. **Phase 5: 清理**
   - 移除 svc-content 中的跨域查询代码
   - 统一 NATS 客户端用法
   - 激活 `shared::error::AppError`

### 回滚策略

每个 Phase 独立可回滚。Phase 3 的 REST BREAKING 变更是唯一需要前端配合的，如果前端尚未准备好可以延后。

## Open Questions

1. **`GetArticleDetail` 聚合接口**是否在本次新增 Proto message？还是作为独立的 follow-up change？
2. **`fill_authors()` 的 N+1 问题**（逐个查用户 vs 批量查）是否在本次解决？当前代码是逐个 `GetUser` 调用。
3. **前端 ApiError 格式迁移**由谁负责？是否需要同步的前端 PR？
