# 前端架构设计 — 微前端 + Monorepo

> 📅 创建日期：2026-03-20
> 📌 状态：Draft — 待 Review

---

## 1. Monorepo 架构

### 1.1 pnpm workspace 配置

```yaml
# pnpm-workspace.yaml
packages:
  - 'apps/*'
  - 'packages/*'
```

### 1.2 完整目录结构

```
community_platform/
├── apps/                              # 🚀 子应用 (Garfish 微前端)
│   ├── main/                          # 主应用 (React) — Garfish 基座
│   │   ├── src/
│   │   │   ├── garfish/               # Garfish 配置与子应用注册
│   │   │   │   ├── config.ts          # 子应用注册配置 (约定自动发现)
│   │   │   │   └── loader.ts          # 自定义加载器
│   │   │   ├── layouts/               # 布局组件 (Header, Sidebar, Footer)
│   │   │   ├── components/            # 主应用级组件
│   │   │   ├── hooks/                 # 主应用级 hooks
│   │   │   ├── stores/                # Zustand 全局状态
│   │   │   ├── styles/                # 全局样式 + 主题变量
│   │   │   ├── App.tsx
│   │   │   └── main.tsx
│   │   ├── public/
│   │   ├── index.html
│   │   ├── vite.config.ts
│   │   ├── tailwind.config.ts
│   │   └── package.json
│   │
│   ├── feed/                          # Feed 流 / 首页 (React 子应用)
│   │   ├── src/
│   │   │   ├── pages/                 # 页面组件
│   │   │   │   ├── Home/              # 首页 Feed
│   │   │   │   ├── Trending/          # 热门
│   │   │   │   └── Following/         # 关注 Feed
│   │   │   ├── components/            # 子应用内组件
│   │   │   ├── hooks/
│   │   │   ├── stores/
│   │   │   └── bootstrap.tsx          # Garfish 子应用入口
│   │   ├── vite.config.ts
│   │   └── package.json
│   │
│   ├── article/                       # 文章详情 (React 子应用)
│   │   ├── src/
│   │   │   ├── pages/
│   │   │   │   ├── ArticleDetail/     # 文章详情页
│   │   │   │   └── ArticlePreview/    # 文章预览
│   │   │   ├── components/
│   │   │   │   ├── MarkdownRenderer/  # Markdown 渲染
│   │   │   │   ├── TableOfContents/   # 目录导航
│   │   │   │   ├── CommentSection/    # 评论区
│   │   │   │   └── AuthorCard/        # 作者信息卡
│   │   │   └── bootstrap.tsx
│   │   └── package.json
│   │
│   ├── editor/                        # 创作中心 (React 子应用)
│   │   ├── src/
│   │   │   ├── pages/
│   │   │   │   ├── NewArticle/        # 新建文章
│   │   │   │   ├── EditArticle/       # 编辑文章
│   │   │   │   └── DraftList/         # 草稿箱
│   │   │   ├── components/
│   │   │   │   ├── RichEditor/        # 富文本编辑器 (基于 tiptap)
│   │   │   │   ├── MarkdownEditor/    # Markdown 编辑器
│   │   │   │   ├── TagSelector/       # 标签选择器
│   │   │   │   └── CoverUploader/     # 封面上传
│   │   │   └── bootstrap.tsx
│   │   └── package.json
│   │
│   ├── profile/                       # 用户中心 (React 子应用)
│   │   ├── src/
│   │   │   ├── pages/
│   │   │   │   ├── UserProfile/       # 个人主页
│   │   │   │   ├── Settings/          # 账号设置
│   │   │   │   ├── Collections/       # 我的收藏
│   │   │   │   └── Analytics/         # 数据统计
│   │   │   └── bootstrap.tsx
│   │   └── package.json
│   │
│   ├── search/                        # 搜索/发现 (React 子应用)
│   │   ├── src/
│   │   │   ├── pages/
│   │   │   │   ├── SearchResult/      # 搜索结果
│   │   │   │   ├── TagPage/           # 标签聚合页
│   │   │   │   └── Explore/           # 探索/发现
│   │   │   └── bootstrap.tsx
│   │   └── package.json
│   │
│   └── admin/                         # 管理后台 (Vue3 子应用)
│       ├── src/
│       │   ├── views/
│       │   │   ├── Dashboard/         # 数据看板
│       │   │   ├── UserManagement/    # 用户管理
│       │   │   ├── ContentAudit/      # 内容审核
│       │   │   ├── TagManagement/     # 标签管理
│       │   │   └── SystemConfig/      # 系统配置
│       │   ├── components/
│       │   ├── stores/                # Pinia stores
│       │   ├── router/
│       │   └── bootstrap.ts           # Garfish Vue 子应用入口
│       ├── vite.config.ts
│       └── package.json
│
├── packages/                          # 📦 共享包
│   ├── shared-types/                  # TypeScript 类型定义
│   │   ├── src/
│   │   │   ├── models/                # 数据模型类型
│   │   │   │   ├── user.ts
│   │   │   │   ├── article.ts
│   │   │   │   ├── comment.ts
│   │   │   │   └── tag.ts
│   │   │   ├── api/                   # API 请求/响应类型
│   │   │   │   ├── request.ts
│   │   │   │   └── response.ts
│   │   │   └── index.ts
│   │   ├── tsconfig.json
│   │   └── package.json               # @luhanxin/shared-types
│   │
│   ├── shared-utils/                  # 工具函数库
│   │   ├── src/
│   │   │   ├── format/                # 格式化工具 (日期、数字等)
│   │   │   ├── validate/              # 校验工具
│   │   │   ├── storage/               # 本地存储封装
│   │   │   ├── env/                   # 环境判断 (PC/Mobile/OS)
│   │   │   └── index.ts
│   │   └── package.json               # @luhanxin/shared-utils
│   │
│   ├── shared-ui/                     # 共享 UI 组件 (Framework-agnostic)
│   │   ├── src/
│   │   │   ├── react/                 # React 版本组件
│   │   │   │   ├── Button/
│   │   │   │   ├── Avatar/
│   │   │   │   ├── Tag/
│   │   │   │   └── ...
│   │   │   ├── vue/                   # Vue 版本组件
│   │   │   │   ├── Button/
│   │   │   │   └── ...
│   │   │   └── styles/                # 共享样式 token
│   │   └── package.json               # @luhanxin/shared-ui
│   │
│   ├── sdk-tracker/                   # 埋点 SDK
│   │   ├── src/
│   │   │   ├── core/                  # 核心逻辑
│   │   │   │   ├── collector.ts       # 数据采集
│   │   │   │   ├── reporter.ts        # 数据上报
│   │   │   │   └── queue.ts           # 上报队列
│   │   │   ├── plugins/               # 插件化埋点
│   │   │   │   ├── pageview.ts        # PV 埋点
│   │   │   │   ├── click.ts           # 点击埋点
│   │   │   │   ├── exposure.ts        # 曝光埋点
│   │   │   │   └── performance.ts     # 性能埋点
│   │   │   └── index.ts
│   │   └── package.json               # @luhanxin/sdk-tracker
│   │
│   ├── sdk-auth/                      # 认证 SDK
│   │   ├── src/
│   │   │   ├── token.ts               # JWT Token 管理
│   │   │   ├── oauth.ts               # OAuth 流程
│   │   │   ├── guard.ts               # 路由守卫
│   │   │   └── index.ts
│   │   └── package.json               # @luhanxin/sdk-auth
│   │
│   ├── sdk-request/                   # 网络请求封装
│   │   ├── src/
│   │   │   ├── client.ts              # 请求客户端 (基于 ky/ofetch)
│   │   │   ├── interceptors/          # 拦截器
│   │   │   │   ├── auth.ts            # 自动附加 Token
│   │   │   │   ├── error.ts           # 错误统一处理
│   │   │   │   └── retry.ts           # 重试策略
│   │   │   ├── types.ts               # 请求类型
│   │   │   └── index.ts
│   │   └── package.json               # @luhanxin/sdk-request
│   │
│   ├── config-biome/                  # Biome 共享配置
│   │   ├── biome.json
│   │   └── package.json               # @luhanxin/config-biome
│   │
│   ├── config-ts/                     # TypeScript 共享配置
│   │   ├── tsconfig.base.json
│   │   ├── tsconfig.react.json
│   │   ├── tsconfig.vue.json
│   │   └── package.json               # @luhanxin/config-ts
│   │
│   └── config-vite/                   # Vite 共享配置
│       ├── src/
│       │   ├── base.ts                # 基础配置
│       │   ├── react.ts               # React 应用配置
│       │   ├── vue.ts                 # Vue 应用配置
│       │   └── garfish.ts             # Garfish 子应用配置
│       └── package.json               # @luhanxin/config-vite
│
├── biome.json                         # 根级 Biome 配置
├── cspell.json                        # cspell 配置
├── commitlint.config.ts               # commitlint 配置
├── pnpm-workspace.yaml                # pnpm workspace 配置
├── package.json                       # 根级 package.json
├── tsconfig.json                      # 根级 TypeScript 配置
├── .husky/                            # Git hooks
│   ├── pre-commit                     # biome check + cspell
│   └── commit-msg                     # commitlint
└── turbo.json                         # (可选) Turborepo 任务编排
```

---

## 2. Garfish 微前端设计

### 2.1 架构模式

```
┌──────────────────────────────────────────────────────┐
│                  Main App (基座应用)                    │
│  ┌──────────────────────────────────────────────────┐ │
│  │  Header (Logo · 搜索框 · 通知 · 用户菜单)         │ │
│  ├──────────────────────────────────────────────────┤ │
│  │  Sidebar (可选)  │  <garfish-router-container>   │ │
│  │                  │  ┌─────────────────────────┐  │ │
│  │                  │  │    子应用渲染区域          │  │ │
│  │                  │  │    (动态加载/卸载)        │  │ │
│  │                  │  └─────────────────────────┘  │ │
│  ├──────────────────────────────────────────────────┤ │
│  │  Footer                                          │ │
│  └──────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────┘
```

### 2.2 子应用注册 (约定式自动发现)

```typescript
// apps/main/src/garfish/config.ts

/**
 * 子应用注册配置
 * 约定：apps/ 下的每个目录都是一个子应用
 * 子应用入口固定为：http://<host>:<port>/garfish/
 */
interface SubAppConfig {
  name: string;
  entry: string;
  activeWhen: string;
  props?: Record<string, unknown>;
}

// 开发环境端口约定
const DEV_PORT_MAP: Record<string, number> = {
  feed: 3001,
  article: 3002,
  editor: 3003,
  profile: 3004,
  search: 3005,
  admin: 3006,
};

// 自动生成子应用配置
export const subApps: SubAppConfig[] = Object.entries(DEV_PORT_MAP).map(
  ([name, port]) => ({
    name: `@luhanxin/${name}`,
    entry: import.meta.env.DEV
      ? `http://localhost:${port}`
      : `/apps/${name}/index.html`,
    activeWhen: name === 'feed' ? '/' : `/${name}`,
  }),
);
```

### 2.3 子应用通信

```typescript
// 使用 Garfish 的 channel 机制 + 自定义事件总线
// packages/shared-utils/src/eventBus.ts

type EventHandler = (...args: unknown[]) => void;

class EventBus {
  private events = new Map<string, Set<EventHandler>>();

  on(event: string, handler: EventHandler) { /* ... */ }
  off(event: string, handler: EventHandler) { /* ... */ }
  emit(event: string, ...args: unknown[]) { /* ... */ }
}

// 全局单例，挂载到 window.__LUHANXIN_EVENT_BUS__
export const eventBus = new EventBus();
```

### 2.4 共享状态设计

```
主应用 (Main) 维护的全局状态:
├── auth          — 用户认证状态 (token, user info)
├── theme         — 主题状态 (light/dark, 主色)
├── notification  — 未读通知数
└── layout        — 布局状态 (sidebar 展开/收起)

子应用独立维护:
├── feed/stores   — Feed 列表状态、筛选条件
├── article/stores — 文章详情、评论状态
├── editor/stores  — 编辑器内容、草稿状态
└── ...
```

---

## 3. 子应用 Garfish 接入约定

### 3.1 React 子应用模板

```typescript
// apps/<name>/src/bootstrap.tsx — React 子应用入口约定

import { reactBridge } from '@garfish/bridge-react';
import App from './App';

export const provider = reactBridge({
  el: '#root',
  rootComponent: App,
  // 可选：接收主应用传递的 props
  loadRootComponent: ({ basename, dom, props }) => {
    return Promise.resolve(() => <App basename={basename} />);
  },
});

// 独立运行模式 (非微前端)
if (!window.__GARFISH__) {
  import('./standalone').then(({ mount }) => mount());
}
```

### 3.2 Vue 子应用模板

```typescript
// apps/admin/src/bootstrap.ts — Vue 子应用入口约定

import { vueBridge } from '@garfish/bridge-vue-v3';
import { createApp } from 'vue';
import { createPinia } from 'pinia';
import App from './App.vue';
import router from './router';

export const provider = vueBridge({
  rootComponent: App,
  appOptions: ({ basename }) => ({
    el: '#root',
    render: () => h(App),
  }),
  handleInstance: (vueApp, { basename }) => {
    vueApp.use(createPinia());
    vueApp.use(router(basename));
  },
});

// 独立运行模式
if (!window.__GARFISH__) {
  const app = createApp(App);
  app.use(createPinia());
  app.use(router('/admin'));
  app.mount('#app');
}
```

### 3.3 Vite 配置约定 (Garfish 子应用)

```typescript
// packages/config-vite/src/garfish.ts

import { defineConfig } from 'vite';

export function createGarfishConfig(name: string, port: number) {
  return defineConfig({
    server: {
      port,
      cors: true,
      origin: `http://localhost:${port}`,
    },
    build: {
      // Garfish 需要 UMD 格式
      lib: {
        entry: './src/bootstrap.tsx',
        name: `luhanxin_${name}`,
        formats: ['umd'],
      },
      rollupOptions: {
        external: ['react', 'react-dom'],
      },
    },
    // 静态资源路径约定
    base: import.meta.env?.DEV ? `http://localhost:${port}` : `/apps/${name}/`,
  });
}
```

---

## 4. 开发工具链

### 4.1 Biome 配置

```jsonc
// biome.json (根级)
{
  "$schema": "https://biomejs.dev/schemas/1.9.0/schema.json",
  "organizeImports": { "enabled": true },
  "formatter": {
    "enabled": true,
    "indentStyle": "space",
    "indentWidth": 2,
    "lineWidth": 100
  },
  "linter": {
    "enabled": true,
    "rules": {
      "recommended": true,
      "complexity": {
        "noExcessiveCognitiveComplexity": { "level": "warn", "options": { "maxAllowedComplexity": 15 } }
      },
      "style": {
        "noNonNullAssertion": "warn",
        "useImportType": "error"
      }
    }
  },
  "javascript": {
    "formatter": {
      "quoteStyle": "single",
      "trailingCommas": "all",
      "semicolons": "always"
    }
  },
  "vcs": {
    "enabled": true,
    "clientKind": "git",
    "useIgnoreFile": true
  }
}
```

### 4.2 commitlint 配置

```typescript
// commitlint.config.ts
export default {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'scope-enum': [
      2,
      'always',
      [
        'main', 'feed', 'article', 'editor', 'profile',
        'search', 'admin', 'shared-types', 'shared-utils',
        'shared-ui', 'sdk-tracker', 'sdk-auth', 'sdk-request',
        'gateway', 'svc-user', 'svc-content', 'svc-social',
        'svc-notification', 'svc-search', 'infra', 'docs',
      ],
    ],
    'type-enum': [
      2,
      'always',
      ['feat', 'fix', 'docs', 'style', 'refactor', 'perf', 'test', 'chore', 'ci', 'revert'],
    ],
  },
};
```

### 4.3 根级 package.json 脚本约定

```jsonc
{
  "scripts": {
    // 开发
    "dev": "pnpm -r --parallel run dev",
    "dev:main": "pnpm --filter @luhanxin/main dev",
    "dev:feed": "pnpm --filter @luhanxin/feed dev",
    "dev:admin": "pnpm --filter @luhanxin/admin dev",

    // 构建
    "build": "pnpm -r run build",
    "build:main": "pnpm --filter @luhanxin/main build",

    // 代码质量
    "check": "biome check .",
    "check:fix": "biome check --write .",
    "spell": "cspell '**/*.{ts,tsx,vue,md}'",
    "test:e2e": "playwright test",

    // 代码生成 (约定化自动生成)
    "gen:app": "node scripts/gen-app.mjs",
    "gen:component": "node scripts/gen-component.mjs",
    "gen:api": "node scripts/gen-api-client.mjs",

    // 基础设施
    "docker:up": "docker compose -f docker/docker-compose.dev.yml up -d",
    "docker:down": "docker compose -f docker/docker-compose.dev.yml down",

    // 提交前检查
    "prepare": "husky"
  }
}
```

---

## 5. 响应式适配方案

### 5.1 断点设计 (Tailwind)

```typescript
// tailwind.config.ts
export default {
  theme: {
    screens: {
      'sm': '640px',    // 手机横屏
      'md': '768px',    // 平板
      'lg': '1024px',   // 小屏电脑
      'xl': '1280px',   // 标准电脑
      '2xl': '1440px',  // 大屏
      '3xl': '1920px',  // 超大屏
    },
  },
};
```

### 5.2 布局策略

| 屏幕尺寸 | 布局方式 | 说明 |
|----------|---------|------|
| < 768px | 单列布局，底部 Tab 导航 | 移动端体验优先 |
| 768-1024px | 两列布局，可收起侧栏 | 平板适配 |
| 1024-1440px | 标准三列布局 | 左侧栏 + 主内容 + 右侧栏 |
| > 1440px | 居中容器 + max-width | 大屏不拉伸 |

---

## 6. 技术选型对比与理由

### 6.1 为什么选 Garfish 而不是 qiankun/micro-app？

| 特性 | Garfish | qiankun | micro-app |
|------|---------|---------|-----------|
| 维护方 | 字节跳动 (web-infra-dev) | 蚂蚁集团 | 京东 |
| JS 沙箱 | ✅ 快照 + Proxy | ✅ Proxy | ✅ Proxy |
| CSS 隔离 | ✅ 样式隔离 | ✅ strictStyleIsolation | ✅ shadow DOM |
| 预加载 | ✅ 智能预加载 | ✅ 手动配置 | ❌ |
| TypeScript | ✅ 原生 TS | ⚠️ 部分 | ⚠️ 部分 |
| Vite 支持 | ✅ 良好 | ⚠️ 需要配置 | ✅ 良好 |
| 插件机制 | ✅ 完善 | ❌ | ❌ |

### 6.2 为什么用 Zustand 而不是 Redux？

- **轻量**：无 boilerplate，无 action/reducer 模式
- **TypeScript 友好**：类型推断优秀
- **微前端友好**：每个 store 独立，不需要全局 Provider
- **React 18 并发模式**：原生支持 useSyncExternalStore

### 6.3 为什么用 ky / ofetch 而不是 axios？

- **更轻量**：ky ~3KB, ofetch ~2KB, axios ~15KB
- **原生 fetch**：基于标准 Fetch API，无需 polyfill
- **TypeScript 优先**：类型推断更好
- **拦截器**：ky 的 hooks 和 ofetch 的 interceptors 更简洁

---

## 7. 性能优化策略

1. **子应用预加载**：Garfish 智能预加载高频子应用
2. **共享依赖**：React、React-DOM 等通过 externals 共享，避免重复加载
3. **代码分割**：每个子应用内部按路由 lazy loading
4. **资源缓存**：静态资源 hash 命名 + 长期缓存
5. **图片优化**：WebP + 懒加载 + 响应式图片
6. **Markdown 渲染**：Web Worker + 增量渲染
7. **虚拟滚动**：Feed 列表使用 @tanstack/react-virtual
