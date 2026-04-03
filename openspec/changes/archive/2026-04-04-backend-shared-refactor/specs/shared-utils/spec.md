## ADDED Requirements

### Requirement: convert 模块 — Proto 与 Model 互转

`shared` crate SHALL 提供 `convert` 模块，封装所有 Proto message ↔ SeaORM Model 的转换函数，作为全项目唯一的转换函数来源。

- `datetime_to_timestamp(dt: &DateTimeWithTimeZone) -> Timestamp` — 时间戳转换
- `optional_datetime_to_timestamp(dt: &Option<DateTimeWithTimeZone>) -> Option<Timestamp>` — 可选时间戳转换
- `user_model_to_proto(model: &users::Model) -> User` — 用户 Model → Proto
- `article_model_to_proto(model: &articles::Model) -> Article` — 文章 Model → Proto（不含 author 字段填充）
- 模块内按子模块组织：`convert::datetime`、`convert::user`、`convert::article`
- 各微服务内的同名重复函数 SHALL 被移除，改为 `use shared::convert::*`

#### Scenario: datetime_to_timestamp 正确转换

- **WHEN** 传入 `DateTimeWithTimeZone` 值 `2026-01-15T10:30:00+08:00`
- **THEN** 返回 `Timestamp { seconds: 1736908200, nanos: 0 }`

#### Scenario: user_model_to_proto 包含所有字段

- **WHEN** 传入完整的 `users::Model`（含 display_name、avatar_url、bio 等可选字段）
- **THEN** 返回的 `User` Proto 消息包含所有字段，`None` 字段映射为空字符串

#### Scenario: 删除 svc-user 中的重复 user_model_to_proto 后编译通过

- **WHEN** `svc-user/src/handlers/user/mod.rs` 改为 `use shared::convert::user_model_to_proto`
- **THEN** 项目编译成功，行为不变

#### Scenario: 删除 svc-content 中所有重复转换函数后编译通过

- **WHEN** `svc-content` 的 article、comment、social handlers 改为引用 `shared::convert::*`
- **THEN** 项目编译成功，所有转换行为不变

### Requirement: extract 模块 — gRPC 请求工具

`shared` crate SHALL 提供 `extract` 模块，封装 gRPC 请求的通用提取操作。

- `extract_user_id(request) -> Result<String, Status>` — 强制认证场景，缺失则返回 `Unauthenticated`
- `try_extract_user_id(request) -> Option<String>` — 可选认证场景，缺失返回 `None`
- `parse_uuid(id: &str) -> Result<Uuid, Status>` — UUID 解析，失败返回 `InvalidArgument`
- `db_unavailable() -> Status` — 标准的数据库不可用错误
- 函数使用 `shared::constants::METADATA_USER_ID` 常量，不硬编码 `"x-user-id"` 字符串

#### Scenario: extract_user_id 成功提取

- **WHEN** gRPC 请求 metadata 包含 `x-user-id: abc-123`
- **THEN** `extract_user_id(&request)` 返回 `Ok("abc-123".to_string())`

#### Scenario: extract_user_id 缺失时返回 Unauthenticated

- **WHEN** gRPC 请求 metadata 不包含 `x-user-id`
- **THEN** `extract_user_id(&request)` 返回 `Err(Status::unauthenticated(...))`

#### Scenario: try_extract_user_id 缺失时返回 None

- **WHEN** gRPC 请求 metadata 不包含 `x-user-id`
- **THEN** `try_extract_user_id(&request)` 返回 `None`

#### Scenario: parse_uuid 格式无效时返回 InvalidArgument

- **WHEN** 传入 `"not-a-uuid"`
- **THEN** `parse_uuid("not-a-uuid")` 返回 `Err(Status::invalid_argument(...))`

### Requirement: constants 模块 — 编译期常量

`shared` crate SHALL 提供 `constants` 模块，集中定义所有编译期常量。

- 元数据 Key 常量：`METADATA_USER_ID`、`METADATA_REQUEST_ID`、`AUTH_HEADER`、`BEARER_PREFIX`
- NATS Subject 前缀常量：`NATS_PREFIX`、`NATS_EVENTS_PREFIX`、`NATS_RETRY_PREFIX`、`NATS_DEADLETTER_PREFIX`
- 服务名常量：`SVC_USER`、`SVC_CONTENT`
- 分页常量：`DEFAULT_PAGE_SIZE`、`MAX_PAGE_SIZE`、`MIN_PAGE_SIZE`
- 校验规则常量：`USERNAME_MIN_LEN`、`USERNAME_MAX_LEN`、`PASSWORD_MIN_LEN`、`PASSWORD_MAX_LEN`、`BCRYPT_COST`
- Consul 常量：`CONSUL_HEALTH_INTERVAL`、`CONSUL_DEREGISTER_AFTER`、`CONSUL_TAGS`
- 所有散落在代码中引用这些魔法值的地方 SHALL 改为引用常量

#### Scenario: 常量在所有 crate 中可引用

- **WHEN** `gateway` crate 引用 `shared::constants::SVC_USER`
- **THEN** 编译成功，值为 `"svc-user"`

#### Scenario: NATS Subject 使用常量拼接

- **WHEN** 事件发布代码使用 `format!("{}.{}", shared::constants::NATS_EVENTS_PREFIX, event_type)`
- **THEN** 生成的 subject 为 `"luhanxin.events.<event_type>"`，与之前硬编码行为一致
