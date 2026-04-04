# 主应用 — `apps/main/`

> [English](./README.en.md) | 中文

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
| 样式 | Tailwind CSS 3.4 + CSS Modules (Less) |
| RPC | @connectrpc/connect-web + protobuf-es |
| Markdown | react-markdown + rehype-highlight |
| 类型 | TypeScript 5.6 |
| 代码规范 | Biome（根目录统一配置）|

## 端口

| 端口 | 说明 |
|------|------|
| 5173 | Dev Server |
| 4173 | Preview Server |

## 目录结构

```
apps/main/src/
├── main.tsx                # React 入口
├── App.tsx                 # 路由配置 + Garfish 初始化
├── components/             # 全局公共组件
│   ├── Layout/             #   主布局 (Header + Sidebar + Content)
│   ├── UserArea/           #   用户区域（头像 + 下拉菜单）
│   ├── GarfishContainer.tsx#   微前端子应用容器
│   ├── CommentSection/     #   评论区（二级嵌套 + @提及 + 表情）
│   ├── ArticleCard/        #   文章卡片
│   ├── ArticleList/        #   文章列表（滚动分页）
│   └── ArticleActions/     #   文章操作栏（点赞/收藏/评论数）
├── pages/                  # 页面模块
│   ├── home/               #   首页（推荐/最新 Tab + 文章列表）
│   ├── auth/               #   登录/注册
│   ├── post/               #   文章（详情/编辑/创建）
│   ├── profile/            #   个人资料编辑
│   └── user/               #   用户公开主页
├── stores/                 # Zustand 状态
│   ├── useAuthStore.ts     #   认证状态（登录/注册/token）
│   ├── useCommentStore.ts  #   评论 CRUD
│   └── useSocialStore.ts   #   点赞/收藏
├── routes/                 # 路由配置（配置化）
│   ├── routes.tsx          #   路由配置表
│   └── renderRoutes.tsx    #   配置 → Route 元素渲染器
├── lib/                    # SDK 封装
│   ├── connect.ts          #   Connect RPC Transport + 拦截器
│   ├── grpc-clients.ts     #   gRPC 客户端单例
│   └── registry.ts         #   子应用注册表集成
├── utils/                  # 工具函数
│   └── mentionParser.tsx   #   @mention 解析渲染
└── styles/                 # 全局样式
    ├── index.css           #   Tailwind + CSS 变量
    └── variables.css       #   设计 Token（颜色/圆角/阴影）
```

## 启动

```bash
pnpm dev:main
# → http://localhost:5173
```

## 环境变量

| 变量 | 说明 |
|------|------|
| `VITE_GIPHY_API_KEY` | GIPHY API Key（GIF/Sticker 选择器）|

配置在 `.env.local` 中（gitignored）。

## API 代理

Vite dev server 将以下路径代理到 Gateway (:8000)：

- `/luhanxin.community.v1.*` → gRPC-Web 请求
- `/api/*` → REST 端点（上传签名等）
