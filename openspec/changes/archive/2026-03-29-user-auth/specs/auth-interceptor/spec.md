## ADDED Requirements

### Requirement: Gateway 认证拦截器

Gateway SHALL 提供 `AuthInterceptor` 作为 `PreInterceptor`，在 RPC 调用前验证 JWT token。

- 从 gRPC metadata 提取 `authorization` header（格式：`Bearer <token>`）
- 使用 `shared::auth::verify_token()` 验证签名和过期时间
- 验证通过后将 `user_id` 写入 `ctx.attrs["user_id"]`
- 公开方法（Register、Login、GetUser）跳过认证
- token 缺失或无效时返回 gRPC `UNAUTHENTICATED`

#### Scenario: 携带有效 token 访问需认证方法

- **WHEN** 请求 metadata 包含有效的 `Authorization: Bearer <token>`
- **THEN** `ctx.attrs["user_id"]` 被设置为 token 中的 user_id，请求继续

#### Scenario: 无 token 访问需认证方法

- **WHEN** 请求 metadata 没有 `authorization` header，且方法不在白名单中
- **THEN** 返回 gRPC `UNAUTHENTICATED`，message 为 "Missing authorization token"

#### Scenario: 无效 token

- **WHEN** 请求 metadata 包含过期或篡改的 token
- **THEN** 返回 gRPC `UNAUTHENTICATED`，message 为 "Invalid or expired token"

#### Scenario: 公开方法无需 token

- **WHEN** 调用 Register 或 Login 方法，无 token
- **THEN** 请求正常通过，不返回 UNAUTHENTICATED
