## Why

当前的用户系统存在两个体验短板：

1. **Header 头像下拉菜单功能单薄**：现有 `UserArea` 组件只有"个人主页"和"退出登录"两项，缺少"创作中心"和"编辑资料"等高频入口，用户必须先进入个人主页再操作，路径过长。
2. **个人主页（Profile）设计简陋**："创作中心"和"编辑资料"按钮突兀地放在页面顶部，缺少社交链接展示（GitHub、微博等），ProfileCard 没有结构化的个人信息（公司/学校/职位/地点），整体与参考站点（掘金）差距较大。

同时，`User` Proto 消息目前只有 `bio` 字段，无法存储社交链接和结构化个人信息，需要扩展数据模型。

## What Changes

### Header 头像下拉菜单增强
- 扩展 `UserArea` 下拉菜单，新增：我的主页、创作中心、编辑资料、退出登录
- 下拉面板顶部显示用户头像 + 用户名 + @username 信息卡片

### Proto User 模型扩展
- `User` 消息新增字段：`company`、`location`、`website`、`social_links`（repeated SocialLink）
- 新增 `SocialLink` 消息：`platform`（github/weibo/twitter 等）+ `url`
- `UpdateProfileRequest` 同步新增对应字段

### 后端 svc-user 扩展
- `UpdateProfile` handler 支持保存新字段
- 数据库 schema 扩展（social_links 存储为 JSONB）

### Gateway 层透传
- REST Proxy 的 DTO 新增对应字段
- Swagger 文档更新

### 个人主页（Profile）重构
- **ProfileCard 重构**：头像旁展示社交链接图标（可点击跳转），下方结构化显示公司/地点/网站
- **移除顶部"创作中心""编辑资料"按钮**（已移入 Header 下拉菜单）
- **编辑资料表单增强**：新增社交链接编辑（平台选择 + URL 输入，动态增删）
- **公开个人主页** (`/user/:username`)：同步展示社交链接和结构化信息

### Vue 子应用同步
- `apps/user-profile` 同步展示新的 User 字段

## Non-goals（非目标）

- **关注/粉丝系统**：属于 `social-interaction` change
- **用户统计数据**（文章数/获赞数/阅读量）：需要聚合查询，属于独立功能
- **头像上传**：当前使用 URL 方式，文件上传属于 `file-upload` change
- **暗黑模式**：CSS 变量体系已预留，但主题切换不在本次范围

## Capabilities

### New Capabilities
- `user-social-links`: 用户社交链接系统（Proto 扩展 + 后端存储 + 前端展示/编辑）
- `header-user-menu`: Header 头像下拉菜单增强（功能入口聚合）

### Modified Capabilities
- `header-user-status`: Header 用户区域从简单的头像+名字+2 项菜单，扩展为带用户信息卡片的丰富下拉面板
- `user-registration`: UpdateProfileRequest 新增 company/location/website/social_links 字段
- `frontend-auth`: 编辑资料表单新增社交链接编辑功能

## Impact

- **Proto**: `user.proto` 新增 `SocialLink` 消息、`User` 扩展字段、`UpdateProfileRequest` 扩展
- **后端**: `svc-user` handlers 扩展字段处理，数据库 social_links 列 (JSONB)
- **Gateway**: REST Proxy DTO 更新
- **前端**: `UserArea` 组件重构、`ProfileCard` 重构、`EditProfileForm` 增强、`/user/:username` 页同步
- **Vue 子应用**: UserProfile.vue 适配新字段

## 与现有设计文档的关系

- 基于 `docs/design/2025-03-20/02-frontend-architecture.md` 的组件目录规范
- 遵循 `docs/tech/06-gateway-interceptor-pattern.md` 的拦截器模式
- Proto 扩展遵循 `docs/design/2025-03-20/01-tech-overview.md` 的 Protobuf 优先原则
