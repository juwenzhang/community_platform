## MODIFIED Requirements

### Requirement: Header 头像下拉菜单增强

UserArea 组件 SHALL 提供自定义下拉面板，包含用户信息卡片和功能入口：

- 使用 Ant Design `Popover` + 自定义 `content` 替代 `Dropdown`
- 面板顶部展示用户信息卡片（头像 32px + 显示名称 + @username）
- 功能入口：我的主页（`/user/:username`）、编辑资料（`/profile`）、创作中心（`/profile/manage`）、退出登录
- 点击头像触发，点击面板外或菜单项后关闭
- **新增**：Header 右侧（UserArea 左侧）新增 `<NotificationBell />` 通知铃铛组件

#### Scenario: 点击头像弹出下拉面板
- **WHEN** 已登录用户点击 Header 右侧头像
- **THEN** 弹出自定义 Popover 面板，包含用户信息卡片和 4 个功能入口

#### Scenario: 未登录状态
- **WHEN** 用户未登录
- **THEN** Header 右侧显示"登录"按钮，不显示头像和通知铃铛

#### Scenario: 通知铃铛展示位置
- **WHEN** 用户已登录
- **THEN** Header 右侧按顺序展示：搜索框 → NotificationBell → UserArea 头像

#### Scenario: 通知铃铛未读指示
- **WHEN** 用户有未读通知
- **THEN** NotificationBell 图标（`<BellOutlined />`）右上角显示红色 Badge，展示未读数量

#### Scenario: 通知铃铛无未读
- **WHEN** 用户未读通知数为 0
- **THEN** NotificationBell 图标无 Badge 显示

#### Scenario: 点击通知铃铛
- **WHEN** 用户点击 NotificationBell
- **THEN** 弹出 Popover 通知列表面板，展示最近 20 条通知，面板顶部有"全部已读"按钮

#### Scenario: 点击单条通知
- **WHEN** 用户点击通知列表中的一条通知
- **THEN** 该通知标记为已读，并跳转到对应文章详情页

#### Scenario: 通知轮询
- **WHEN** 用户处于已登录状态
- **THEN** 前端每 30 秒调用 `GetUnreadCount` 更新未读计数
