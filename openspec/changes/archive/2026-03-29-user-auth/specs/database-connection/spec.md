## MODIFIED Requirements

### Requirement: svc-user 扩展 RPC 方法

svc-user SHALL 扩展以下 RPC 方法：

- `Register(RegisterRequest) → RegisterResponse` — 用户注册
- `Login(LoginRequest) → LoginResponse` — 用户登录
- `UpdateProfile(UpdateProfileRequest) → UpdateProfileResponse` — 更新用户资料（需认证，通过 `x-user-id` metadata 获取当前用户）

handler 层新增：
- `handlers/user/auth.rs` — register + login 业务逻辑（bcrypt 用 spawn_blocking 包装）
- `handlers/user/profile.rs` — update_profile 业务逻辑

service 层的 `UserServiceImpl` 需新增对应的 trait 方法实现。

#### Scenario: Register RPC 端到端

- **WHEN** 前端调用 Register → Gateway 转发 → svc-user 处理
- **THEN** 返回 JWT token + 用户信息

#### Scenario: Login RPC 端到端

- **WHEN** 前端调用 Login → Gateway 转发 → svc-user 处理
- **THEN** 返回 JWT token + 用户信息

#### Scenario: UpdateProfile 需认证

- **WHEN** 无 token 调用 UpdateProfile
- **THEN** Gateway AuthInterceptor 拦截，返回 UNAUTHENTICATED
