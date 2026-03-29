## Context

当前后端架构（参见 `docs/design/2026-03-20/03-backend-architecture.md`）：

- **svc-user** 已实现 `GetUser` RPC，但返回硬编码 mock 数据
- **Gateway** 已集成 Consul 服务发现 + InterceptorPipeline + NATS 消息
- **Docker Compose** 中 PostgreSQL 16 已运行在 `localhost:5432`，数据库 `luhanxin_community` 已创建
- **shared** crate 已有 `discovery`、`messaging`、`proto` 等模块
- **Makefile** 已预置 `db-migrate`、`db-reset` 等命令（指向 `services/migration` crate）

需要让后端服务真正连上 PostgreSQL，从 mock 转向真实数据库查询。

## Goals / Non-Goals

**Goals:**
- shared crate 提供通用的数据库连接池封装，所有微服务复用
- 建立 Migration 系统，schema 变更版本化管理
- 创建 users 和 articles 初始表结构
- 使用 Database-first 模式自动生成 SeaORM Entity
- svc-user 的 GetUser 改为真实数据库查询

**Non-Goals:**
- 不做用户认证（注册/登录/JWT）
- 不做文章 CRUD 业务逻辑
- 不做 Redis 缓存层
- 不做数据库连接池监控/metrics
- 不做读写分离

## Decisions

### D1: ORM 选择 SeaORM

**决定**: 使用 SeaORM 作为 ORM 层。

**理由**:
- 项目技术栈已确定 SeaORM（见 workspace rules）
- 原生 async/await，基于 sqlx 连接池
- 完善的 Migration 系统（代码化、可回滚）
- Entity 代码生成（`sea-orm-cli generate entity`）
- 活跃的社区和文档

**对比**:
- Diesel：不支持 async，API 较重
- sqlx 裸写：灵活但缺少 ORM 能力（手写 SQL），Migration 需要额外工具

**Features 选择**:
- `runtime-tokio-rustls`：tokio 运行时 + rustls TLS
- `sqlx-postgres`：PostgreSQL 驱动
- `with-uuid`：UUID 类型映射
- `with-chrono`：时间类型映射（`DateTimeWithTimeZone` ↔ `chrono::DateTime`）
- `with-postgres-array`：PostgreSQL 数组类型（`TEXT[]` → `Vec<String>`）

### D2: Database-first 模式

**决定**: 先写 Migration 创建表，再用 `sea-orm-cli` 自动生成 Entity。

**理由**:
- 数据库 schema 是"唯一真相源"（与 Proto 作为 API 真相源的理念一致）
- Migration 文件可精确控制索引、约束、默认值
- Entity 自动生成，不需要手写和维护
- 对比 Entity-first：需要手写 Entity 再生成 Migration，灵活性不如直接控制 SQL

**工作流**:
```
1. 写 Migration（Rust 代码定义 DDL）
2. make db-migrate（执行 Migration）
3. make db-entity（从数据库生成 Entity 代码）
4. 微服务中使用生成的 Entity 进行查询
```

### D3: 数据库连接池封装

**决定**: 在 `shared/src/database/mod.rs` 中封装连接池，提供统一的初始化和配置。

```rust
// shared/src/database/mod.rs

pub struct DatabaseConfig {
    pub url: String,
    pub max_connections: u32,
    pub connect_timeout_secs: u64,
}

impl DatabaseConfig {
    pub fn from_env() -> Self { ... }
}

/// 初始化数据库连接池
pub async fn connect(config: &DatabaseConfig) -> Result<DatabaseConnection, DbErr> {
    let mut opt = ConnectOptions::new(&config.url);
    opt.max_connections(config.max_connections)
       .connect_timeout(Duration::from_secs(config.connect_timeout_secs))
       .sqlx_logging(true)
       .sqlx_logging_level(log::LevelFilter::Debug);
    Database::connect(opt).await
}
```

**为什么放 shared**：所有微服务连同一个 PostgreSQL 实例（开发阶段），连接池配置、初始化逻辑是通用的。

### D4: Migration Crate 设计

**决定**: `services/migration/` 作为独立的 workspace member，既是 library（供 integration test 使用）也是 binary（命令行运行迁移）。

```
services/migration/
├── Cargo.toml
└── src/
    ├── lib.rs                              # 导出 Migrator
    ├── main.rs                             # CLI 入口
    ├── m20260329_000001_create_users.rs     # users 表
    └── m20260329_000002_create_articles.rs  # articles 表
```

### D5: 初始 Schema 设计

**users 表**:

```sql
CREATE TABLE users (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username      VARCHAR(50) UNIQUE NOT NULL,
    email         VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL DEFAULT '',
    display_name  VARCHAR(100) NOT NULL DEFAULT '',
    avatar_url    TEXT NOT NULL DEFAULT '',
    bio           TEXT NOT NULL DEFAULT '',
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_email ON users(email);
```

- `password_hash` 预留给 user-auth change（默认空字符串，本次不写入）
- `id` 用 UUID 而非自增整数（分布式友好、不可预测）
- `created_at`/`updated_at` 对应 Proto 中的 `google.protobuf.Timestamp`

**articles 表**:

```sql
CREATE TABLE articles (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title         VARCHAR(255) NOT NULL,
    slug          VARCHAR(255) UNIQUE NOT NULL,
    summary       TEXT NOT NULL DEFAULT '',
    content       TEXT NOT NULL DEFAULT '',
    author_id     UUID NOT NULL REFERENCES users(id),
    tags          TEXT[] NOT NULL DEFAULT '{}',
    view_count    INTEGER NOT NULL DEFAULT 0,
    like_count    INTEGER NOT NULL DEFAULT 0,
    status        SMALLINT NOT NULL DEFAULT 0,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    published_at  TIMESTAMPTZ
);

CREATE INDEX idx_articles_author ON articles(author_id);
CREATE INDEX idx_articles_slug ON articles(slug);
CREATE INDEX idx_articles_status ON articles(status);
CREATE INDEX idx_articles_created ON articles(created_at DESC);
```

- `status` 对应 Proto 中的 `ArticleStatus` enum（0=draft, 1=published, 2=archived）
- `tags` 用 PostgreSQL 原生数组类型，查询时可用 `@>` 操作符
- `author_id` 外键关联 `users.id`

### D6: svc-user 改造策略

**决定**: 只改 handler 层，不动 service 层。

```rust
// 改造前（mock）
pub fn get_user_mock(user_id: &str) -> GetUserResponse { ... }

// 改造后（数据库查询）
pub async fn get_user(db: &DatabaseConnection, user_id: Uuid) -> Result<user::Model, AppError> {
    User::find_by_id(user_id)
        .one(db)
        .await?
        .ok_or(AppError::NotFound("user"))
}
```

Service 层（`services/user/mod.rs`）保持 `UserServiceImpl` 结构不变，只是 `new()` 时传入 `DatabaseConnection`。这就是 services/handlers 分层的价值。

### D7: Entity 与 Proto 的关系

**Entity（数据库层）和 Proto（API 层）是两套独立的类型**，通过手写转换函数映射：

```rust
// Entity → Proto
fn user_model_to_proto(model: user::Model) -> proto::User {
    proto::User {
        id: model.id.to_string(),
        username: model.username,
        email: model.email,
        display_name: model.display_name,
        avatar_url: model.avatar_url,
        bio: model.bio,
        created_at: Some(datetime_to_timestamp(model.created_at)),
        updated_at: Some(datetime_to_timestamp(model.updated_at)),
    }
}
```

**为什么不合并？**
- Proto 面向前端 API，字段命名和类型要符合 Protobuf 规范
- Entity 面向数据库，字段类型是 Rust 原生类型（`Uuid`、`DateTime<FixedOffset>`）
- Proto 中 `password_hash` 永远不暴露给前端，但 Entity 中需要

## Risks / Trade-offs

| 风险 | 缓解措施 |
|------|----------|
| PostgreSQL 连接数不够 | 默认 pool_size=10，MVP 足够；生产环境通过 PgBouncer 代理 |
| Migration 冲突（多人并行开发） | 文件名含时间戳前缀，冲突概率低；有冲突时手动 resolve |
| Entity 自动生成覆盖手动改动 | Entity 生成到 `shared/src/entity/`，不手改生成的文件；如需扩展，在生成的 Entity 上 `impl` 新方法 |
| `sea-orm-cli` 版本与 `sea-orm` 不一致 | Cargo.toml 锁定相同大版本 |
| UUID 作为主键的性能问题 | PostgreSQL 16 的 `gen_random_uuid()` 生成 v4 UUID，B-tree 索引性能可接受；如果后续有性能问题，考虑 UUIDv7（时间有序） |
