## ADDED Requirements

### Requirement: pnpm Workspace 结构

系统 SHALL 在项目根目录创建 pnpm Monorepo 结构：

```
community_platform/
├── package.json                 # root（scripts + devDependencies）
├── pnpm-workspace.yaml          # workspace 配置
├── pnpm-lock.yaml
├── apps/
│   ├── main/                    # Garfish 主应用
│   │   ├── package.json         # @luhanxin/main
│   │   ├── vite.config.ts
│   │   ├── tsconfig.json
│   │   ├── index.html
│   │   └── src/
│   └── feed/                    # Feed 子应用
│       ├── package.json         # @luhanxin/feed
│       ├── vite.config.ts
│       ├── tsconfig.json
│       └── src/
└── packages/
    └── shared-types/            # Protobuf 生成类型
        ├── package.json         # @luhanxin/shared-types
        ├── tsconfig.json
        └── src/proto/           # buf generate 输出目标
```

#### Scenario: pnpm install 成功
- **WHEN** 在项目根目录运行 `pnpm install`
- **THEN** 所有 workspace 包安装成功，无错误

#### Scenario: Workspace 包可相互引用
- **WHEN** `apps/main/` 在 `package.json` 中依赖 `@luhanxin/shared-types: workspace:*`
- **THEN** 可以在代码中 `import { User } from '@luhanxin/shared-types'`

### Requirement: Garfish 主应用骨架

`apps/main/` SHALL 是 Garfish 微前端主应用，基于 React 18 + Vite + TypeScript，包含：
- 全局 Layout（Header + Sidebar + Content 区域）
- React Router 路由配置（`/`、`/feed/*`、`/article/*`、`/profile/*`）
- Garfish 初始化，注册 Feed 子应用
- Zustand 全局状态 store 骨架（`useAuthStore`）
- Tailwind CSS 配置
- Ant Design 5.x 引入（ConfigProvider + 主题配置）

#### Scenario: 主应用启动成功
- **WHEN** 在 `apps/main/` 运行 `pnpm dev`
- **THEN** Vite dev server 在 `http://localhost:5173` 启动，页面渲染出 Layout 骨架

#### Scenario: 主应用加载 Feed 子应用
- **WHEN** 主应用和 Feed 子应用同时运行，用户访问 `/feed` 路由
- **THEN** Garfish 加载 Feed 子应用并渲染在 Content 区域内

#### Scenario: 主题色正确
- **WHEN** 页面渲染完成
- **THEN** 主色调为天蓝色 `#0EA5E9`，暗色模式背景为 `#0F172A`

### Requirement: Feed 子应用骨架

`apps/feed/` SHALL 是第一个 Garfish 微前端子应用，基于 React 18 + Vite + TypeScript，包含：
- Garfish 子应用生命周期导出（`provider` 函数，使用 `@garfish/bridge-react-v18`）
- 简单的 Feed 列表页面（显示 "Feed 子应用已加载" 占位文本）
- 独立运行模式（可单独 `pnpm dev` 访问 `http://localhost:5174`）

#### Scenario: Feed 子应用独立运行
- **WHEN** 在 `apps/feed/` 单独运行 `pnpm dev`
- **THEN** 在 `http://localhost:5174` 独立渲染 Feed 页面

#### Scenario: Feed 子应用作为 Garfish 子应用加载
- **WHEN** 主应用通过 Garfish 加载 Feed 子应用
- **THEN** Feed 子应用正确挂载到指定 DOM 容器，生命周期（mount/unmount）正常执行

### Requirement: shared-types 包

`packages/shared-types/` SHALL 是一个 TypeScript 包，存放 buf generate 生成的 Protobuf TypeScript 代码，并导出：
- 所有生成的消息类型（`User`, `Article`, `GetUserRequest` 等）
- 所有生成的 service client（`UserService`, `ArticleService`）
- 包名为 `@luhanxin/shared-types`

#### Scenario: 类型包可被子应用引用
- **WHEN** `apps/main/` 中 `import { User } from '@luhanxin/shared-types'`
- **THEN** TypeScript 类型检查通过，`User` 类型包含 `id`、`username`、`email` 字段

### Requirement: Biome 代码规范配置

项目根目录 SHALL 包含 `biome.json` 配置文件，作为所有前端代码的统一 lint + format 工具：
- 替代 ESLint + Prettier
- 配置 TypeScript + React JSX 支持
- 缩进使用 2 空格
- 单引号
- 尾逗号

#### Scenario: Biome 检查通过
- **WHEN** 在项目根目录运行 `pnpm biome check apps/ packages/`
- **THEN** 所有前端代码通过 lint 和 format 检查
