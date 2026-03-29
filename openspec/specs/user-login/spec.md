## Purpose

### Requirement: 用户登录

svc-user SHALL 提供 `Login` RPC 方法，允许已注册用户通过用户名+密码登录。

- 接收 username 和 password
- 从数据库查询用户，使用 bcrypt verify 验证密码
- 验证成功后签发 JWT token 返回
- 用户不存在或密码错误统一返回相同错误（防止用户名枚举攻击）

#### Scenario: 登录成功

- **WHEN** 调用 `Login(username="alice", password="Pass123!")`，alice 已注册且密码正确
- **THEN** 返回 JWT token 和用户信息

#### Scenario: 用户名不存在

- **WHEN** 调用 `Login(username="nobody", password="xxx")`
- **THEN** 返回 gRPC `UNAUTHENTICATED`，message 为 "Invalid credentials"

#### Scenario: 密码错误

- **WHEN** 调用 `Login(username="alice", password="wrong")`
- **THEN** 返回 gRPC `UNAUTHENTICATED`，message 为 "Invalid credentials"
