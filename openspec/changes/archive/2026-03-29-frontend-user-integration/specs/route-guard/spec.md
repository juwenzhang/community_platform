## ADDED Requirements

### Requirement: 路由守卫

路由渲染器 SHALL 对 `meta.auth: true` 的路由进行认证拦截。

- 已登录：正常渲染页面组件
- 未登录：重定向到 `/auth`
- 加载中（restore 进行中）：显示 Loading

#### Scenario: 未登录访问需认证页面

- **WHEN** 用户未登录，访问 `/profile`（meta.auth: true）
- **THEN** 自动重定向到 `/auth`

#### Scenario: 已登录访问需认证页面

- **WHEN** 用户已登录，访问 `/profile`
- **THEN** 正常显示个人主页
