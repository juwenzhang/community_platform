# 后端架构设计 — Rust 微服务

> 📅 创建日期：2026-03-20
> 📌 状态：Draft — 待 Review

---

## 1. 技术栈详情

### 1.1 核心框架

| 组件 | Crate | 版本 | 用途 |
|------|-------|------|------|
| Web 框架 | `axum` | 0.7+ | HTTP 路由、中间件、WebSocket |
| 运行时 | `tokio` | 1.x | 异步运行时 |
| ORM | `sea-orm` | 1.x | 异步 ORM，PostgreSQL |
| 数据库迁移 | `sea-orm-migration` | 1.x | 版本化数据库迁移 |
| 序列化 | `prost` + `prost-types` | 0.13+ | Protobuf 序列化/反序列化 (前后端交互) |
| 认证 | `jsonwebtoken` | 9.x | JWT Token 签发与校验 |
| 密码 | `argon2` | 0.5+ | 密码哈希 (Argon2id) |
| 日志 | `tracing` + `tracing-subscriber` | 0.1+ | 结构化日志 |
| 错误 | `thiserror` + `anyhow` | 1.x | 类型化错误处理 |
| 配置 | `config` | 0.14+ | 多环境配置 |
| Redis | `redis` (with `deadpool-redis`) | 0.27+ | 缓存、会话、消息队列 |
| HTTP 客户端 | `reqwest` | 0.12+ | 服务间通信、OAuth 回调 |
| API 文档 | `utoipa` + `utoipa-swagger-ui` | 5.x | OpenAPI 3.0 文档自动生成 |
| 验证 | `validator` | 0.18+ | 请求参数校验 |
| UUID | `uuid` | 1.x | 唯一标识符 |
| 时间 | `chrono` | 0.4+ | 日期时间处理 |
| 文件上传 | `axum-multipart` / `tokio-multipart` | - | 文件上传处理 |
| CORS | `tower-http` | 0.5+ | CORS、压缩、追踪等 |

### 1.2 可选增强

| 组件 | Crate | 用途 |
|------|-------|------|
| gRPC | `tonic` | 服务间高性能通信 + Connect Protocol |
| Protobuf 工具 | `buf` (CLI) + `prost-build` | .proto 编译 + 代码生成 |
| 任务调度 | `tokio-cron-scheduler` | 定时任务 |
| 限流 | `governor` | 请求限流 |
| 搜索 | `meilisearch-sdk` | Meilisearch 客户端 |
| 对象存储 | `rust-s3` | S3 兼容存储 |
| 邮件 | `lettre` | SMTP 邮件发送 |
| Metrics | `metrics` + `metrics-exporter-prometheus` | Prometheus 指标导出 |

---

## 2. Rust Workspace 目录结构

```
services/
├── Cargo.toml                         # Workspace 根配置
├── Cargo.lock
├── .cargo/
│   └── config.toml                    # Cargo 配置 (registry mirror 等)
│
├── gateway/                           # 🌐 API 网关
│   ├── Cargo.toml
│   └── src/
│       ├── main.rs                    # 入口
│       ├── config.rs                  # 配置加载
│       ├── routes/                    # 路由注册 (代理转发)
│       │   └── mod.rs
│       ├── middleware/                 # 中间件
│       │   ├── auth.rs                # JWT 认证中间件
│       │   ├── rate_limit.rs          # 限流
│       │   ├── cors.rs                # CORS
│       │   ├── logger.rs              # 请求日志
│       │   └── mod.rs
│       └── proxy.rs                   # 反向代理逻辑
│
├── svc-user/                          # 👤 用户服务
│   ├── Cargo.toml
│   └── src/
│       ├── main.rs
│       ├── config.rs
│       ├── routes/                    # 路由
│       │   ├── auth.rs                # 注册/登录/OAuth
│       │   ├── profile.rs             # 个人信息 CRUD
│       │   ├── follow.rs              # 关注/取关
│       │   └── mod.rs
│       ├── handlers/                  # 请求处理器
│       │   ├── auth_handler.rs
│       │   ├── profile_handler.rs
│       │   └── follow_handler.rs
│       ├── services/                  # 业务逻辑层
│       │   ├── auth_service.rs
│       │   ├── user_service.rs
│       │   └── follow_service.rs
│       ├── models/                    # SeaORM Entity
│       │   ├── user.rs
│       │   ├── user_profile.rs
│       │   ├── user_follow.rs
│       │   └── mod.rs
│       ├── dto/                       # 数据传输对象
│       │   ├── request.rs
│       │   └── response.rs
│       └── error.rs                   # 服务级错误定义
│
├── svc-content/                       # 📝 内容服务
│   ├── Cargo.toml
│   └── src/
│       ├── main.rs
│       ├── routes/
│       │   ├── article.rs             # 文章 CRUD
│       │   ├── comment.rs             # 评论
│       │   ├── tag.rs                 # 标签
│       │   ├── draft.rs               # 草稿
│       │   └── mod.rs
│       ├── handlers/
│       ├── services/
│       │   ├── article_service.rs
│       │   ├── comment_service.rs
│       │   ├── tag_service.rs
│       │   ├── markdown_service.rs    # Markdown 解析
│       │   └── draft_service.rs
│       ├── models/
│       │   ├── article.rs
│       │   ├── comment.rs
│       │   ├── tag.rs
│       │   ├── article_tag.rs         # 多对多关联
│       │   └── draft.rs
│       └── dto/
│
├── svc-social/                        # 💬 社交服务
│   ├── Cargo.toml
│   └── src/
│       ├── main.rs
│       ├── routes/
│       │   ├── like.rs                # 点赞
│       │   ├── bookmark.rs            # 收藏
│       │   └── mod.rs
│       ├── handlers/
│       ├── services/
│       │   ├── like_service.rs
│       │   └── bookmark_service.rs
│       └── models/
│           ├── like.rs
│           └── bookmark.rs
│
├── svc-notification/                  # 🔔 通知服务
│   ├── Cargo.toml
│   └── src/
│       ├── main.rs
│       ├── routes/
│       │   ├── notification.rs        # 通知列表/已读
│       │   └── mod.rs
│       ├── handlers/
│       ├── services/
│       │   ├── notification_service.rs
│       │   └── push_service.rs        # WebSocket 推送
│       └── models/
│           └── notification.rs
│
├── svc-search/                        # 🔍 搜索服务
│   ├── Cargo.toml
│   └── src/
│       ├── main.rs
│       ├── routes/
│       │   └── search.rs              # 搜索接口
│       ├── handlers/
│       ├── services/
│       │   ├── search_service.rs      # Meilisearch 集成
│       │   └── indexer_service.rs     # 索引更新
│       └── dto/
│
├── svc-upload/                        # 📁 文件上传服务
│   ├── Cargo.toml
│   └── src/
│       ├── main.rs
│       ├── routes/
│       │   └── upload.rs
│       ├── services/
│       │   ├── storage_service.rs     # MinIO/S3 集成
│       │   └── image_service.rs       # 图片处理 (缩略图)
│       └── dto/
│
└── shared/                            # 🔧 共享库
    ├── Cargo.toml
    └── src/
        ├── lib.rs
        ├── config.rs                  # 通用配置结构
        ├── db.rs                      # 数据库连接池
        ├── redis.rs                   # Redis 连接池
        ├── auth/                      # 认证相关
        │   ├── jwt.rs                 # JWT 工具
        │   ├── claims.rs              # Token Claims
        │   └── mod.rs
        ├── error/                     # 统一错误处理
        │   ├── app_error.rs           # 应用错误枚举
        │   ├── response.rs            # 错误响应格式
        │   └── mod.rs
        ├── middleware/                # 共享中间件
        │   ├── auth.rs                # 认证提取器
        │   ├── tracing.rs             # 请求追踪
        │   └── mod.rs
        ├── response.rs                # 统一响应格式
        ├── pagination.rs              # 分页工具
        └── validate.rs                # 校验工具
```

---

## 3. Cargo Workspace 配置

```toml
# services/Cargo.toml
[workspace]
resolver = "2"
members = [
    "gateway",
    "svc-user",
    "svc-content",
    "svc-social",
    "svc-notification",
    "svc-search",
    "svc-upload",
    "shared",
]

[workspace.package]
version = "0.1.0"
edition = "2021"
rust-version = "1.80"
license = "MIT"

[workspace.dependencies]
# Web
axum = { version = "0.7", features = ["macros", "ws"] }
tokio = { version = "1", features = ["full"] }
tower = "0.4"
tower-http = { version = "0.5", features = ["cors", "trace", "compression-gzip"] }

# Database
sea-orm = { version = "1.0", features = ["sqlx-postgres", "runtime-tokio-rustls", "macros"] }
sea-orm-migration = { version = "1.0" }
deadpool-redis = "0.18"
redis = { version = "0.27", features = ["tokio-comp"] }

# Serialization
serde = { version = "1", features = ["derive"] }
serde_json = "1"
prost = "0.13"
prost-types = "0.13"
tonic = { version = "0.12", features = ["gzip"] }

# Auth
jsonwebtoken = "9"
argon2 = "0.5"

# Observability
tracing = "0.1"
tracing-subscriber = { version = "0.3", features = ["env-filter", "json"] }
metrics = "0.23"
metrics-exporter-prometheus = "0.15"

# Utilities
uuid = { version = "1", features = ["v4", "serde"] }
chrono = { version = "0.4", features = ["serde"] }
validator = { version = "0.18", features = ["derive"] }
thiserror = "1"
anyhow = "1"
config = "0.14"

# API Docs
utoipa = { version = "5", features = ["axum_extras"] }
utoipa-swagger-ui = { version = "8", features = ["axum"] }
```

---

## 4. 统一响应格式

```rust
// shared/src/response.rs

use serde::Serialize;

#[derive(Serialize)]
pub struct ApiResponse<T: Serialize> {
    pub code: i32,
    pub message: String,
    pub data: Option<T>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub meta: Option<PaginationMeta>,
}

#[derive(Serialize)]
pub struct PaginationMeta {
    pub page: u64,
    pub per_page: u64,
    pub total: u64,
    pub total_pages: u64,
}

impl<T: Serialize> ApiResponse<T> {
    pub fn success(data: T) -> Self {
        Self {
            code: 0,
            message: "success".to_string(),
            data: Some(data),
            meta: None,
        }
    }

    pub fn success_with_pagination(data: T, meta: PaginationMeta) -> Self {
        Self {
            code: 0,
            message: "success".to_string(),
            data: Some(data),
            meta: Some(meta),
        }
    }

    pub fn error(code: i32, message: impl Into<String>) -> ApiResponse<()> {
        ApiResponse {
            code,
            message: message.into(),
            data: None,
            meta: None,
        }
    }
}
```

---

## 5. 错误处理设计

```rust
// shared/src/error/app_error.rs

use axum::{http::StatusCode, response::IntoResponse, Json};
use thiserror::Error;

#[derive(Error, Debug)]
pub enum AppError {
    #[error("未找到资源: {0}")]
    NotFound(String),

    #[error("认证失败: {0}")]
    Unauthorized(String),

    #[error("权限不足")]
    Forbidden,

    #[error("参数校验失败: {0}")]
    ValidationError(String),

    #[error("资源已存在: {0}")]
    Conflict(String),

    #[error("请求过于频繁")]
    RateLimited,

    #[error("数据库错误: {0}")]
    DatabaseError(#[from] sea_orm::DbErr),

    #[error("Redis 错误: {0}")]
    RedisError(#[from] redis::RedisError),

    #[error("内部错误: {0}")]
    Internal(#[from] anyhow::Error),
}

impl IntoResponse for AppError {
    fn into_response(self) -> axum::response::Response {
        let (status, code, message) = match &self {
            AppError::NotFound(msg) => (StatusCode::NOT_FOUND, 404, msg.clone()),
            AppError::Unauthorized(msg) => (StatusCode::UNAUTHORIZED, 401, msg.clone()),
            AppError::Forbidden => (StatusCode::FORBIDDEN, 403, "权限不足".to_string()),
            AppError::ValidationError(msg) => (StatusCode::BAD_REQUEST, 400, msg.clone()),
            AppError::Conflict(msg) => (StatusCode::CONFLICT, 409, msg.clone()),
            AppError::RateLimited => (StatusCode::TOO_MANY_REQUESTS, 429, "请求过于频繁".to_string()),
            AppError::DatabaseError(e) => {
                tracing::error!("Database error: {:?}", e);
                (StatusCode::INTERNAL_SERVER_ERROR, 500, "服务器内部错误".to_string())
            }
            AppError::RedisError(e) => {
                tracing::error!("Redis error: {:?}", e);
                (StatusCode::INTERNAL_SERVER_ERROR, 500, "服务器内部错误".to_string())
            }
            AppError::Internal(e) => {
                tracing::error!("Internal error: {:?}", e);
                (StatusCode::INTERNAL_SERVER_ERROR, 500, "服务器内部错误".to_string())
            }
        };

        let body = serde_json::json!({
            "code": code,
            "message": message,
            "data": null::<()>,
        });

        (status, Json(body)).into_response()
    }
}
```

---

## 6. API 路由设计

### 6.1 API Gateway 路由表

```
/api/v1/
├── auth/                    → svc-user
│   ├── POST   /register     # 注册
│   ├── POST   /login        # 登录
│   ├── POST   /logout       # 登出
│   ├── POST   /refresh      # 刷新 Token
│   └── GET    /oauth/:provider  # OAuth 跳转
│
├── users/                   → svc-user
│   ├── GET    /me           # 当前用户信息
│   ├── PUT    /me           # 更新个人信息
│   ├── GET    /:username    # 用户公开信息
│   ├── POST   /:id/follow   # 关注
│   ├── DELETE /:id/follow   # 取关
│   ├── GET    /:id/followers    # 粉丝列表
│   └── GET    /:id/following    # 关注列表
│
├── articles/                → svc-content
│   ├── GET    /             # 文章列表 (分页、筛选)
│   ├── POST   /             # 发布文章
│   ├── GET    /:slug        # 文章详情
│   ├── PUT    /:id          # 更新文章
│   ├── DELETE /:id          # 删除文章
│   ├── GET    /:id/comments # 评论列表
│   └── POST   /:id/comments # 发表评论
│
├── drafts/                  → svc-content
│   ├── GET    /             # 草稿列表
│   ├── POST   /             # 保存草稿
│   ├── PUT    /:id          # 更新草稿
│   ├── DELETE /:id          # 删除草稿
│   └── POST   /:id/publish  # 发布草稿
│
├── tags/                    → svc-content
│   ├── GET    /             # 标签列表
│   ├── GET    /:slug        # 标签详情
│   └── GET    /:slug/articles   # 标签下文章
│
├── social/                  → svc-social
│   ├── POST   /like         # 点赞
│   ├── DELETE /like         # 取消点赞
│   ├── POST   /bookmark     # 收藏
│   ├── DELETE /bookmark     # 取消收藏
│   └── GET    /bookmarks    # 收藏列表
│
├── notifications/           → svc-notification
│   ├── GET    /             # 通知列表
│   ├── PUT    /:id/read     # 标记已读
│   ├── PUT    /read-all     # 全部已读
│   └── GET    /unread-count # 未读数
│
├── search/                  → svc-search
│   ├── GET    /articles     # 搜索文章
│   ├── GET    /users        # 搜索用户
│   └── GET    /tags         # 搜索标签
│
└── upload/                  → svc-upload
    ├── POST   /image        # 上传图片
    └── POST   /file         # 上传文件
```

### 6.2 服务端口约定

| 服务 | 端口 | 说明 |
|------|------|------|
| API Gateway | 8000 | 外部入口 |
| svc-user | 8001 | 用户服务 |
| svc-content | 8002 | 内容服务 |
| svc-social | 8003 | 社交服务 |
| svc-notification | 8004 | 通知服务 |
| svc-search | 8005 | 搜索服务 |
| svc-upload | 8006 | 上传服务 |

---

## 7. 服务间通信

```
┌─────────────┐   gRPC/Protobuf     ┌──────────────┐
│  Gateway    │ ──────────────────▶ │  svc-user    │
│  (Axum)     │                    │  (Tonic)     │
└──────┬──────┘                    └──────────────┘
       │
       │       gRPC/Protobuf        ┌──────────────┐
       ├───────────────────────────▶│  svc-content │
       │                            └──────┬───────┘
       │                                   │ Event (Redis Streams + Protobuf)
       │       gRPC/Protobuf        ┌──────▼───────┐
       ├───────────────────────────▶│  svc-social  │
       │                            └──────┬───────┘
       │                                   │ Event
       │       gRPC/Protobuf        ┌──────▼───────────┐
       ├───────────────────────────▶│  svc-notification │
       │                            └──────────────────┘
       │
       │       gRPC/Protobuf        ┌──────────────┐
       └───────────────────────────▶│  svc-search  │
                                    └──────────────┘
```

- **同步通信**：Gateway → 各服务之间使用 gRPC + Protobuf (Tonic)
- **前端 → Gateway**：HTTP/2 + Protobuf (Connect Protocol，兼容 gRPC)
- **异步事件**：使用 Redis Streams + Protobuf 编码实现事件驱动
  - 例：用户点赞 → svc-social 发布事件 → svc-notification 消费事件 → 推送通知
- **WebSocket**：通知推送使用 WebSocket + Protobuf 二进制消息

---

## 8. 环境配置约定

```toml
# services/svc-user/config/default.toml
[server]
host = "0.0.0.0"
port = 8001

[database]
url = "postgres://luhanxin:luhanxin@localhost:5432/luhanxin_community"
max_connections = 10
min_connections = 2

[redis]
url = "redis://localhost:6379/0"

[jwt]
secret = "your-secret-key-change-in-production"
access_token_ttl = 3600       # 1 hour
refresh_token_ttl = 2592000   # 30 days

[log]
level = "debug"
format = "pretty"             # pretty | json

# services/svc-user/config/production.toml
# 生产环境覆盖 (敏感值通过环境变量注入)
[server]
port = 8001

[database]
max_connections = 50

[log]
level = "info"
format = "json"
```
