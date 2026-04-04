# svc-user — 用户微服务

> [English](./README.en.md) | 中文

用户相关的 gRPC 微服务，处理注册、登录、用户信息管理。

## 职责

- 用户注册（bcrypt 密码哈希）
- 用户登录（JWT 签发）
- 用户信息查询（按 ID / 按用户名）
- 用户列表（搜索 + 分页）
- 更新用户资料（display_name、avatar_url、bio、social_links 等）
- 获取当前登录用户信息

## RPC 接口

| 方法 | 认证 | 说明 |
|------|:---:|------|
| `Register` | 公开 | 用户注册 |
| `Login` | 公开 | 用户登录 |
| `GetUser` | 公开 | 按 ID 获取用户 |
| `GetUserByUsername` | 公开 | 按用户名获取用户 |
| `ListUsers` | 公开 | 用户列表（搜索 + 分页）|
| `GetCurrentUser` | 需认证 | 获取当前登录用户 |
| `UpdateProfile` | 需认证 | 更新用户资料 |

## 端口

| 端口 | 协议 | 说明 |
|------|------|------|
| 50051 | gRPC | UserService |

## 启动

```bash
cd services && RUST_LOG=svc_user=info cargo watch -q -x 'run --bin svc-user'
```

## 数据表

- `users` — 用户信息（id, username, email, password_hash, display_name, avatar_url, bio, company, location, website, social_links, created_at, updated_at）

## 依赖

`tonic`, `sea-orm`, `bcrypt`, `jsonwebtoken`（通过 shared）, `prost`, `chrono`, `uuid`
