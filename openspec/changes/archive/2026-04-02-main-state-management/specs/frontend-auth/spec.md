## MODIFIED Requirements

### Requirement: RPC Client 集中管理

认证相关的 RPC 调用已通过 `useAuthStore` 集中管理。本次变更将此模式扩展到文章领域：EditProfileForm 中如存在直接 `createClient` 调用，SHALL 收口到对应 store。

#### Scenario: EditProfileForm 使用 useAuthStore 进行用户更新
- **WHEN** EditProfileForm 提交表单更新用户资料
- **THEN** 通过 `useAuthStore.updateUser` 更新本地状态，RPC 调用（如有直接使用）收口到 store action
