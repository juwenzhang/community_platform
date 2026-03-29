# Tasks: Frontend User Integration

## 1. App 启动恢复 + 全局 Loading

> 依赖: 无

- [x] 1.1 修改 `App.tsx`：启动时调用 `useAuthStore.restore()`，恢复期间显示 Loading
- [x] 1.2 验证刷新页面后 auth 状态恢复正常

## 2. Header 用户区域

> 依赖: 1.1

- [x] 2.1 创建 `src/components/UserArea.tsx`：已登录（Avatar+名称+Dropdown）/ 未登录（登录按钮）
- [x] 2.2 修改 `Layout.tsx`：Header 右侧集成 UserArea 组件
- [x] 2.3 Dropdown 菜单：个人主页链接 + 登出操作

## 3. 路由守卫

> 依赖: 1.1

- [x] 3.1 在 `renderRoutes.tsx` 中创建 `AuthGuard` 组件（检查 meta.auth）
- [x] 3.2 未登录访问 auth 路由 → 重定向到 /auth

## 4. 个人资料页（React /profile，需认证）

> 依赖: 2.1, 3.1

- [x] 4.1 重写 `pages/profile/index.tsx`：展示当前用户资料（GetCurrentUser）
- [x] 4.2 创建 `pages/profile/components/ProfileCard.tsx`：资料卡（渐变 banner + 浮出头像）
- [x] 4.3 创建 `pages/profile/components/EditProfileForm.tsx`：编辑资料表单（UpdateProfile）

## 5. 公开个人主页（Vue 3 子应用 /user/:username）

> 依赖: 无（独立子应用）

- [x] 5.1 创建 `apps/user-profile/` 目录：package.json、vite.config.ts、tsconfig
- [x] 5.2 配置 Garfish 子应用入口（main.ts + provider）
- [x] 5.3 创建 `views/UserProfile.vue`：调 GetUserByUsername 展示用户信息
- [x] 5.4 创建 `components/ProfileCard.vue`：渐变 banner + 浮出头像 + 用户信息（Naive UI）
- [x] 5.5 配置 Connect transport（lib/connect.ts，独立实例）
- [x] 5.6 在 main 应用注册 user-profile 子应用（registry + routes）
- [x] 5.7 验证 Garfish 挂载正常：React 主应用中访问 /user/:username 加载 Vue 子应用

## 6. 首页改造

> 依赖: 无

- [x] 6.1 重写 `pages/home/index.tsx`：双栏布局（主内容 + 侧边栏）
- [x] 6.2 左侧：HeroBanner + 占位内容卡片（文章模块即将上线）
- [x] 6.3 右侧：活跃用户推荐（UserList 组件，调 ListUsers，点击跳 /user/:username）
- [x] 6.4 右侧：社区统计卡片（用户数，从 ListUsers total_count 获取）

## 7. Demo 页更新

> 依赖: 无

- [x] 7.1 更新 ApiTester.tsx：默认 userId 改为真实 UUID，去掉 "Mock Data" 字样

## 8. 端到端验证

> 依赖: 全部

- [x] 8.1 启动前后端（make dev-backend + make dev-frontend）
- [x] 8.2 注册新用户 → 自动登录 → Header 显示用户信息
- [x] 8.3 刷新页面 → auth 状态恢复
- [x] 8.4 访问 /profile → 看到自己资料 + 编辑
- [x] 8.5 登出 → 访问 /profile → 重定向到 /auth
- [x] 8.6 首页右侧显示活跃用户 → 点击跳转 /user/:username
- [x] 8.7 /user/:username → Vue 子应用正常渲染用户公开资料
- [x] 8.8 访问 /user/nobody → 友好的 404 提示
