## ADDED Requirements

### Requirement: User Public Profile Page
新增 `/user/:username` 页面，展示用户公开资料。

#### Scenario: 访问用户主页
- **WHEN** 访问 `/user/zhangsan`
- **THEN** 调用 `UserService.GetUserByUsername(username: "zhangsan")` 获取用户信息
- **THEN** 展示用户头像、显示名称、用户名、简介、社交链接
- **THEN** 展示该用户发布的文章列表（`ListArticles(author_id)` 筛选已发布文章）

#### Scenario: 用户不存在
- **WHEN** 访问的用户名不存在
- **THEN** 显示「用户不存在」提示和返回首页按钮

### Requirement: Route Configuration
新增 `/user/*` 路由配置。

#### Scenario: 路由注册
- **WHEN** 应用启动
- **THEN** `/user/:username` 路由可访问
- **THEN** 该路由在菜单中隐藏（`hidden: true`）

### Requirement: User Profile Navigation
从文章卡片和详情页可跳转到作者主页。

#### Scenario: 文章详情页跳转
- **WHEN** 用户在文章详情页点击作者名字
- **THEN** 导航到 `/user/:username`

#### Scenario: 文章卡片跳转
- **WHEN** 用户在文章列表卡片点击作者名字
- **THEN** 导航到 `/user/:username`
