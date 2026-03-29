## 0. Workspace 依赖更新 + 工具安装

- [x] 0.1 安装 `sea-orm-cli`：`cargo install sea-orm-cli`（全局工具，只需装一次）
- [x] 0.2 在 `services/Cargo.toml` 的 `[workspace.dependencies]` 中新增 `sea-orm`（features: runtime-tokio-rustls, sqlx-postgres, with-uuid, with-chrono, postgres-array）和 `sea-orm-migration`
- [x] 0.3 在 `services/shared/Cargo.toml` 中引入 `sea-orm.workspace = true`
- [x] 0.4 验证 `cargo check` 编译通过

## 1. Migration Crate 搭建

> 依赖: 0.4

- [x] 1.1 创建 `services/migration/` 目录，初始化 `Cargo.toml`（依赖 `sea-orm-migration`）
- [x] 1.2 在 `services/Cargo.toml` 的 `[workspace].members` 中添加 `migration`
- [x] 1.3 创建 `migration/src/lib.rs`（导出 `Migrator`）和 `migration/src/main.rs`（CLI 入口）
- [x] 1.4 验证 `cargo run -p migration -- status` 可运行（显示无 pending migration）

## 2. 初始 Migration — Users 表

> 依赖: 1.4

- [x] 2.1 创建 `migration/src/m20260329_000001_create_users.rs`，定义 users 表 DDL（id UUID PK, username unique, email unique, password_hash, display_name, avatar_url, bio, created_at, updated_at）
- [x] 2.2 添加索引：`idx_users_username`、`idx_users_email`
- [x] 2.3 在 `lib.rs` 的 `Migrator` 中注册该 migration
- [x] 2.4 运行 `make db-migrate`，验证 users 表创建成功

## 3. 初始 Migration — Articles 表

> 依赖: 2.4

- [x] 3.1 创建 `migration/src/m20260329_000002_create_articles.rs`，定义 articles 表 DDL（id UUID PK, title, slug unique, summary, content, author_id FK→users, tags TEXT[], view_count, like_count, status SMALLINT, created_at, updated_at, published_at）
- [x] 3.2 添加索引：`idx_articles_author`、`idx_articles_slug`、`idx_articles_status`、`idx_articles_created`、`idx_articles_tags`（GIN 索引，支持数组包含查询）
- [x] 3.3 在 `lib.rs` 的 `Migrator` 中注册该 migration
- [x] 3.4 运行 `make db-migrate`，验证 articles 表创建成功（含外键约束 + GIN 索引）

## 4. Shared — 数据库连接池模块

> 依赖: 0.4

- [x] 4.1 创建 `shared/src/database/mod.rs`，定义 `DatabaseConfig`（url, max_connections, connect_timeout_secs）
- [x] 4.2 实现 `DatabaseConfig::from_env()`，从环境变量加载配置（`DATABASE_URL`、`DB_MAX_CONNECTIONS`、`DB_CONNECT_TIMEOUT`）
- [x] 4.3 实现 `connect()` 异步函数，返回 `Result<DatabaseConnection, DbErr>`
- [x] 4.4 在 `shared/src/lib.rs` 中导出 `database` 模块
- [x] 4.5 验证 `cargo check` 编译通过

## 5. Entity 代码生成

> 依赖: 3.4, 4.5

- [x] 5.1 运行 `make db-entity`，在 `shared/src/entity/` 生成 `user.rs`、`article.rs`、`mod.rs`（`--with-serde both`）
- [x] 5.2 在 `shared/src/lib.rs` 中导出 `entity` 模块
- [x] 5.3 验证 `cargo check` 编译通过，`shared::entity::user::Entity` 可用

## 6. svc-user 接入数据库

> 依赖: 5.3

- [x] 6.1 修改 `svc-user/Cargo.toml`，引入 `sea-orm.workspace = true`
- [x] 6.2 修改 `svc-user/src/main.rs`：启动时初始化数据库连接池（graceful degradation：数据库不可达时打印 error 日志但仍启动，查询时返回 UNAVAILABLE）
- [x] 6.3 修改 `svc-user/src/services/user/mod.rs`：`UserServiceImpl` 持有 `Option<DatabaseConnection>`
- [x] 6.4 修改 `svc-user/src/handlers/user/mod.rs`：`get_user()` 从 mock 改为 `User::find_by_id()` 查询
- [x] 6.5 添加 Entity → Proto 转换函数（`user::Model` → `proto::User`，含 `chrono::DateTime` → `prost_types::Timestamp`）
- [x] 6.6 处理错误映射：DB 不可用 → `UNAVAILABLE`，UUID 无效 → `INVALID_ARGUMENT`，用户不存在 → `NOT_FOUND`，DB 错误 → `INTERNAL`

## 7. 端到端验证

> 依赖: 6.6

- [x] 7.1 启动 Docker Compose + svc-user + Gateway
- [x] 7.2 手动插入一条测试用户到 PostgreSQL
- [x] 7.3 前端发送 GetUser 请求 → 验证从数据库返回真实用户数据
- [x] 7.4 查询不存在的用户 → 验证返回 NOT_FOUND
- [x] 7.5 查询无效 UUID → 验证返回 INVALID_ARGUMENT
- [x] 7.6 停止 PostgreSQL → svc-user 仍运行，查询返回 UNAVAILABLE（降级验证）
