## Why

当前所有微服务（svc-user）返回的是硬编码 mock 数据，没有持久化层。即将进入业务功能开发阶段（用户认证、文章 CRUD），每个功能都依赖数据库存储——用户密码哈希、文章内容、社交关系等。需要在业务开发前把 ORM + Migration + 连接池基础打好，避免后续每个 change 都要同时搭数据库。

Docker Compose 中 PostgreSQL 16 已运行，但后端 Rust 服务尚未连接数据库。

## What Changes

### SeaORM 集成
- `shared` crate 新增 `database` 模块，封装连接池（`sea_orm::DatabaseConnection`）
- 统一的连接配置：URL、pool_size、connect_timeout
- 连接池健康检查（ping）

### Migration 系统
- 新增 `services/migration/` crate，使用 `sea-orm-migration` 管理 schema 版本
- 初始 migration：创建 `users` 表（含 `password_hash` 字段，为 user-auth 预留）
- 初始 migration：创建 `articles` 表（含外键 `author_id → users.id`）
- Makefile 已预置 `db-migrate`/`db-reset` 等命令

### Entity 代码生成
- 从数据库 schema 自动生成 SeaORM Entity（Database-first 模式）
- Entity 放入 `shared/src/entity/`，所有微服务复用

### svc-user 接入真实数据库
- `GetUser` 从 mock 数据改为 PostgreSQL 查询
- 启动时初始化数据库连接池
- handler 层改为接收 `DatabaseConnection` 参数

### 非目标 (Non-goals)
- **不做**用户认证（注册/登录/JWT）—— 下一个 change `user-auth`
- **不做**文章 CRUD 业务逻辑 —— `article-crud` change
- **不做** Redis 缓存层 —— 后续独立 change
- **不做**数据库读写分离 —— 生产环境再考虑
- **不做** seed 数据脚本 —— 当前用手动插入或后续 change 补

## Capabilities

### New Capabilities
- `database-connection`: 数据库连接池封装（shared 模块）+ SeaORM 集成 + Entity 代码生成
- `database-migration`: Migration 系统（schema 版本化管理）+ 初始表结构（users + articles）

### Modified Capabilities
- `backend-workspace`: workspace dependencies 新增 SeaORM 相关 crate
- `backend-directory-structure`: shared crate 新增 `database/` 和 `entity/` 模块，svc-user 新增 `models/`

## Impact

### 代码变更

| 位置 | 变更 |
|------|------|
| `services/migration/` | 新增：Migration crate（独立 binary） |
| `services/shared/src/database/` | 新增：连接池封装 |
| `services/shared/src/entity/` | 新增：自动生成的 SeaORM Entity |
| `services/shared/Cargo.toml` | 新增依赖：`sea-orm` |
| `services/svc-user/src/` | 修改：handler 从 mock 改为 DB 查询 |
| `services/Cargo.toml` | 新增 workspace member：`migration`；新增依赖：`sea-orm`、`sea-orm-migration` |

### 依赖引入

| Crate | 用途 |
|-------|------|
| `sea-orm` | Async ORM（基于 sqlx，支持 PostgreSQL） |
| `sea-orm-migration` | Schema 迁移框架 |

### 与现有设计文档的关系

- **`docs/design/2026-03-20/03-backend-architecture.md`** — 第 3 节"数据层"定义了 SeaORM + PostgreSQL 的技术选型，本 change 是该设计的首次落地实现
- **`docs/design/2026-03-20/05-infrastructure.md`** — 第 1 节 Docker Compose 中 PostgreSQL 已就绪，本 change 让后端服务真正连上它
