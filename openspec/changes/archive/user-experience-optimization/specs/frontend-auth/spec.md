## MODIFIED Requirements

### Requirement: RPC Client 集中管理

认证相关的 RPC 调用已通过 `useAuthStore` 集中管理。文章领域的 RPC 调用通过 `useArticleStore` 集中管理。EditProfileForm 中如存在直接 `createClient` 调用，SHALL 收口到对应 store。

#### Scenario: EditProfileForm 使用 useAuthStore 进行用户更新
- **WHEN** EditProfileForm 提交表单更新用户资料
- **THEN** 通过 `useAuthStore.updateUser` 更新本地状态，RPC 调用（如有直接使用）收口到 store action

### Requirement: 编辑资料页路由守卫

`/profile` 编辑资料页 SHALL 受 AuthGuard 保护，未登录用户不可访问。

#### Scenario: 未登录用户访问编辑资料页
- **WHEN** 未登录用户直接访问 `/profile`
- **THEN** AuthGuard 拦截并重定向到 `/auth/login`，登录后自动跳回 `/profile`

#### Scenario: 已登录用户访问编辑资料页
- **WHEN** 已登录用户点击 UserArea 菜单"编辑资料"或直接访问 `/profile`
- **THEN** 正常渲染 ProfileSettings 页面

#### Scenario: Token 过期时访问编辑资料页
- **WHEN** 用户 JWT token 已过期，访问 `/profile`
- **THEN** AuthGuard 检测到 token 无效，清除本地 token，重定向到登录页

### Requirement: 头像上传认证

AvatarUpload 组件在请求上传签名时 SHALL 携带认证 token。

#### Scenario: 上传签名请求携带 JWT
- **WHEN** AvatarUpload 组件发起 `POST /api/v1/upload/sign` 请求
- **THEN** 请求 headers 中包含 `Authorization: Bearer <token>`（从 `useAuthStore` 获取）

#### Scenario: Token 缺失时上传失败
- **WHEN** 用户 token 不存在（异常状态）且触发上传
- **THEN** 签名请求返回 401，组件提示"请重新登录"
