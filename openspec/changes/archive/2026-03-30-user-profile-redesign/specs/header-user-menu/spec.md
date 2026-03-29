# header-user-menu — Header 头像下拉菜单增强

## 概述

将 Header 右侧的 `UserArea` 组件从简单的 Ant Design Dropdown 升级为自定义下拉面板，包含用户信息卡片和功能入口。

## 需求

### 下拉面板内容

1. **用户信息卡片**（面板顶部）
   - 头像（32px）+ 显示名称 + @username
   - 无需其他信息（社交链接等在个人主页展示）

2. **功能入口**
   - 👤 我的主页 → `/user/<username>`（Vue 子应用，公开主页）
   - ✏️ 创作中心 → `/article/create`（React main）
   - ⚙️ 编辑资料 → `/profile`（React main，编辑页面）
   - 分割线
   - 🚪 退出登录 → 清除 token + 跳转首页

### 交互

3. **触发方式**: 点击头像触发（不是 hover）
4. **关闭方式**: 点击面板外区域关闭、点击菜单项后关闭
5. **实现**: 使用 Ant Design `Popover` + 自定义 `content`

### 样式

6. **面板宽度**: 220px
7. **面板阴影**: box-shadow 模拟浮层
8. **菜单项**: hover 高亮，带图标，退出登录用红色

### 组件变更

9. **`components/UserArea/index.tsx` 重写**
   - 替换 `Dropdown` 为 `Popover`
   - 自定义面板内容
   - 保持未登录时的"登录"按钮不变

## 验收标准

- [ ] 点击头像弹出自定义下拉面板
- [ ] 面板包含用户信息卡片 + 4 个功能入口
- [ ] 点击外部区域关闭面板
- [ ] 退出登录正常工作
- [ ] 未登录状态显示"登录"按钮不变
