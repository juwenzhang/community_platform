## ADDED Requirements

### Requirement: P0 安全凭据 fail-fast

安全敏感的配置项 SHALL 无默认值，缺少环境变量时服务 SHALL 拒绝启动（panic with 明确提示）。

涉及文件：
- `shared/src/database/mod.rs` — `DATABASE_URL` 不再有默认的 `postgres://luhanxin:...` 连接串
- `shared/src/auth/mod.rs` — `JWT_SECRET` 不再有默认的 `dev_jwt_secret_...`

#### Scenario: 缺少 DATABASE_URL 时服务拒绝启动

- **WHEN** 环境变量未设置 `DATABASE_URL` 且无 `.env` 文件
- **THEN** 服务启动时 panic，错误消息为 `"DATABASE_URL must be set — refusing to start with default credentials"`

#### Scenario: 缺少 JWT_SECRET 时服务拒绝启动

- **WHEN** 环境变量未设置 `JWT_SECRET`
- **THEN** 服务启动时 panic，错误消息为 `"JWT_SECRET must be set — refusing to start with default secret"`

#### Scenario: 开发环境通过 .env 文件正常启动

- **WHEN** `docker/.env` 文件包含 `DATABASE_URL` 和 `JWT_SECRET`
- **THEN** 服务正常启动，与之前行为一致

### Requirement: CORS 策略可配置化

Gateway 的 CORS 策略 SHALL 从环境变量 `CORS_ALLOWED_ORIGINS` 加载，不再使用 `AllowOrigin::any()`。

- `CORS_ALLOWED_ORIGINS` 为逗号分隔的 origin 列表
- 默认值为 `http://localhost:5173,http://localhost:5174,http://localhost:5175`（仅用于开发环境）
- `AllowMethods` 收紧为 `GET, POST, PUT, DELETE, OPTIONS`
- `AllowHeaders` 收紧为 `Content-Type, Authorization, x-grpc-web, grpc-timeout`

#### Scenario: 开发环境 CORS 正常工作

- **WHEN** 前端 `http://localhost:5173` 发送跨域请求到 Gateway
- **THEN** CORS headers 正确返回，请求不被拦截

#### Scenario: 非白名单 origin 被拒绝

- **WHEN** 来自 `http://evil.com` 的跨域请求到达 Gateway
- **THEN** CORS 预检请求失败，请求被拒绝

#### Scenario: 生产环境配置自定义 origin

- **WHEN** 设置 `CORS_ALLOWED_ORIGINS=https://community.luhanxin.com`
- **THEN** 只允许该域名的跨域请求

### Requirement: 运维常量收敛到 shared::constants

所有散落在各文件中的运维相关字符串字面量 SHALL 收敛到 `shared::constants` 模块：

- NATS Subject 前缀：`"luhanxin.events."` → `shared::constants::NATS_EVENTS_PREFIX`
- 服务名：`"svc-user"` → `shared::constants::SVC_USER`
- Metadata Key：`"x-user-id"` → `shared::constants::METADATA_USER_ID`
- 认证相关：`"authorization"` → `shared::constants::AUTH_HEADER`，`"Bearer "` → `shared::constants::BEARER_PREFIX`

#### Scenario: 修改 NATS 前缀只需改一处

- **WHEN** 需要将 NATS Subject 前缀从 `"luhanxin"` 改为 `"community"`
- **THEN** 只需修改 `shared::constants::NATS_PREFIX` 一处，所有引用自动生效

#### Scenario: 搜索代码中不再有硬编码字符串

- **WHEN** 在后端代码中搜索 `"svc-user"` 字符串字面量
- **THEN** 只出现在 `shared/src/constants.rs` 中，其他文件均引用常量

### Requirement: 业务常量命名化

业务逻辑中的魔法数字 SHALL 提取为命名常量：

- 分页：`page_size` 默认值统一为 `shared::constants::DEFAULT_PAGE_SIZE`（20），最大值为 `MAX_PAGE_SIZE`（100）
- 校验：`USERNAME_MIN_LEN`（3）、`USERNAME_MAX_LEN`（20）、`PASSWORD_MIN_LEN`（8）、`PASSWORD_MAX_LEN`（72）
- 加密：`BCRYPT_COST`（12）

#### Scenario: 分页默认值统一

- **WHEN** 前端不传 `page_size` 参数
- **THEN** 所有列表接口（文章、评论、收藏）统一使用 20 作为默认值（当前收藏接口硬编码为 50）

#### Scenario: 校验规则可快速调整

- **WHEN** 需要将密码最小长度从 8 改为 10
- **THEN** 只需修改 `shared::constants::PASSWORD_MIN_LEN` 一处

### Requirement: AppConfig 激活与完善

`shared::config::AppConfig` SHALL 被各微服务实际使用，替代各服务自定义的 `config.rs`。

- 扩展 `AppConfig` 结构体包含：`consul_url`、`nats_url`、`jwt_secret`、`cors_allowed_origins`
- 各微服务的 `config.rs` 改为扩展 `AppConfig` 或直接引用
- 端口、URL 等运行时配置通过 `AppConfig` 加载

#### Scenario: svc-user 使用 shared AppConfig

- **WHEN** svc-user 启动时加载配置
- **THEN** 使用 `shared::config::AppConfig::from_env()` 获取数据库 URL 和 gRPC 端口

#### Scenario: AppConfig 缺少必要配置时明确报错

- **WHEN** `DATABASE_URL` 环境变量未设置
- **THEN** `AppConfig::from_env()` 返回 `Err(ConfigError::Missing("DATABASE_URL"))`
