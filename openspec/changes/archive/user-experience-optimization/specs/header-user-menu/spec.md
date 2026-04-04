## MODIFIED Requirements

### Requirement: Header 头像下拉菜单增强

UserArea 组件 SHALL 提供自定义下拉面板，包含用户信息卡片和功能入口：

- 使用 Ant Design `Popover` + 自定义 `content` 替代 `Dropdown`
- 面板顶部展示用户信息卡片（头像 32px + 显示名称 + @username）
- 功能入口顺序：**我的主页** → **编辑资料**（修复缺失入口）→ **创作中心** → 分隔线 → **退出登录**
- 点击头像触发，点击面板外或菜单项后关闭
- **新增**：Header 右侧新增 ThemeToggle 主题切换按钮（太阳/月亮图标）

#### Scenario: 下拉面板菜单项完整
- **WHEN** 已登录用户点击 Header 右侧头像
- **THEN** 弹出 Popover 面板，包含用户信息卡片和 4 个功能入口：👤 我的主页（`/user/:username`）→ ✏️ 编辑资料（`/profile`）→ 📝 创作中心（`/profile/manage`）→ 🚪 退出登录

#### Scenario: 编辑资料入口点击
- **WHEN** 用户点击"编辑资料"菜单项
- **THEN** 关闭面板并导航到 `/profile` 编辑资料页

#### Scenario: 未登录状态
- **WHEN** 用户未登录
- **THEN** Header 右侧显示"登录"按钮，不显示头像、通知铃铛和主题切换按钮

#### Scenario: 主题切换按钮位置
- **WHEN** 用户已登录
- **THEN** Header 右侧按顺序展示：搜索框 → ThemeToggle → UserArea 头像

#### Scenario: 主题切换按钮图标
- **WHEN** 当前主题为 `light`
- **THEN** ThemeToggle 显示 `<MoonOutlined />` 图标

#### Scenario: 主题切换按钮点击
- **WHEN** 用户点击 ThemeToggle 按钮
- **THEN** 调用 `useThemeStore.toggle()`，主题立即切换，图标同步更新
