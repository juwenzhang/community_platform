## MODIFIED Requirements

### Requirement: 数据库连接池封装

`shared` crate SHALL 提供 `database` 模块，封装 SeaORM 数据库连接池，供所有微服务复用。

- `DatabaseConfig` 从环境变量加载配置（`DATABASE_URL`、`DB_MAX_CONNECTIONS`、`DB_CONNECT_TIMEOUT`）
- `connect()` 异步函数返回 `sea_orm::DatabaseConnection`
- 连接池参数可配置：最大连接数（默认 10）、连接超时（默认 5s）
- 启用 sqlx 日志（debug 级别）
- **变更**：`DATABASE_URL` SHALL 无默认值。环境变量未设置时，`connect()` 返回错误或 panic，不再 fallback 到 `postgres://luhanxin:luhanxin_dev_2024@localhost:5432/luhanxin_community`
- 开发环境通过 `docker/.env` 文件提供 `DATABASE_URL`

#### Scenario: 连接 PostgreSQL 成功

- **WHEN** 调用 `database::connect(&config)` 且 PostgreSQL 正常运行且 `DATABASE_URL` 已设置
- **THEN** 返回可用的 `DatabaseConnection`，可执行查询

#### Scenario: 缺少 DATABASE_URL 时拒绝连接

- **WHEN** 调用 `database::connect()` 但 `DATABASE_URL` 环境变量未设置
- **THEN** 返回明确的配置错误，消息为 `"DATABASE_URL must be set"`，不会使用硬编码凭据

#### Scenario: PostgreSQL 不可达时返回错误

- **WHEN** 调用 `database::connect(&config)` 但 PostgreSQL 未启动
- **THEN** 返回 `DbErr` 连接错误，不 panic

#### Scenario: 连接池限制生效

- **WHEN** `max_connections` 设为 10
- **THEN** 同时活跃的数据库连接不超过 10 个
