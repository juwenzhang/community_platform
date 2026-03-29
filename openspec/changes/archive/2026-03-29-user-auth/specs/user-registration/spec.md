## ADDED Requirements

### Requirement: 用户注册

svc-user SHALL 提供 `Register` RPC 方法，允许新用户创建账号。

- 接收 username、email、password
- 密码使用 bcrypt (cost=12) 哈希后存储到 `password_hash` 字段
- username 和 email 唯一性由数据库约束保证
- 注册成功后自动签发 JWT token 返回
- display_name 默认等于 username

#### Scenario: 注册成功

- **WHEN** 调用 `Register(username="alice", email="alice@test.com", password="Pass123!")`
- **THEN** 数据库创建用户记录，返回 JWT token 和用户信息

#### Scenario: 用户名已存在

- **WHEN** 调用 `Register(username="alice", ...)` 但 alice 已注册
- **THEN** 返回 gRPC `ALREADY_EXISTS` 状态

#### Scenario: 邮箱已存在

- **WHEN** 调用 `Register(email="alice@test.com", ...)` 但该邮箱已注册
- **THEN** 返回 gRPC `ALREADY_EXISTS` 状态

#### Scenario: 密码为空

- **WHEN** 调用 `Register(password="")`
- **THEN** 返回 gRPC `INVALID_ARGUMENT` 状态
