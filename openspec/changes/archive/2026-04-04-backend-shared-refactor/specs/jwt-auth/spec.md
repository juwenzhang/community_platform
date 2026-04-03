## MODIFIED Requirements

### Requirement: JWT 签发与验证模块

`shared` crate SHALL 提供 `auth` 模块，封装 JWT token 的签发和验证逻辑。

- `AuthConfig` 从环境变量加载（`JWT_SECRET`、`JWT_EXPIRY_HOURS`）
- `create_token(user_id)` 签发 HS256 JWT，包含 `sub`（user_id）和 `exp`（过期时间）
- `verify_token(token)` 验证签名和过期时间，返回 `Claims { sub, exp }`
- **变更**：`JWT_SECRET` SHALL 无默认值。环境变量未设置时，`AuthConfig::from_env()` 返回 `Err`（或 panic），不再 fallback 到 `dev_jwt_secret_luhanxin_2024_change_in_production`
- 开发环境通过 `docker/.env` 文件提供 `JWT_SECRET`

#### Scenario: 签发并验证 token

- **WHEN** 调用 `create_token("user-123")` 后用返回的 token 调用 `verify_token()`
- **THEN** 返回 `Claims { sub: "user-123", exp: ... }`

#### Scenario: 过期 token 验证失败

- **WHEN** token 过期后调用 `verify_token()`
- **THEN** 返回错误，不通过验证

#### Scenario: 篡改 token 验证失败

- **WHEN** 修改 token payload 后调用 `verify_token()`
- **THEN** 返回签名验证错误

#### Scenario: 缺少 JWT_SECRET 时拒绝启动

- **WHEN** 环境变量未设置 `JWT_SECRET` 且无 `.env` 文件
- **THEN** `AuthConfig::from_env()` 返回错误或 panic，消息明确说明 `JWT_SECRET must be set`
