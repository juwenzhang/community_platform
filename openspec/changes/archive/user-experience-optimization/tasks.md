## Tasks

### Phase 1: Proto 定义（最高优先级）

#### Task 1: 定义 upload.proto
- [x] **完成**
- **依赖**: 无
- **描述**: 创建 `proto/luhanxin/community/v1/upload.proto`，定义 `UploadService` 及 `GetUploadSignature` RPC（Request 包含 folder 字段，Response 包含 signature、timestamp、cloud_name、api_key、folder）。运行 `make proto` 生成 Rust + TypeScript 代码。
- **验收**: `make proto` 成功，生成的代码无编译错误

### Phase 2: 编辑资料入口修复（前端优先，无后端依赖）

#### Task 2: UserArea 菜单新增"编辑资料"入口
- [x] **完成**
- **依赖**: 无
- **描述**: 修改 `apps/main/src/components/UserArea/index.tsx`，在"我的主页"和"创作中心"之间新增"编辑资料"菜单项（`<SettingOutlined />` 图标，导航到 `/profile`）。确认菜单最终顺序：我的主页 → 编辑资料 → 创作中心 → 分隔线 → 退出登录。
- **验收**: 点击"编辑资料"正确导航到 `/profile`，页面正常渲染

#### Task 3: 确认 /profile 路由守卫
- [x] **完成**
- **依赖**: Task 2
- **描述**: 验证 `/profile` 路由已有 `auth: true` 配置（AuthGuard 保护）。未登录用户访问 `/profile` 被重定向到 `/auth/login`。登录后自动跳回 `/profile`。
- **验收**: 未登录→重定向→登录→回到编辑页 流程完整

### Phase 3: 暗黑模式

#### Task 4: 暗色 CSS 变量集
- [x] **完成**
- **依赖**: 无
- **描述**: 在 `apps/main/src/styles/variables.less` 中新增 `[data-theme="dark"]` 选择器块，定义完整的暗色变量集（`--color-primary`、`--color-text-*`、`--color-bg-*`、`--color-border-*`、`--shadow-*`）。参考 design.md 中的色值方案。
- **验收**: 手动设置 `data-theme="dark"` 属性后，页面颜色正确切换

#### Task 5: useThemeStore 状态管理
- [x] **完成**
- **依赖**: 无
- **描述**: 创建 `apps/main/src/stores/useThemeStore.ts`（Zustand + persist），管理 `theme: 'light' | 'dark'`。提供 `toggle()` 方法。切换时同步更新 `document.documentElement.setAttribute('data-theme', value)` 和 `localStorage` key `luhanxin-theme`。
- **验收**: `toggle()` 正确切换主题并持久化

#### Task 6: Ant Design ConfigProvider 动态主题
- [x] **完成**
- **依赖**: Task 5
- **描述**: 修改 `apps/main/src/main.tsx`（或 App.tsx），从 `useThemeStore` 读取当前主题，动态设置 `ConfigProvider` 的 `algorithm`（`defaultAlgorithm` ↔ `darkAlgorithm`）。保持 `colorPrimary: '#1e80ff'`。
- **验收**: Antd 组件（Button、Input、Table 等）在暗黑模式下正确渲染

#### Task 7: 防闪烁内联脚本
- [x] **完成**
- **依赖**: Task 5
- **描述**: 在 `apps/main/index.html` 的 `<head>` 中添加内联 `<script>`，读取 `localStorage.getItem('luhanxin-theme')`，如果值为 `dark` 则立即设置 `document.documentElement.setAttribute('data-theme', 'dark')`。
- **验收**: 刷新页面时无亮→暗闪烁

#### Task 8: ThemeToggle 组件 + Header 集成
- [x] **完成**
- **依赖**: Task 5, Task 6
- **描述**: 创建 `apps/main/src/components/ThemeToggle.tsx`（简单组件，无独立样式文件）。亮色下显示 `<MoonOutlined />`，暗色下显示 `<SunOutlined />`。点击调用 `useThemeStore.toggle()`。修改 Header 组件，在 UserArea 左侧添加 ThemeToggle（仅登录状态显示）。
- **验收**: Header 主题切换按钮功能正常，图标正确切换

#### Task 9: 现有组件暗色适配检查
- [x] **完成**
- **依赖**: Task 4, Task 6
- **描述**: 逐一检查所有现有页面和组件在暗黑模式下的显示效果。确保所有使用 CSS 变量的地方在暗色下正确。修复可能存在的硬编码颜色值（改用 CSS 变量）。重点检查：Header、Sidebar、ArticleCard、ProfileCard、EditProfileForm、LoginForm。
- **验收**: 所有核心页面在亮色/暗色模式下视觉效果正常

### Phase 4: 图片上传（Cloudinary）

#### Task 10: Gateway Cloudinary 签名端点
- [x] **完成**
- **依赖**: Task 1
- **描述**: 在 Gateway 中新增 REST 路由 `POST /api/v1/upload/sign`。实现逻辑：验证 JWT → 读取 Cloudinary 环境变量 → 生成 SHA-1 签名（参数：timestamp + folder）→ 返回签名数据。添加 `sha1` 或 `hmac` crate 依赖。配置缺失时返回 503。
- **验收**: curl 测试签名端点返回正确签名参数

#### Task 11: AvatarUpload 前端组件
- [x] **完成**
- **依赖**: Task 10
- **描述**: 创建 `apps/main/src/components/AvatarUpload/`（目录化组件：index.tsx + avatarUpload.module.less）。实现：圆形头像预览（Cloudinary URL 变换）、点击/拖拽上传、文件类型/大小校验、请求签名 → 直传 Cloudinary → 回调 URL、loading 状态、错误提示。作为 Antd Form.Item 受控组件（value/onChange）。
- **验收**: 上传图片成功获得 Cloudinary URL，预览正确，校验正确

#### Task 12: EditProfileForm 集成 AvatarUpload
- [x] **完成**
- **依赖**: Task 11
- **描述**: 修改编辑资料表单，将头像字段从 `<Input />` 替换为 `<AvatarUpload />`。上传成功后自动填充 `avatar_url` 字段。提交表单时将 Cloudinary URL 写入用户资料（通过 `useAuthStore.updateUser`）。
- **验收**: 编辑资料页头像上传功能完整，提交后头像 URL 更新

#### Task 13: Cloudinary 环境变量配置
- [x] **完成**（已在之前的会话中配置 docker/.env + .env.example）
- **依赖**: 无
- **描述**: 在 `docker/.env.example` 中新增 `CLOUDINARY_CLOUD_NAME`、`CLOUDINARY_API_KEY`、`CLOUDINARY_API_SECRET` 占位。在 Gateway 的 `SharedConfig` 中新增 Cloudinary 配置字段（可选，缺失时 upload 端点返回 503）。
- **验收**: Gateway 启动时正确读取配置，缺失时 log warning
