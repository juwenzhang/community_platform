## Purpose

### Requirement: JWT 签发与验证模块

`shared` crate SHALL 提供 `auth` 模块，封装 JWT token 的签发和验证逻辑。

- `AuthConfig` 从环境变量加载（`JWT_SECRET`、`JWT_EXPIRY_HOURS`）
- `create_token(user_id)` 签发 HS256 JWT，包含 `sub`（user_id）和 `exp`（过期时间）
- `verify_token(token)` 验证签名和过期时间，返回 `Claims { sub, exp }`
- JWT_SECRET 默认值仅用于开发环境，生产必须显式设置

#### Scenario: 签发并验证 token

- **WHEN** 调用 `create_token("user-123")` 后用返回的 token 调用 `verify_token()`
- **THEN** 返回 `Claims { sub: "user-123", exp: ... }`

#### Scenario: 过期 token 验证失败

- **WHEN** token 过期后调用 `verify_token()`
- **THEN** 返回错误，不通过验证

#### Scenario: 篡改 token 验证失败

- **WHEN** 修改 token payload 后调用 `verify_token()`
- **THEN** 返回签名验证错误
