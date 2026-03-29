## MODIFIED Requirements

### Requirement: App 启动时恢复认证状态

App 组件 SHALL 在初始化时调用 `useAuthStore.restore()`，从 localStorage token 恢复用户状态。

- 有 token：调用 GetCurrentUser RPC，恢复 user 信息
- token 过期/无效：清除 token，保持未登录状态
- 无 token：跳过，直接未登录
- 恢复期间显示全局 Loading

#### Scenario: 刷新页面后自动恢复

- **WHEN** 用户已登录后刷新页面
- **THEN** 自动调用 GetCurrentUser，Header 显示用户信息

#### Scenario: token 过期后恢复失败

- **WHEN** localStorage 中的 token 已过期
- **THEN** 清除 token，显示未登录状态
