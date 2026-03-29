## Purpose

### Requirement: 前端 Auth Store

前端 SHALL 提供 Zustand auth store，管理用户认证状态。

- `token`: JWT token（持久化到 localStorage）
- `user`: 当前登录用户信息
- `isAuthenticated`: 是否已认证
- `login()`: 调用 Login RPC，保存 token 和 user
- `register()`: 调用 Register RPC，保存 token 和 user
- `logout()`: 清除 token 和 user

#### Scenario: 登录后状态更新

- **WHEN** 用户调用 `login("alice", "Pass123!")` 成功
- **THEN** `isAuthenticated` 为 true，`token` 和 `user` 已设置

#### Scenario: 刷新页面后状态恢复

- **WHEN** 页面刷新
- **THEN** 从 localStorage 恢复 token，`isAuthenticated` 为 true

#### Scenario: 登出后状态清除

- **WHEN** 用户调用 `logout()`
- **THEN** `isAuthenticated` 为 false，localStorage 中 token 被清除

### Requirement: 登录/注册页面

前端 SHALL 提供 `/auth` 页面，包含登录和注册两个 tab。

- 登录表单：用户名 + 密码
- 注册表单：用户名 + 邮箱 + 密码
- 登录/注册成功后跳转到首页
- 已登录用户访问 `/auth` 自动重定向到 `/`
- 表单验证：必填、邮箱格式、密码最少 6 位

### Requirement: Connect Transport 自动附加 Token

前端的 Connect transport SHALL 自动在每个请求的 metadata 中附加 `Authorization: Bearer <token>` header。

- 从 Zustand auth store 读取 token
- 如果 token 存在，自动附加到请求 header
- 如果 token 不存在，不附加（公开方法不需要）

#### Scenario: 已登录用户发送请求

- **WHEN** auth store 中有 token，用户发起 gRPC 请求
- **THEN** 请求自动携带 `Authorization: Bearer <token>` header
