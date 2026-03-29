# Tasks: Frontend User Integration

## 1. App 启动恢复 + 全局 Loading

> 依赖: 无

- [x] 1.1 修改 `App.tsx`：启动时调用 `useAuthStore.restore()`，恢复期间显示 Loading
- [x] 1.2 验证刷新页面后 auth 状态恢复正常

## 2. Header 用户区域

> 依赖: 1.1

- [x] 2.1 创建 `src/components/UserArea/`：已登录（Avatar+名称+Dropdown）/ 未登录（登录按钮）
- [x] 2.2 修改 Layout：顶栏一级路由导航 + UserArea（掘金风格）
- [x] 2.3 Dropdown 菜单：个人主页链接 + 登出操作

## 3. 路由守卫

> 依赖: 1.1

- [x] 3.1 在 `renderRoutes.tsx` 中创建 `AuthGuard` 组件（检查 meta.auth）
- [x] 3.2 未登录访问 auth 路由 → 重定向到 /auth

## 4. 个人资料页（React /profile，需认证）

> 依赖: 2.1, 3.1

- [x] 4.1 重写 `pages/profile/index.tsx` + `profile.module.less`
- [x] 4.2 创建 `pages/profile/components/ProfileCard/`：资料卡（顶部色条 + 横排信息）
- [x] 4.3 创建 `pages/profile/components/EditProfileForm/`：编辑资料表单

## 5. 公开个人主页（Vue 3 子应用 /user/:username）

> 依赖: 无（独立子应用）

- [x] 5.1 创建 `apps/user-profile/`：package.json、vite.config.ts（对齐 main/feed 优化配置）
- [x] 5.2 配置 Garfish 子应用入口（main.ts + vueBridge provider）
- [x] 5.3 创建 `views/UserProfile.vue`：嵌套 scoped style + CSS 变量
- [x] 5.4 创建 `components/ProfileCard.vue`：嵌套 scoped style + CSS 变量
- [x] 5.5 配置 Connect transport（lib/connect.ts，独立实例）
- [x] 5.6 在 main 应用注册 user-profile 子应用（registry + routes）
- [x] 5.7 GarfishContainer 修复：per-app domGetter（#garfish-app-{name}）

## 6. 首页改造

> 依赖: 无

- [x] 6.1 重写 `pages/home/index.tsx` + `home.module.less`：双栏布局
- [x] 6.2 创建 `components/HeroBanner/`：欢迎卡片（未登录显示）
- [x] 6.3 创建 `components/UserList/`：用户列表 + onLoad 回调传递 totalCount
- [x] 6.4 右侧栏：社区统计 + 技术栈标签

## 7. 样式工程化

> 依赖: 无

- [x] 7.1 创建 `src/styles/`：variables.less / reset.less / antd-overrides.less / index.less
- [x] 7.2 CSS 变量设计系统 Token（--color-primary / --color-text-* / --color-bg-* / --radius-* / --shadow-*）
- [x] 7.3 全项目 CSS → Less（安装 less@4.2.0，.module.css → .module.less）
- [x] 7.4 所有页面组件 Less Module 化（auth / profile / article / home）
- [x] 7.5 组件目录化规则（有 CSS → 目录，无 CSS → 单文件）

## 8. 清理

> 依赖: 无

- [x] 8.1 删除 Demo 页面（pages/demo/）+ 路由配置
- [x] 8.2 删除 menuFromRoutes.tsx（已无引用）
- [x] 8.3 删除旧 index.css
- [x] 8.4 删除 FeatureCard.tsx（未使用）

## 9. 基础设施修复

> 依赖: 无

- [x] 9.1 dev.sh 重写：从 .dev-registry.json 读取真实端口
- [x] 9.2 svc-user list_users：返回真实 total_count（COUNT(*) 查询）
- [x] 9.3 前端规范更新：CSS 结构规范 + Less + styles 目录 + 组件目录化
