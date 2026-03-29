# frontend-auth — Delta Spec

## 变更说明
创作中心路由从 `/article/create` 迁移到 `/profile/create`，AuthGuard 保护路径变更。

## 变更内容
- `/profile/*` 已有 `auth: true`，创作中心自动被 AuthGuard 保护
- 原 `/article/create` 入口不再存在
- Header 下拉菜单"创作中心"指向更新为 `/profile/create`
