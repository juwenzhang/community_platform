# profile-subroutes — 个人中心子路由体系

## 概述
将 `/profile` 从单页面改为子路由模块，包含个人设置和创作中心。

## 需求

1. **profile 模块子路由**
   - `/profile` (index) → 个人设置（ProfileCard + EditProfileForm，保持现有功能）
   - `/profile/create` → 创作中心（从 `/article/create` 迁移过来）

2. **文件移动**
   - `pages/article/pages/create/` → `pages/profile/pages/create/`（含 index.tsx + manage.module.less）

3. **profile/index.tsx 重构**
   - 从单页面改为 `<Routes>` 分发子路由
   - 现有的个人设置内容抽取为 `ProfileSettings` 组件

## 验收标准
- [ ] `/profile` 展示个人设置（ProfileCard + 编辑表单 + 文章列表）
- [ ] `/profile/create` 展示创作中心（文章管理 Dashboard）
- [ ] Header 菜单"创作中心"正确指向 `/profile/create`
