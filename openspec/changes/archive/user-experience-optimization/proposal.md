## Why

当前平台存在三个明显的用户体验缺陷：

1. **个人中心编辑入口丢失**：UserArea 下拉菜单只有"我的主页"和"创作中心"，缺少"编辑资料"入口。`/profile` 编辑页代码完整但用户无法通过导航到达。Vue 微前端的 ProfileCard 虽有"编辑资料"链接，但 React 主应用菜单中缺失。
2. **头像只能粘贴 URL**：编辑资料表单中头像字段是纯文本输入（`<Input placeholder="https://example.com/avatar.jpg">`），用户需要自行找图床上传图片再粘贴 URL，体验极差。
3. **无暗黑模式**：CSS 变量体系已预留暗黑模式扩展点（`:root` 语义化变量 + 注释提示"后续可通过 JS 切换"），但一直没有实现。Ant Design ConfigProvider 的 `algorithm` 硬编码为 `defaultAlgorithm`。

## 非目标 (Non-goals)

- **多主题 / 自定义主题**：本次只做亮色 + 暗黑两套主题，不做自定义调色板。
- **图片 CDN / 图片处理（裁剪/压缩）**：本次只做基础文件上传到本地存储或对象存储，不做图片处理管线。
- **文章内联图片上传**：Markdown 编辑器中的图片上传是另一个独立功能，本次只覆盖头像上传和文章封面图。
- **Vue 微前端暗黑模式**：user-profile Vue 子应用的暗黑适配留到后续，本次只覆盖 React 主应用。
- **SSR / 系统主题自动跟随**：本次只做手动切换，不做 `prefers-color-scheme` 自动检测。

## 与现有设计文档的关系

- 个人中心入口修复与 `user-profile-redesign`（2026-03-30）直接相关，该次 change 创建了 UserArea 下拉菜单但遗漏了编辑入口。
- CSS 变量体系在项目规范 `styles/` 部分已有定义，暗黑模式是其自然延伸。
- 头像上传需要新增 `upload.proto`，与 `user.proto` 中的 `UpdateProfileRequest.avatar_url` 字段关联。

## What Changes

### ✏️ 个人中心入口修复
- UserArea 下拉菜单新增"编辑资料"入口，图标 `<SettingOutlined />`，导航到 `/profile`
- Vue ProfileCard 的"编辑资料"链接保持一致
- 确保 `/profile` 和 `/profile/settings` 路由正确指向 ProfileSettings

### 🖼️ 图片上传（Cloudinary）
- 新增 `upload.proto`，定义 `UploadService`（获取上传签名）
- Gateway 实现签名端点（`POST /api/v1/upload/sign`），生成 Cloudinary 上传签名
- 文件存储：Cloudinary 云服务（自带 CDN + 图片变换），通过环境变量配置 API 凭证
- 前端 `AvatarUpload` 组件：替换编辑资料表单中的文本输入，支持点击上传 + 拖拽 + 预览
- 前端直传 Cloudinary（绕过后端），减轻服务端带宽压力
- 图片校验：类型（JPEG/PNG/GIF/WebP）、大小（≤2MB）；头像自动裁剪通过 Cloudinary URL 变换实现

### 🌙 暗黑模式
- `variables.less` 新增 `[data-theme="dark"]` 暗色变量集
- 新增 `useThemeStore`（Zustand），管理当前主题 + 持久化到 localStorage
- Ant Design ConfigProvider 动态切换 `algorithm`（`defaultAlgorithm` ↔ `darkAlgorithm`）
- Header 新增主题切换按钮（太阳/月亮图标）
- 所有现有组件样式适配（确保 CSS 变量引用覆盖全面）

## Capabilities

### New Capabilities
- `image-upload`: 图片上传服务，包含 Proto 定义、Gateway 文件上传端点、本地存储、前端 AvatarUpload 组件
- `dark-mode`: 暗黑模式支持，包含暗色 CSS 变量集、主题切换 Store、Antd 算法切换、Header 切换按钮

### Modified Capabilities
- `header-user-menu`: UserArea 下拉菜单新增"编辑资料"入口 + 主题切换按钮
- `gateway-connect-protocol`: 新增文件上传 REST 端点（非 gRPC）
- `frontend-auth`: 编辑资料页需要认证状态，确保路由守卫覆盖

## Impact

### 后端
- **新增 Proto**：`upload.proto`（UploadService — 获取上传签名）
- **修改微服务**：`gateway`（新增签名端点 `POST /api/v1/upload/sign`）
- **依赖新增**：`sha1` 或 `hmac-sha1` crate（Cloudinary 签名生成）
- **配置新增**：`CLOUDINARY_CLOUD_NAME`、`CLOUDINARY_API_KEY`、`CLOUDINARY_API_SECRET` 环境变量

### 前端
- **新增组件**：AvatarUpload（图片上传预览）、ThemeToggle（主题切换按钮）
- **修改组件**：UserArea（新增菜单项）、EditProfileForm（头像字段升级）、Header（主题按钮）
- **新增 Store**：useThemeStore
- **修改样式**：variables.less（暗色变量集）、可能的组件 less 文件适配
- **修改入口**：main.tsx（ConfigProvider algorithm 动态化）

### 前端（Vue 子应用）
- ProfileCard 的"编辑资料"链接确保与 React 一致
