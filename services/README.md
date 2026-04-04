# Rust 后端服务 — `services/`

> [English](./README.en.md) | 中文

Luhanxin Community Platform 的后端微服务 Workspace，基于 **Rust + Axum + Tonic gRPC + SeaORM**。

## 架构总览

```
services/
├── Cargo.toml          # Workspace 根配置（公共依赖版本、lint 规则、profile 优化）
├── shared/             # 公共库（proto 类型、config、error、auth、服务发现、NATS）
├── svc-user/           # 用户微服务 (gRPC :50051)
├── svc-content/        # 内容微服务 (gRPC :50052) — 文章、评论、社交互动
├── gateway/            # HTTP API 网关 (Axum :8000) — BFF 层 + Swagger UI
└── migration/          # 数据库迁移 (SeaORM Migration)
```

```
                          ┌──────────────────┐
  Browser (Connect RPC) ──▶│    Gateway       │ :8000
                          │  (Axum + Tonic)  │
                          │  Swagger UI      │
                          └───────┬──────────┘
                                  │ gRPC (Consul 服务发现)
                     ┌────────────┼────────────┐
                     ▼                         ▼
              ┌─────────────┐          ┌──────────────┐
              │  svc-user   │ :50051   │ svc-content  │ :50052
              │  (Tonic)    │          │  (Tonic)     │
              └──────┬──────┘          └──────┬───────┘
                     │                        │
                     ▼                        ▼
              ┌─────────────────────────────────────┐
              │         PostgreSQL + Redis           │
              │         Consul + NATS                │
              └─────────────────────────────────────┘
```

## 服务说明

### Gateway (`gateway/`)

HTTP API 网关（BFF 层），职责：
- **Connect RPC 代理**：前端 gRPC-Web 请求 → 转发到对应微服务
- **REST 端点**：文件上传签名、健康检查等非 gRPC 路由
- **拦截器管线**：认证（JWT 校验）、日志、重试等横切关注点
- **服务发现**：通过 Consul 动态解析下游服务地址
- **API 文档**：utoipa + Swagger UI（`/swagger-ui/`）

依赖：Axum 0.8, Tonic 0.14, tower-http (CORS/Trace), utoipa

### svc-user (`svc-user/`)

用户微服务，职责：
- 用户注册 / 登录（bcrypt 密码哈希 + JWT 签发）
- 用户信息 CRUD（GetUser, GetUserByUsername, UpdateProfile）
- 用户列表（搜索 + 分页）

依赖：Tonic, SeaORM, bcrypt, jsonwebtoken（通过 shared）

### svc-content (`svc-content/`)

内容微服务，职责：
- **文章 CRUD**：创建/编辑/删除/列表/详情（Markdown 内容）
- **评论系统**：二级嵌套评论 + @提及解析 + 表情（Unicode emoji）
- **社交互动**：点赞/取消点赞、收藏/取消收藏、互动状态查询
- **文章排序**：推荐（热度加权）/ 最新（时间排序）
- **NATS 事件发布**：评论、点赞、收藏等操作后发布事件

依赖：Tonic, SeaORM, regex（@mention 解析）, async-nats

### shared (`shared/`)

公共库，所有微服务共享：
- `proto/` — Protobuf 生成的 Rust 类型 + gRPC trait（prost + tonic）
- `config.rs` — 统一配置加载（从环境变量）
- `error.rs` — 通用错误类型
- `auth.rs` — JWT 验证工具
- `discovery/` — Consul 服务注册与发现
- `messaging/` — NATS 客户端封装

### migration (`migration/`)

SeaORM 数据库迁移：
- `users` 表 — 用户信息
- `articles` 表 — 文章内容
- `comments` 表 — 评论（二级嵌套）
- `likes` / `favorites` 表 — 点赞/收藏

## 先决条件

| 工具 | 版本 | 安装方式 |
|------|------|---------  |
| Rust | stable (edition 2024) | `rustup install stable` |
| cargo-watch | latest | `cargo install cargo-watch` |
| sea-orm-cli | latest | `cargo install sea-orm-cli` |
| buf | 1.x | `brew install bufbuild/buf/buf` |
| protoc-gen-prost | latest | `cargo install protoc-gen-prost` |
| protoc-gen-tonic | latest | `cargo install protoc-gen-tonic` |
| grpcurl | latest | `brew install grpcurl` |

## 快速启动

### 方式一：通过根目录 Makefile（推荐）

```bash
# 从项目根目录
make dev-infra      # 启动 Docker 基础设施
make proto          # 生成 Protobuf 代码
make db-migrate     # 运行数据库迁移
make dev-backend    # 启动所有后端服务（cargo-watch 热重载）
```

### 方式二：手动逐个启动

```bash
cd services

# 终端 1: svc-user
RUST_LOG=svc_user=info cargo watch -q -x 'run --bin svc-user'

# 终端 2: svc-content
RUST_LOG=svc_content=info cargo watch -q -x 'run --bin svc-content'

# 终端 3: gateway（需要等 svc-user + svc-content 先启动）
RUST_LOG=gateway=info cargo watch -q -x 'run --bin gateway'
```

### 验证服务

```bash
# Health Check
curl http://localhost:8000/health

# Swagger UI
open http://localhost:8000/swagger-ui/

# Consul UI（查看服务注册状态）
open http://localhost:8500

# 使用 grpcurl 直接调用 gRPC
grpcurl -plaintext -d '{"username":"testuser","password":"Test1234"}' \
  localhost:8000 luhanxin.community.v1.UserService/Login
```

## 环境变量

所有环境变量在 `docker/.env` 中配置（Makefile 自动 include）。

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `DATABASE_URL` | `postgres://luhanxin:...@localhost:5432/luhanxin_community` | PostgreSQL 连接串（**必填**） |
| `REDIS_URL` | `redis://:redis_dev_2024@localhost:6379` | Redis 连接串 |
| `MEILI_URL` | `http://localhost:7700` | Meilisearch 地址 |
| `JWT_SECRET` | `dev_jwt_secret_...` | JWT 签名密钥（**必填**） |
| `JWT_EXPIRY_HOURS` | `168` | Token 过期时间（小时） |
| `GATEWAY_PORT` | `8000` | Gateway HTTP 端口 |
| `SVC_USER_PORT` | `50051` | svc-user gRPC 端口 |
| `SVC_CONTENT_PORT` | `50052` | svc-content gRPC 端口 |
| `RUST_LOG` | `info` | 日志级别（支持 tracing 格式） |

## 常用命令

| 命令 | 说明 |
|------|------|
| `cargo build` | 编译整个 workspace |
| `cargo build --release` | Release 编译（LTO + strip） |
| `cargo run --bin svc-user` | 运行 svc-user |
| `cargo run --bin svc-content` | 运行 svc-content |
| `cargo run --bin gateway` | 运行 Gateway |
| `cargo watch -x 'run --bin <name>'` | 热重载某个服务 |
| `cargo test --all-targets` | 运行所有测试 |
| `cargo clippy --all-targets --all-features -- -D warnings` | Lint（pedantic 级别） |
| `cargo fmt --all` | 格式化 |
| `cargo doc --open` | 生成文档并打开 |
| `cargo tree -p <crate>` | 查看依赖树 |

## 数据库迁移

```bash
# 运行迁移（从根目录）
make db-migrate

# 回滚最近一次
make db-migrate-down

# 查看状态
make db-migrate-status

# 重建数据库（drop + re-migrate）
make db-migrate-fresh

# 从数据库生成 SeaORM Entity
make db-entity

# 重置数据库（drop + create + migrate）
make db-reset
```

## 日志级别

```bash
# 只看 gateway 的 debug 日志
RUST_LOG=gateway=debug cargo run --bin gateway

# 组合过滤
RUST_LOG=gateway=debug,svc_user=info,svc_content=info,tower_http=trace cargo run --bin gateway

# 全量 trace（非常详细）
RUST_LOG=trace cargo run --bin gateway
```

## Workspace 依赖版本

| 依赖 | 版本 | 用途 |
|------|------|------|
| tokio | 1.x | 异步运行时 |
| tonic | 0.14 | gRPC 框架 |
| prost | 0.14 | Protobuf 编解码 |
| axum | 0.8 | HTTP Web 框架 |
| tower-http | 0.6 | HTTP 中间件 (CORS, Tracing) |
| sea-orm | 1.x | ORM（PostgreSQL） |
| serde | 1.x | 序列化/反序列化 |
| tracing | 0.1 | 结构化日志 |
| thiserror | 2.x | 错误处理 |
| jsonwebtoken | 9.x | JWT 编解码 |
| bcrypt | 0.16 | 密码哈希 |
| async-nats | 0.38 | NATS 消息客户端 |
| reqwest | 0.12 | HTTP 客户端（Consul API） |
| utoipa | 5.x | OpenAPI 文档生成 |

## Lint 规则

Workspace 统一配置（`Cargo.toml`）：
- `unsafe_code = "forbid"` — 禁止 unsafe
- `clippy::pedantic` — 启用 pedantic 级别 lint
- `clippy::unwrap_used` / `expect_used` — warn（生产代码避免 panic）
- `clippy::todo` / `dbg_macro` — warn（不要遗留调试代码）

## 新增微服务指南

1. 创建 crate：`cargo new services/svc-xxx --name svc-xxx`
2. 将 `svc-xxx` 加入 `Cargo.toml` 的 `[workspace] members`
3. 添加 `shared = { path = "../shared" }` 和需要的 workspace 依赖
4. 在 `proto/luhanxin/community/v1/` 新建 `.proto` 文件定义 Service
5. 运行 `make proto` 生成代码
6. 实现 Service trait，启动 Tonic Server + Consul 注册
7. 在 Gateway 添加对应的路由/代理
8. 在 `docker/.env.example` 添加端口配置
