# Proposal: Frontend User Integration

## Problem

后端 UserService 已实现 7 个 RPC（Register、Login、GetUser、GetUserByUsername、ListUsers、GetCurrentUser、UpdateProfile），前端 Auth Store 和登录/注册页面也已创建，但**整个应用还没有真正对接起来**：

1. **Header 没有用户状态** — 不知道是否已登录，无法登出
2. **App 启动时没有恢复登录状态** — 刷新页面丢失 auth 状态
3. **个人主页是空壳** — 不展示真实用户信息，不支持编辑资料
4. **首页没有社区感** — 纯静态 mock，没有用户列表/活跃用户
5. **Demo 页过时** — 还在用旧的 mock userId，应该用真实 DB 数据
6. **路由守卫缺失** — `meta.auth: true` 没有实际拦截逻辑

## Solution

将前端所有页面和组件与后端 7 个 API 完整对接：

1. **Header 用户区域** — 已登录显示头像+用户名+登出按钮，未登录显示登录按钮
2. **App 启动恢复** — `App.tsx` 初始化时调用 `restore()` 恢复登录状态
3. **个人主页改造** — 展示当前用户资料 + 编辑资料表单（调 UpdateProfile）
4. **用户发现页** — 首页或独立页展示用户列表（调 ListUsers）
5. **Demo 页更新** — 用真实 UUID 测试，展示完整 DB 数据
6. **路由守卫** — `renderRoutes` 中检查 `meta.auth`，未登录重定向到 `/auth`

## What Changes

### New Capabilities
- `header-user-status` — Header 登录状态展示 + 登出
- `route-guard` — 路由守卫（meta.auth 拦截）

### Modified Capabilities
- `frontend-auth` — App 启动恢复、auth 页面微调
- 首页 / 个人主页 / Demo 页 — 对接真实 API

## Non-Goals

- 文章 CRUD 前端（留给 article-crud change）
- 用户关注/社交功能（留给 social-features change）
- 暗黑模式 / 主题切换
- 响应式移动端适配（后续优化）

## Relation to Existing Design

- `openspec/specs/frontend-auth/` — 已定义 Auth Store、登录/注册页面、Connect Transport interceptor，本次在此基础上补全 App restore 和路由守卫
- `openspec/specs/header-user-status/` — 本次新增
- `openspec/specs/route-guard/` — 本次新增
- `docs/design/2026-03-23/02-frontend-architecture.md` — 前端架构设计，Layout/路由配置化/Garfish 微前端
- 参考网站：掘金 (juejin.cn) 的首页用户推荐区、个人主页资料卡；CodeFather 的 Header 用户区域
