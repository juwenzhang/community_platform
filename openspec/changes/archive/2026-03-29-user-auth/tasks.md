# Tasks: User Authentication

## 0. Proto 扩展 + 代码生成

> 依赖: 无（Proto 是其他所有任务的前置）

- [x] 0.1 扩展 `user.proto`：新增 Register、Login、UpdateProfile、GetUserByUsername、ListUsers、GetCurrentUser RPC
- [x] 0.2 运行 `make proto`，生成 Rust + TypeScript 代码
- [x] 0.3 验证 `cargo check` 编译通过

## 1. Workspace 依赖更新

> 依赖: 无

- [x] 1.1 workspace 新增 `jsonwebtoken`、`bcrypt`
- [x] 1.2 shared 引入 `jsonwebtoken`
- [x] 1.3 svc-user 引入 `bcrypt`
- [x] 1.4 docker/.env 新增 `JWT_SECRET` 和 `JWT_EXPIRY_HOURS`
- [x] 1.5 验证 `cargo check` 编译通过

## 2. shared/auth — JWT 模块

> 依赖: 1.2

- [x] 2.1 创建 `shared/src/auth/mod.rs`：AuthConfig、Claims、create_token()、verify_token()
- [x] 2.2 在 `shared/src/lib.rs` 导出 auth 模块
- [x] 2.3 验证编译通过

## 3. svc-user — Register + Login handler

> 依赖: 0.2, 2.3

- [x] 3.1 创建 `svc-user/src/handlers/user/auth.rs`：register() handler（bcrypt hash via spawn_blocking + 插入 DB + 签发 JWT）
- [x] 3.2 在 auth.rs 实现 login() handler（查 DB + bcrypt verify via spawn_blocking + 签发 JWT）
- [x] 3.3 实现输入校验：用户名 3-20 字符、密码 8-72 字符含字母和数字、邮箱格式
- [x] 3.4 在 services/user/mod.rs 实现 register + login trait 方法
- [x] 3.5 错误映射：username/email 重复 → ALREADY_EXISTS，密码错误 → UNAUTHENTICATED

## 4. svc-user — 用户查询 + UpdateProfile handler

> 依赖: 3.5

- [x] 4.1 创建 `svc-user/src/handlers/user/profile.rs`：update_profile()（从 x-user-id metadata 获取当前用户）
- [x] 4.2 在 handlers/user/mod.rs 新增 get_user_by_username()、list_users()（分页 + 搜索）
- [x] 4.3 新增 get_current_user()（从 x-user-id metadata 获取）
- [x] 4.4 在 services/user/mod.rs 实现 get_user_by_username、list_users、get_current_user、update_profile trait 方法
- [x] 4.5 验证 `cargo check -p svc-user` 编译通过

## 5. Gateway — AuthInterceptor

> 依赖: 2.3

- [x] 5.1 创建 `gateway/src/interceptors/auth/mod.rs`：实现 PreInterceptor trait
- [x] 5.2 定义公开方法白名单（Register、Login、GetUser、GetUserByUsername、ListUsers）
- [x] 5.3 在 main.rs 将 AuthInterceptor 注册到 InterceptorPipeline（Log → Auth → 调用 → Log → Retry）
- [x] 5.4 验证编译通过

## 6. Gateway — 扩展 GatewayUserService 转发

> 依赖: 4.5, 5.4

- [x] 6.1 在 gateway/services/user/mod.rs 实现 register、login、get_user_by_username、list_users、get_current_user、update_profile 转发
- [x] 6.2 需认证方法（update_profile、get_current_user）从 ctx.attrs["user_id"] 取出 user_id，设到下游 request metadata x-user-id
- [ ] 6.3 更新 Swagger REST proxy（routes/user/mod.rs）添加新端点（deferred — 后续统一更新）
- [x] 6.4 验证 `cargo check` 全量编译通过

## 7. 前端 — Auth Store + Transport

> 依赖: 0.2

- [x] 7.1 创建 `apps/main/src/stores/useAuthStore.ts`（Zustand，token + user + login/register/logout）
- [x] 7.2 修改 `apps/main/src/lib/connect.ts`：添加 interceptor 自动附加 Authorization header
- [x] 7.3 验证 TypeScript 编译通过

## 8. 前端 — 登录/注册页面

> 依赖: 7.3

- [x] 8.1 创建 `apps/main/src/pages/auth/index.tsx`：Tab 切换登录/注册
- [x] 8.2 创建 LoginForm.tsx + RegisterForm.tsx 组件
- [x] 8.3 在 router/routes.tsx 添加 /auth 路由
- [x] 8.4 添加已登录重定向逻辑

## 9. 端到端验证

> 依赖: 6.4, 8.4

- [x] 9.1 后端：Register → Login → GetCurrentUser → UpdateProfile 全链路（grpcurl 验证通过）
- [x] 9.2 后端：GetUserByUsername + ListUsers 查询验证（grpcurl 验证通过）
- [x] 9.3 后端：无 token 调 UpdateProfile → UNAUTHENTICATED（grpcurl 验证通过）
- [ ] 9.4 前端：注册 → 自动登录 → 刷新页面恢复状态（deferred — 需启动前端 dev server）
- [ ] 9.5 前端：登出 → 重新登录（deferred — 需启动前端 dev server）
