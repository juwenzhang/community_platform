# Tasks — user-profile-redesign

## Phase 0: Proto 定义

- [x] 0.1 Proto 扩展：新增 `SocialLink` 消息，`User` 新增 company/location/website/social_links 字段，`UpdateProfileRequest` 同步扩展
- [x] 0.2 运行 `make proto` 生成 Rust + TypeScript 代码

## Phase 1: 后端 — svc-user 扩展

- [x] 1.1 数据库 schema 扩展：users 表新增 company/location/website/social_links(JSONB) 列
- [x] 1.2 更新 SeaORM Entity（`shared/src/entity/users.rs`）：新增字段映射
- [x] 1.3 svc-user 查询 handlers 扩展：GetUser/GetUserByUsername/ListUsers/GetCurrentUser 返回新字段（含 social_links JSONB → Vec<SocialLink> 反序列化）
- [x] 1.4 svc-user UpdateProfile handler 重构：全量覆盖语义（移除"空字符串=不更新"判断）+ 新字段持久化 + URL 校验 + platform 白名单 + 最多 10 条

## Phase 2: Gateway 扩展

- [x] 2.1 Gateway REST Proxy UserDto 新增 company/location/website/social_links 字段
- [x] 2.2 Gateway REST Proxy UpdateProfileDto 新增对应字段
- [x] 2.3 Swagger 文档验证

## Phase 3: 前端 — Header 下拉菜单（React main）

- [x] 3.1 重写 `UserArea`：Ant Dropdown → Ant Popover + 自定义面板
- [x] 3.2 面板内容：用户信息卡片 + 我的主页(`/user/<username>`) / 创作中心(`/article/create`) / 编辑资料(`/profile`) / 退出登录
- [x] 3.3 面板样式：Less Module + 固定宽度 + 阴影 + hover 高亮

## Phase 4: 前端 — ProfilePage 重构（React main `/profile`）

- [x] 4.1 ProfileCard 重构：社交链接图标（右上角）+ 结构化信息（公司/地点/网站）
- [x] 4.2 社交链接图标组件（`SocialIcons`）：平台 → 图标/颜色映射，点击跳转
- [x] 4.3 ProfilePage 布局优化：移除顶部"创作中心""编辑资料"按钮（已移入 Header 下拉菜单），保留 EditProfileForm 内联展示
- [x] 4.4 `useAuthStore` 新增 `updateUser` 方法：编辑资料成功后同步更新本地 user 状态

## Phase 5: 前端 — 编辑资料增强（React main）

- [x] 5.1 EditProfileForm 新增 company/location/website 输入框
- [x] 5.2 社交链接编辑器：动态列表（平台下拉 + URL 输入 + 增删），最多 10 条，URL 格式校验 + 平台域名提示
- [x] 5.3 表单初始化：打开时从 useAuthStore.user 读取所有字段完整值（含新字段，默认 ""/[]），提交时全量发送

## Phase 6: Vue 子应用 — `/user/:username` 增强

- [x] 6.1 Garfish props 通信：React main 注册子应用时传递 `getCurrentUser` 函数
- [x] 6.2 Vue 子应用接收 Garfish props，判断 `isOwner`（当前用户 username === 页面 username）
- [x] 6.3 `UserProfile.vue` ProfileCard 重构：社交链接图标 + 结构化信息（公司/地点/网站）
- [x] 6.4 自己访问自己时显示"编辑资料"链接跳转到 `/profile`
- [x] 6.5 首页 UserList 用户卡片添加链接跳转到 `/user/:username`（已有）

## Phase 7: 联调验证

- [ ] 7.1 编辑资料 → 添加社交链接 → ProfileCard 展示 → useAuthStore 同步
- [ ] 7.2 Header 下拉菜单功能入口测试（4 个入口都能正确跳转）
- [ ] 7.3 Vue `/user/:username` 公开主页展示社交链接 + 自己访问自己显示编辑入口
- [x] 7.4 apiTester.http 更新测试用例（UpdateProfile 含 social_links）
