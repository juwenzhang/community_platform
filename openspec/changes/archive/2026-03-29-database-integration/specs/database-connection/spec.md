## ADDED Requirements

### Requirement: 数据库连接池封装

`shared` crate SHALL 提供 `database` 模块，封装 SeaORM 数据库连接池，供所有微服务复用。

- `DatabaseConfig` 从环境变量加载配置（`DATABASE_URL`、`DB_MAX_CONNECTIONS`、`DB_CONNECT_TIMEOUT`）
- `connect()` 异步函数返回 `sea_orm::DatabaseConnection`
- 连接池参数可配置：最大连接数（默认 10）、连接超时（默认 5s）
- 启用 sqlx 日志（debug 级别）

#### Scenario: 连接 PostgreSQL 成功

- **WHEN** 调用 `database::connect(&config)` 且 PostgreSQL 正常运行
- **THEN** 返回可用的 `DatabaseConnection`，可执行查询

#### Scenario: PostgreSQL 不可达时返回错误

- **WHEN** 调用 `database::connect(&config)` 但 PostgreSQL 未启动
- **THEN** 返回 `DbErr` 连接错误，不 panic

#### Scenario: 连接池限制生效

- **WHEN** `max_connections` 设为 10
- **THEN** 同时活跃的数据库连接不超过 10 个

### Requirement: SeaORM Entity 代码生成

系统 SHALL 使用 Database-first 模式，从数据库 schema 自动生成 SeaORM Entity 代码。

- Entity 存放路径：`shared/src/entity/`
- 使用 `sea-orm-cli generate entity` 命令生成
- 生成的 Entity 包含 `Serialize` + `Deserialize` derive（`--with-serde both`）
- `Makefile` 的 `db-entity` 命令封装生成流程

#### Scenario: Entity 生成后可编译

- **WHEN** 执行 `make db-entity` 后在 `services/` 目录运行 `cargo build`
- **THEN** 编译成功，Entity 类型可正常使用

#### Scenario: Entity 与数据库 schema 一致

- **WHEN** 数据库中有 `users` 和 `articles` 表
- **THEN** 生成的 Entity 包含对应的 `user::Model` 和 `article::Model`，字段与表列一一对应

### Requirement: svc-user 接入数据库

svc-user 的 `GetUser` RPC SHALL 从 PostgreSQL 查询用户数据，替代 mock 数据。

- `UserServiceImpl` 持有 `Option<DatabaseConnection>`（支持降级）
- handler 层使用 SeaORM Entity 执行查询
- 数据库不可用时返回 gRPC `UNAVAILABLE`（graceful degradation，与 Consul/NATS 策略一致）
- 用户不存在时返回 gRPC `NOT_FOUND` 状态
- UUID 格式无效时返回 gRPC `INVALID_ARGUMENT` 状态

#### Scenario: 查询存在的用户

- **WHEN** 数据库中存在 id 为 `abc-123` 的用户
- **THEN** `GetUser(user_id="abc-123")` 返回该用户完整信息

#### Scenario: 查询不存在的用户

- **WHEN** 数据库中不存在 id 为 `nonexistent` 的用户
- **THEN** `GetUser(user_id="nonexistent")` 返回 gRPC Status `NOT_FOUND`

#### Scenario: 无效的 UUID 格式

- **WHEN** 调用 `GetUser(user_id="not-a-uuid")`
- **THEN** 返回 gRPC Status `INVALID_ARGUMENT`
