# Proposal: User Authentication

## Problem

当前平台没有用户认证系统。svc-user 只有 `GetUser` 方法，用户无法注册、登录。Gateway 的拦截器管道预留了 `attrs` 字段用于传递 `user_id`，但还没有 `AuthInterceptor` 来填充它。没有认证，后续的文章 CRUD、社交功能都无法关联"谁在操作"。

## Solution

实现完整的用户注册/登录流程 + JWT 认证：

1. **Proto 扩展** — `UserService` 新增 `Register`、`Login`、`GetProfile`、`UpdateProfile` 方法
2. **svc-user 扩展** — 注册（bcrypt hash）、登录（验证密码 + 生成 JWT）、资料查询/更新
3. **Gateway AuthInterceptor** — 从 metadata 提取 `Authorization: Bearer <token>`，验证 JWT，注入 `user_id` 到 `ctx.attrs`
4. **shared/auth 模块** — JWT 签发/验证工具，供 Gateway 和微服务共用
5. **前端** — 登录/注册页面、auth store（Zustand）、路由守卫

## What Changes

### New Capabilities
- `jwt-auth` — JWT 签发/验证模块（shared crate）
- `user-registration` — 用户注册 + 密码哈希
- `user-login` — 用户登录 + token 签发
- `auth-interceptor` — Gateway 认证拦截器
- `frontend-auth` — 前端登录/注册页面 + auth store

### Modified Capabilities
- `gateway-interceptor` — 新增 AuthInterceptor 到拦截器管道
- `database-connection` — svc-user 扩展 Register/Login/UpdateProfile handler

## Non-Goals

- OAuth2 / 第三方登录（后续 change）
- RBAC 角色权限（后续 change）
- 邮箱验证 / 找回密码（后续 change）
- Refresh Token 机制（MVP 先用单 token，后续加）
- 前端 token 自动刷新（后续 change）

## Relation to Existing Design

- `docs/design/2026-03-23/` — 架构设计中定义了 Gateway 拦截器模式，AuthInterceptor 是其中预留的占位
- `openspec/specs/gateway-interceptor/` — 拦截器 spec 已定义 `attrs` 用于传递认证信息
- `openspec/specs/database-connection/` — svc-user 的 DB 接入已完成，password_hash 字段已预留
