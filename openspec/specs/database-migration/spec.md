## Purpose

定义数据库 schema 版本管理和初始表结构规范。

## Requirements

### Requirement: Migration Crate

系统 SHALL 提供独立的 `migration` crate 管理数据库 schema 版本。

- 位于 `services/migration/`，作为 workspace member
- 使用 `sea-orm-migration` 框架
- 支持 `up`（向上迁移）、`down`（回滚）、`status`（查看状态）、`fresh`（重建）操作
- Makefile 命令对应：`db-migrate`、`db-migrate-down`、`db-migrate-status`、`db-migrate-fresh`

#### Scenario: 执行迁移

- **WHEN** 运行 `make db-migrate`
- **THEN** 所有未执行的 migration 按顺序执行，表结构创建成功

#### Scenario: 回滚迁移

- **WHEN** 运行 `make db-migrate-down`
- **THEN** 回滚最近一次 migration

#### Scenario: 查看迁移状态

- **WHEN** 运行 `make db-migrate-status`
- **THEN** 显示每个 migration 的执行状态（applied / pending）

### Requirement: Users 表初始 Schema

系统 SHALL 创建 `users` 表，包含用户基本信息。

- 字段：id (UUID PK)、username (unique)、email (unique)、password_hash、display_name、avatar_url、bio、created_at、updated_at
- `password_hash` 字段预留给 user-auth change（默认空字符串）
- 索引：username、email
- `id` 使用 `gen_random_uuid()` 自动生成

#### Scenario: users 表创建成功

- **WHEN** 执行 `make db-migrate`
- **THEN** PostgreSQL 中存在 `users` 表，包含所有定义的字段和索引

#### Scenario: username 唯一约束

- **WHEN** 尝试插入两条相同 username 的记录
- **THEN** 数据库返回唯一约束冲突错误

### Requirement: Articles 表初始 Schema

系统 SHALL 创建 `articles` 表，包含文章基本信息。

- 字段：id (UUID PK)、title、slug (unique)、summary、content、author_id (FK → users.id)、tags (TEXT[])、view_count、like_count、status (SMALLINT)、created_at、updated_at、published_at
- `status` 对应 Proto `ArticleStatus` enum：0=draft, 1=published, 2=archived
- 索引：author_id、slug、status、created_at DESC、tags（GIN，支持数组包含查询 `@>`）
- `author_id` 外键关联 `users.id`

#### Scenario: articles 表创建成功

- **WHEN** 执行 `make db-migrate`
- **THEN** PostgreSQL 中存在 `articles` 表，包含所有定义的字段、索引和外键约束

#### Scenario: 外键约束生效

- **WHEN** 尝试插入 `author_id` 不存在于 `users` 表的文章
- **THEN** 数据库返回外键约束冲突错误
