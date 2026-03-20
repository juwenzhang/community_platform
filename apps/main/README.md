# 主应用 — `apps/main/`

Luhanxin Community Platform 的 **Garfish 主应用 (Host)**，基于 React 18 + Vite + Ant Design。

## 技术栈

| 分类 | 技术 |
|------|------|
| 框架 | React 18 |
| 构建 | Vite 6 |
| 微前端 | Garfish (Host) |
| 路由 | React Router v7 |
| 状态管理 | Zustand 5 |
| UI 组件 | Ant Design 5.x + @ant-design/icons |
| 样式 | Tailwind CSS 3.4 |
| RPC | @connectrpc/connect-web + protobuf-es |
| 类型 | TypeScript 5.6 |
| 代码规范 | Biome (根目录统一配置) |

## 目录结构

```
apps/main/
├── index.html              # HTML 入口
├── package.json            # 依赖配置
├── tsconfig.json           # TypeScript 配置
├── vite.config.ts          # Vite 配置 (含 API 代理)
├── tailwind.config.ts      # Tailwind 主题配置
├── postcss.config.js       # PostCSS 配置
└── src/
    ├── main.tsx            # React 入口
    ├── index.css           # Tailwind 基础样式
    ├── App.tsx             # 路由配置
    ├── components/
    │   ├── Layout.tsx      # 主布局 (Header + Sidebar + Content)
    │   └── GarfishContainer.tsx  # 微前端子应用容器
    ├── pages/
    │   ├── HomePage.tsx    # 首页
    │   └── DemoPage.tsx    # 端到端 Demo (Gateway ↔ gRPC)
    ├── stores/
    │   └── useAuthStore.ts # Zustand 认证状态
    └── lib/
        └── connect.ts      # Connect RPC Transport 配置
```

## 快速启动

```bash
# 从项目根目录
pnpm install                      # 首次需要安装依赖
pnpm --filter @luhanxin/main dev  # 启动 dev server

# 或使用快捷命令
pnpm dev:main
```

启动后访问：**http://localhost:5173/**

## 路由表

| 路径 | 页面 | 说明 |
|------|------|------|
| `/` | HomePage | 首页 |
| `/demo` | DemoPage | 端到端 API 调试页面 |
| `/feed/*` | GarfishContainer → Feed 子应用 | 动态内容流 |
| `/article/*` | （占位） | 文章模块 |
| `/profile/*` | （占位） | 个人主页 |

## 开发命令

```bash
# 启动开发服务器 (HMR)
pnpm --filter @luhanxin/main dev

# 构建生产版本
pnpm --filter @luhanxin/main build

# 预览生产构建
pnpm --filter @luhanxin/main preview

# TypeScript 类型检查 (不输出文件)
cd apps/main && npx tsc --noEmit

# Biome 格式化 + Lint (从根目录)
pnpm lint
pnpm lint:fix
```

## API 代理配置

Vite dev server 已配置代理，将 `/api` 请求转发到 Gateway：

```typescript
// vite.config.ts
server: {
  port: 5173,
  proxy: {
    '/api': {
      target: 'http://localhost:8000',
      changeOrigin: true,
    },
  },
}
```

开发时需要确保后端 Gateway (:8000) 和 svc-user (:50051) 正在运行。

## 调试

### 浏览器 DevTools

1. 打开 `http://localhost:5173/demo`
2. 在 Network 面板观察 `/api/v1/users/xxx` 请求
3. 在 Console 查看 React 日志输出

### VS Code 调试

在 `apps/main/.vscode/launch.json` 中配置：

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "chrome",
      "request": "launch",
      "name": "Debug Main App",
      "url": "http://localhost:5173",
      "webRoot": "${workspaceFolder}/apps/main/src",
      "sourceMaps": true,
      "sourceMapPathOverrides": {
        "webpack:///src/*": "${webRoot}/*"
      }
    }
  ]
}
```

### React DevTools

安装 [React Developer Tools](https://chromewebstore.google.com/detail/react-developer-tools/fmkadmapgofadopljbjfkapdkoienihi) 浏览器扩展，查看组件树和状态。

### Garfish 调试

```javascript
// 在浏览器 Console 中查看 Garfish 信息
window.Garfish?.appInfos   // 已注册的子应用
window.Garfish?.activeApps // 当前激活的子应用
```

## 环境变量

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `VITE_API_BASE_URL` | `http://localhost:8000` | Gateway 地址 |

在 `.env.local` 中覆盖（Vite 自动加载）：

```env
VITE_API_BASE_URL=http://localhost:8000
```

## Tailwind 主题

主色调: `#0EA5E9` (sky-500)

```typescript
// tailwind.config.ts
colors: {
  primary: {
    50: '#f0f9ff',
    500: '#0ea5e9',
    600: '#0284c7',
    900: '#0c4a6e',
  }
}
```
