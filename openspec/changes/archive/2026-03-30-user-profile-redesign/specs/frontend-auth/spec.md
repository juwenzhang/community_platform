# frontend-auth — Delta Spec

## 变更说明

编辑资料表单 `EditProfileForm` 扩展以支持社交链接编辑，更新语义改为全量覆盖。

## 变更内容

**EditProfileForm 扩展:**
- 新增 `company` / `location` / `website` 输入框
- 新增社交链接动态列表编辑器（平台选择 + URL 输入 + 增删）
- 表单提交改为全量发送所有字段（包括未修改的），后端全量覆盖

**ProfilePage (`/profile`) 变更:**
- 移除顶部"创作中心"和"编辑资料"按钮（已移入 Header 下拉菜单）
- ProfileCard 重构展示社交链接图标 + 结构化信息
- 保留 EditProfileForm 内联展示

**useAuthStore 扩展:**
- 新增 `updateUser` 方法：编辑资料成功后同步更新本地 user 状态

**注意（微前端）:**
- `/profile` 是 React main 应用的路由，编辑功能在这里
- `/user/:username` 是 Vue 子应用，只读展示，不包含编辑功能
- Vue 子应用中自己访问自己时显示"编辑资料"链接跳转到 `/profile`

详见 `user-social-links` spec 和 `header-user-menu` spec。
