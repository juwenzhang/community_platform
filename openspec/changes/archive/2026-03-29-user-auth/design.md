# Design: User Authentication

## Architecture Overview

```
前端 (React)
├── 登录/注册页面
├── Zustand auth store (token + user)
└── Connect transport (自动附加 Authorization header)
        ↓
Gateway (Axum + Tonic)
├── AuthInterceptor (PreInterceptor)
│   ├── 从 metadata 提取 Bearer token
│   ├── jsonwebtoken 验证签名 + 过期
│   ├── 注入 user_id 到 ctx.attrs
│   └── 公开方法跳过认证 (Register, Login, GetUser)
└── GatewayUserService
    ├── Register → svc-user.Register (公开)
    ├── Login → svc-user.Login (公开)
    ├── GetUser → svc-user.GetUser (公开)
    └── UpdateProfile → svc-user.UpdateProfile (需认证, 透传 x-user-id)
        ↓
svc-user (Tonic + SeaORM)
├── handlers/user/auth.rs — register (bcrypt+spawn_blocking) + login (verify + JWT)
├── handlers/user/profile.rs — update_profile (从 x-user-id 获取当前用户)
└── PostgreSQL (users 表, password_hash 字段已预留)
```

## Design Decisions

### D1: JWT 库选型 — `jsonwebtoken`

**决定**: 使用 `jsonwebtoken` crate（Rust 生态最成熟的 JWT 库）。

**对比**:
- `jsonwebtoken`: 10k+ stars, 支持 HS256/RS256, API 简洁
- `jwt-simple`: 更新，但社区小
- 自己实现: 不安全，不考虑

**配置**:
- 算法: HS256（对称密钥，MVP 够用，后续可换 RS256）
- 过期时间: 7 天（`JWT_EXPIRY_HOURS` 环境变量配置）
- 密钥: `JWT_SECRET` 环境变量（生产用 ≥32 字节随机字符串）

### D2: 密码哈希 — `bcrypt`

**决定**: 使用 `bcrypt` crate。

**对比**:
- `bcrypt`: 经典，广泛使用，CPU-bound 适合认证场景
- `argon2`: 更新更安全，但配置复杂
- `scrypt`: 内存硬函数，服务器友好性不如 bcrypt

**参数**: cost = 12（默认，约 250ms/hash，防暴力破解又不至于太慢）

**重要**: bcrypt 是 CPU 密集的同步阻塞操作，必须用 `tokio::task::spawn_blocking()` 包装，不能直接在 async 上下文中调用，否则会阻塞 tokio worker thread：

```rust
let hash = tokio::task::spawn_blocking(move || bcrypt::hash(password, 12))
    .await
    .map_err(|_| Status::internal("Hash task failed"))?
    .map_err(|_| Status::internal("Password hash failed"))?;
```

### D3: 认证信息传递 — metadata 透传

**决定**: AuthInterceptor 验证 JWT 后，做两件事：
1. 把 `user_id` 写入 `ctx.attrs["user_id"]`（Gateway 内部使用）
2. **更关键的**：Gateway 转发到下游 svc-user 时，从 `ctx.attrs` 取出 `user_id`，设置到下游 request 的 metadata 中（`x-user-id` header）

这样 svc-user 可以从 request metadata 中读取 `x-user-id`，不需要自己验证 JWT——认证职责完全在 Gateway。

```rust
// Gateway 转发时注入 user_id 到下游请求
if let Some(user_id) = ctx.attrs.get("user_id") {
    let mut req = tonic::Request::new(inner);
    req.metadata_mut().insert("x-user-id", user_id.parse().unwrap());
    client.update_profile(req).await
}
```

**为什么不让 svc-user 自己验证 JWT？**
- 认证是横切关注点，应该在 Gateway 统一处理
- svc-user 不需要知道 JWT 细节（单一职责）
- 后续换认证方式（如 OAuth2）只改 Gateway，不改微服务

### D4: 公开 vs 需认证方法

**决定**: AuthInterceptor 维护一个白名单，白名单中的方法跳过认证：

```rust
const PUBLIC_METHODS: &[(&str, &str)] = &[
    ("user", "register"),
    ("user", "login"),
    ("user", "get_user"),  // 公开查看用户信息
];
```

其他所有方法默认需要认证。

### D5: Proto 扩展策略

**决定**: 在现有 `user.proto` 中扩展 `UserService`，新增 3 个 RPC 方法（不是 4 个）。

新增消息类型：
- `RegisterRequest` / `RegisterResponse`（含 token + user）
- `LoginRequest` / `LoginResponse`（含 token + user）
- `UpdateProfileRequest` / `UpdateProfileResponse`（含 user）

**不新增 `GetProfile`**：已有的 `GetUser` 是公开方法，MVP 阶段不需要区分"公开查看"和"查看自己资料"。后续如果需要返回不同粒度的数据（如邮箱只对自己可见），再用 `x-user-id` header 判断是否为本人，返回不同字段。

User 消息不变（已有所有需要的字段）。

### D6: shared/auth 模块

**决定**: JWT 签发/验证逻辑放在 `shared/src/auth/mod.rs`，而不是 svc-user 内部。

原因：Gateway 的 AuthInterceptor 需要**验证** token，svc-user 需要**签发** token。两边都用，必须放 shared。

```rust
// shared/src/auth/mod.rs
pub struct AuthConfig { secret, expiry_hours }
pub fn create_token(user_id: &str, config: &AuthConfig) -> Result<String>
pub fn verify_token(token: &str, config: &AuthConfig) -> Result<Claims>
pub struct Claims { pub sub: String, pub exp: usize }
```

### D7: 前端 Auth Store

**决定**: Zustand store 管理 token + user 状态。

```typescript
// stores/useAuthStore.ts
interface AuthState {
  token: string | null;
  user: User | null;
  isAuthenticated: boolean;
  login(username: string, password: string): Promise<void>;
  register(username: string, email: string, password: string): Promise<void>;
  logout(): void;
}
```

Token 存储在 `localStorage`，Connect transport 通过自定义 interceptor 自动附加 `Authorization: Bearer <token>` header。

### D8: 前端页面

**决定**: 新增 `pages/auth/` 页面模块（登录 + 注册合一页面，tab 切换）。

路由配置：
- `/auth` — 登录/注册页面（未登录时访问）
- `/auth` 已登录时自动跳转到 `/`

## Open Questions

1. **Token 刷新**：MVP 不做 refresh token，后续 change 加入
2. **前端路由守卫**：是放在路由配置的 `meta.auth` 中，还是用高阶组件？→ 用 `meta.auth`，与路由配置化规范一致
