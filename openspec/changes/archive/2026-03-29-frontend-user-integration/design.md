# Design: Frontend User Integration

## UI 设计方向

**借鉴掘金/CodeFather 的信息架构，但采用更现代的视觉语言。**

### 借鉴的部分（布局 + 信息结构）
- Header：左 Logo + 右用户区域的经典布局
- 个人主页：顶部资料卡 + 下方内容区的结构
- 首页：内容流 + 侧边推荐的信息层级

### 区别于掘金的现代化设计
- **卡片风格**：大圆角（12-16px）、柔和阴影、hover 微动效，而非掘金的方正硬边
- **留白**：更大的 padding 和 gap，呼吸感更强（参考 Linear、Vercel Dashboard 的留白节奏）
- **色彩**：主色 sky-500 搭配大面积白/灰底，重点信息用渐变色带强调，而非掘金的蓝白硬切
- **头像**：圆形头像 + 状态指示（在线绿点），而非掘金的方形头像
- **个人主页**：资料卡用渐变背景 banner + 浮出头像的现代排版（类似 GitHub Profile），而非掘金的平铺式
- **用户列表**：网格卡片布局（Grid），每张卡片有微妙的 hover 上浮效果，而非掘金的列表式
- **过渡动画**：页面切换和数据加载用 Skeleton 骨架屏 + fade-in，而非空白等待
- **排版**：更大的字号层级差（标题 24px / 正文 15px / 辅助 13px），信息层次更清晰

## Architecture Overview

```
apps/
├── main/          (React 18 — 主应用，承载大部分页面)
│   ├── / (首页)          → HeroBanner + 活跃用户推荐 + 快速入口占位
│   ├── /auth             → 登录/注册（已有）
│   ├── /profile          → 我的资料（React，需认证，GetCurrentUser + UpdateProfile）
│   ├── /demo             → API 测试器（React）
│   └── /article          → 占位（后续 change）
│
├── feed/          (React — 已有 Garfish 子应用)
│   └── /feed             → 社区动态
│
└── user-profile/  (Vue 3 + Naive UI — 新增 Garfish 子应用)  ← 🆕
    └── /user/:username   → 公开个人主页（纯展示，GetUserByUsername）

Layout
├── Header
│   ├── Logo + 标题
│   └── UserArea（React 全局组件）
│       ├── 已登录: Avatar + Dropdown(个人主页/登出)
│       └── 未登录: 登录按钮
├── Sider（侧边栏菜单）
└── Content → renderRoutes + AuthGuard + GarfishContainer
```

### React vs Vue 分工

| 页面 | 框架 | 理由 |
|------|------|------|
| 首页、登录/注册、我的资料、Demo | **React** | 和 auth store 强耦合，需要读写 token/user 状态 |
| 公开个人主页 `/user/:username` | **Vue 3** | 纯展示页，不依赖 React store，独立性强，正好验证 Garfish 多框架 |
| Feed 动态 | **React** | 已有子应用 |
| 管理后台（后续） | **Vue 3** | 独立用户群，独立路由体系 |

## Design Decisions

### D1: Header 用户区域组件

**决定**: 新建 `src/components/UserArea.tsx` 全局组件（在 Layout Header 中使用）。

```typescript
// src/components/UserArea.tsx
interface UserAreaProps {}

export default function UserArea({}: UserAreaProps) {
  const { isAuthenticated, user, logout } = useAuthStore();
  const navigate = useNavigate();

  if (!isAuthenticated || !user) {
    return <Button type="primary" onClick={() => navigate('/auth')}>登录</Button>;
  }

  const menuItems: MenuProps['items'] = [
    { key: 'profile', label: '个人主页', onClick: () => navigate('/profile') },
    { type: 'divider' },
    { key: 'logout', label: '登出', danger: true, onClick: logout },
  ];

  return (
    <Dropdown menu={{ items: menuItems }} placement="bottomRight">
      <Space className="cursor-pointer">
        <Avatar src={user.avatarUrl} icon={<UserOutlined />} />
        <span>{user.displayName || user.username}</span>
      </Space>
    </Dropdown>
  );
}
```

### D2: App 启动时恢复 auth 状态

**决定**: 在 `App.tsx` 的 `useEffect` 中调 `useAuthStore.restore()`。

```typescript
// App.tsx
function App() {
  const { restore } = useAuthStore();
  const [authReady, setAuthReady] = useState(false);

  useEffect(() => {
    restore().finally(() => setAuthReady(true));
  }, [restore]);

  if (!authReady) return <Loading />;
  // ... 原有的 registry init + 路由渲染
}
```

restore 流程：
1. 读 localStorage token → 有 token 才调 GetCurrentUser
2. GetCurrentUser 成功 → 设置 user 状态
3. GetCurrentUser 失败（token 过期）→ 清除 token，变为未登录
4. 无 token → 跳过，保持未登录

### D3: 路由守卫

**决定**: 在 `renderRoutes.tsx` 中，对 `meta.auth: true` 的路由包一层 `<AuthGuard>`。

```typescript
// routes/renderRoutes.tsx 中新增
import { Navigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/useAuthStore';

function AuthGuard({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuthStore();

  if (isLoading) return <Loading />;
  if (!isAuthenticated) return <Navigate to="/auth" replace />;
  return <>{children}</>;
}

// renderRoutes 中使用：
if (route.meta?.auth) {
  element = <AuthGuard>{element}</AuthGuard>;
}
```

不用高阶组件，不用路由中间件——直接在渲染器里包装，和路由配置化规范一致。

### D4: 个人主页 — React(/profile) + Vue(/user/:username)

**`/profile`（React，需认证）**：展示当前用户资料 + 编辑表单。在 main 应用内，直接读 auth store。

**`/user/:username`（Vue 3 子应用，公开）**：查看他人主页。通过 Garfish 挂载，独立构建部署。

```
apps/user-profile/          ← Vue 3 Garfish 子应用
├── package.json            @luhanxin/user-profile
├── vite.config.ts          Garfish 子应用配置
├── src/
│   ├── App.vue             根组件
│   ├── main.ts             入口（Garfish provider）
│   ├── views/
│   │   └── UserProfile.vue 主页面（GetUserByUsername）
│   ├── components/
│   │   └── ProfileCard.vue 资料卡组件（渐变 banner + 浮出头像）
│   └── lib/
│       └── connect.ts      Connect transport（独立实例，不依赖 React）
```

**为什么用 Vue 做这个页面？**
- 纯展示、无状态写入 → 不需要 React auth store
- 验证 Garfish 多框架共存能力（React 主应用 + Vue 子应用）
- 为后续 Vue 管理后台铺路（熟悉 Vue + Garfish 集成模式）
- 使用 Naive UI 组件库，和 React 的 Ant Design 有视觉差异但不冲突

### D5: 首页改造

**决定**: 首页保留 HeroBanner，下方替换为「社区用户」列表（调 ListUsers）。

展示注册用户列表，每个用户显示头像+用户名+简介，点击跳转 `/user/:username`。

### D6: Demo 页更新

**决定**: ApiTester 的默认 userId 从 `user-123`（旧 mock）改为数据库中的真实 UUID。同时更新说明文字，去掉 "Mock Data" 字样。

## Open Questions

无。所有 API 已就绪，纯前端对接工作。
