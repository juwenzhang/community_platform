## ADDED Requirements

### Requirement: Header 用户状态展示

Layout Header SHALL 根据认证状态展示不同的用户区域：

- 已登录：显示用户头像、显示名称、Dropdown 菜单（个人主页、登出）
- 未登录：显示「登录」按钮，点击跳转 `/auth`
- 登出操作调用 `useAuthStore.logout()`，清除 token 并刷新状态

#### Scenario: 已登录用户看到自己的头像和名称

- **WHEN** 用户已登录
- **THEN** Header 右侧显示头像 + displayName + 下拉菜单

#### Scenario: 未登录用户看到登录按钮

- **WHEN** 用户未登录
- **THEN** Header 右侧显示蓝色「登录」按钮

#### Scenario: 点击登出

- **WHEN** 用户点击 Dropdown 中的「登出」
- **THEN** token 被清除，Header 切换为未登录状态
