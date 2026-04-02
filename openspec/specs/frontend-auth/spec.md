# frontend-auth

## 变更说明
创作中心路由从 `/article/create` 迁移到 `/profile/create`，AuthGuard 保护路径变更。

## 变更内容
- `/profile/*` 已有 `auth: true`，创作中心自动被 AuthGuard 保护
- 原 `/article/create` 入口不再存在
- Header 下拉菜单"创作中心"指向更新为 `/profile/create`

## Requirements

### Requirement: RPC Client 集中管理

认证相关的 RPC 调用已通过 `useAuthStore` 集中管理。文章领域的 RPC 调用通过 `useArticleStore` 集中管理。EditProfileForm 中如存在直接 `createClient` 调用，SHALL 收口到对应 store。

#### Scenario: EditProfileForm 使用 useAuthStore 进行用户更新
- **WHEN** EditProfileForm 提交表单更新用户资料
- **THEN** 通过 `useAuthStore.updateUser` 更新本地状态，RPC 调用（如有直接使用）收口到 store action
