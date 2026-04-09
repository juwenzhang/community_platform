## 1. 评估共享依赖

- [ ] 1.1 检查 `apps/main/src/pages/post/` 中所有组件的引用关系 — 确认 ArticleEditor、MarkdownRender、ArticleCard 等是否被 post 外的页面引用
- [ ] 1.2 检查 `apps/main/src/pages/search/` 中所有组件的引用关系 — 确认搜索相关组件是否被外部引用
- [ ] 1.3 检查 `apps/main/src/stores/` 中是否有被 post/search 共用且需要迁移的 store
- [ ] 1.4 检查 `apps/main/src/components/` 中哪些组件需要提升到 `packages/`（如 MarkdownRender 被多个页面使用）
- [ ] 1.5 输出迁移清单 — 明确列出每个文件的迁移目标（article/search/main/共享包）

> **依赖**：无前置依赖。

## 2. 搭建 article 子应用骨架

- [ ] 2.1 创建 `apps/article/package.json` — name: @luhanxin/article，依赖 react/antd/zustand/@connectrpc/connect-web/@luhanxin/shared-types/@luhanxin/dev-kit
- [ ] 2.2 创建 `apps/article/tsconfig.json` — extends tsconfig.base.json，paths: @/* → ./src/*
- [ ] 2.3 创建 `apps/article/vite.config.ts` — port 5176，garfishSubApp 插件，Connect RPC proxy
- [ ] 2.4 创建 `apps/article/src/main.tsx` — Garfish 子应用入口（export provider/unmount）
- [ ] 2.5 创建 `apps/article/src/ArticleApp.tsx` — App 根组件，BrowserRouter + Routes
- [ ] 2.6 创建 `apps/article/src/routes/` — routes.tsx + renderRoutes.tsx（配置化路由）
- [ ] 2.7 创建 `apps/article/src/lib/connect.ts` — 子应用独立 Connect transport
- [ ] 2.8 创建 `apps/article/src/styles/` — 基础样式文件
- [ ] 2.9 验证 article 子应用可独立启动 — `pnpm dev:article`，页面显示正常

> **依赖**：依赖 1.5（迁移清单确认）。

## 3. 迁移文章模块到 article 子应用

- [ ] 3.1 迁移 `pages/post/pages/detail/` → `apps/article/src/pages/detail/` — 文章详情页 + CommentSection + ArticleContent
- [ ] 3.2 迁移 `pages/post/pages/edit/` → `apps/article/src/pages/edit/` — 文章编辑页 + ArticleEditor
- [ ] 3.3 迁移 `pages/post/index.tsx` → `apps/article/src/pages/index.tsx` — 文章列表页（重命名 /post → /articles）
- [ ] 3.4 迁移 `pages/post/components/` → `apps/article/src/components/` — ArticleList、ArticleCard 等私有组件
- [ ] 3.5 迁移 `components/ArticleEditor/` → `apps/article/src/components/ArticleEditor/`（如果仅被 post 使用）
- [ ] 3.6 迁移 `components/MarkdownRender/` → `apps/article/src/components/MarkdownRender/`（如果仅被 post 使用）或提升到 `packages/shared-ui/`（如被多处使用）
- [ ] 3.7 迁移相关 stores — `useArticleStore.ts` 等到 `apps/article/src/stores/`
- [ ] 3.8 迁移相关 hooks — `useArticle.ts` 等到 `apps/article/src/hooks/`
- [ ] 3.9 更新 article 路由配置 — 在 `routes.tsx` 中注册所有迁移的页面路由
- [ ] 3.10 修复 import 路径 — 所有 `@/pages/post/...` 改为 `@/pages/...`
- [ ] 3.11 验证 article 子应用所有页面功能正常 — 列表/详情/编辑/创建

> **依赖**：依赖 2.9（article 子应用骨架就绪）。

## 4. 搭建 search 子应用骨架 + 迁移

- [ ] 4.1 创建 `apps/search/package.json` — name: @luhanxin/search，依赖与 article 类似
- [ ] 4.2 创建 `apps/search/tsconfig.json` — extends tsconfig.base.json
- [ ] 4.3 创建 `apps/search/vite.config.ts` — port 5177，garfishSubApp 插件
- [ ] 4.4 创建 `apps/search/src/main.tsx` — Garfish 子应用入口
- [ ] 4.5 创建 `apps/search/src/SearchApp.tsx` — App 根组件
- [ ] 4.6 创建 `apps/search/src/routes/` — routes.tsx + renderRoutes.tsx
- [ ] 4.7 创建 `apps/search/src/lib/connect.ts` — 子应用独立 Connect transport
- [ ] 4.8 迁移 `pages/search/` → `apps/search/src/pages/` — 搜索页面 + 组件
- [ ] 4.9 迁移相关 stores/hooks — `useSearchStore.ts` 等到 `apps/search/src/`
- [ ] 4.10 修复 import 路径
- [ ] 4.11 验证 search 子应用功能正常

> **依赖**：依赖 1.5（迁移清单确认）。可与 Phase 2/3 并行。

## 5. main app 路由切换

- [ ] 5.1 更新 `apps/main/src/routes/routes.tsx` — 移除 `/post/*` 和 `/search` 本地路由
- [ ] 5.2 配置 app-registry — 在 dev/prod 环境中注册 article 和 search 子应用的路由信息
- [ ] 5.3 添加 redirect — `/post/*` → `/articles`（如果决定保留向后兼容）
- [ ] 5.4 更新 main 的导航组件 — 写文章按钮、搜索入口等链接指向子应用路由
- [ ] 5.5 清理 main 中已迁移的依赖 — 从 `apps/main/package.json` 中移除仅被 article/search 使用的依赖

> **依赖**：依赖 3.11（article 迁移完成）和 4.11（search 迁移完成）。

## 6. 清理与验证

- [ ] 6.1 删除 `apps/main/src/pages/post/` — 已迁移到 article
- [ ] 6.2 删除 `apps/main/src/pages/search/` — 已迁移到 search
- [ ] 6.3 删除 `apps/main/src/components/` 中已迁移到 article/search 的组件
- [ ] 6.4 运行 `pnpm dev` — 验证 main + article + search + feed + user-profile 全部正常启动
- [ ] 6.5 全链路路由测试 — 首页 → 文章列表 → 文章详情 → 文章编辑 → 搜索 → 返回首页
- [ ] 6.6 样式检查 — 确认迁移后样式无丢失
- [ ] 6.7 更新 `scripts/dev.sh` — 添加 article 和 search 子应用的启动
- [ ] 6.8 更新文档 — README.md 端口表、项目结构说明
