# Tasks — route-architecture-redesign

## Phase 1: 组件提升（移动到 `src/components/`）

- [x] 1.1 移动 `pages/article/components/ArticleCard/` → `components/ArticleCard/`
- [x] 1.2 移动 `pages/article/components/ArticleList/` → `components/ArticleList/`
- [x] 1.3 移动 `pages/article/components/ArticleEditor/` → `components/ArticleEditor/`
- [x] 1.4 移动 `pages/article/components/ArticleToc/` → `components/ArticleToc/`
- [x] 1.5 更新所有 import 路径：`pages/article/components/*` → `@/components/*`
- [x] 1.6 修复 ArticleList `fetchedRef` 问题：移除一次性 fetch 限制，改为响应 tag/authorId/query props 变更时重新 fetch
- [x] 1.7 编译检查，确认无 broken import

## Phase 2: 文章详情/编辑页面提升为 `/post`

- [x] 2.1 创建 `pages/post/index.tsx`：模块入口（`<Routes>` 分发 `:id` 和 `:id/edit`）
- [x] 2.2 移动 `pages/article/pages/detail/*` → `pages/post/pages/detail/`
- [x] 2.3 移动 `pages/article/pages/edit/` → `pages/post/pages/edit/`
- [x] 2.4 更新 detail/edit 页面内部的 import 路径
- [x] 2.5 修复 edit 页面回退路径：取消 → `/post/:id`，加载失败 → `/`
- [x] 2.6 修复 detail 页面"返回列表"按钮：`/article` → `/`
- [x] 2.7 `routes/routes.tsx`：新增 `/post/*` 路由（hidden），删除 `/article/*` 路由

## Phase 3: 创作中心迁移到 `/profile/manage`

- [x] 3.1 移动 `pages/article/pages/create/` → `pages/profile/pages/manage/`（命名修正：create → manage）
- [x] 3.2 重构 `pages/profile/index.tsx`：从单页面改为 `<Routes>` 子路由（index=设置, manage=文章管理）
- [x] 3.3 更新 manage 页面的 import 路径

## Phase 4: 首页导航 Sidebar

- [x] 4.1 创建 `pages/home/components/NavSidebar/` 组件：左侧分类导航
- [x] 4.2 NavSidebar 导航项：综合/后端/前端/移动端/AI/开发工具/阅读
- [x] 4.3 首页布局重构：三栏布局（左侧 NavSidebar + 中间文章 Feed + 右侧信息栏）
- [x] 4.4 NavSidebar 选中态联动 ArticleList tag 筛选

## Phase 5: 链接路径全局更新

- [x] 5.1 全局替换 `/article/${id}` 链接为 `/post/${id}`（15 处硬编码）
- [x] 5.2 全局替换 `/article/create` 为 `/profile/manage`（创作中心入口）
- [x] 5.3 Header UserArea 菜单路由更新："创作中心" → `/profile/manage`
- [x] 5.4 Vue `UserProfile.vue` 文章链接 `/article/` → `/post/`
- [x] 5.5 Vue `UserProfile.vue` username 获取方式改为 Garfish props（`getRouteParams`）
- [x] 5.6 GarfishContainer 补充传递 `getRouteParams` props

## Phase 6: 清理旧文件

- [x] 6.1 删除 `pages/article/index.tsx` + `pages/article/article.module.less`
- [x] 6.2 删除 `pages/article/components/ArticleSidebar/`（2 个文件）
- [x] 6.3 确认 `pages/article/` 目录为空后删除整个目录
- [x] 6.4 编译检查，确认无残留引用

## Phase 7: 验证

- [ ] 7.1 首页三栏布局（NavSidebar + Feed + 信息栏）
- [ ] 7.2 NavSidebar 点击分类筛选文章（tag 联动 fetch）
- [ ] 7.3 `/post/:id` 文章详情正常 + 返回按钮回首页
- [ ] 7.4 `/post/:id/edit` 编辑页正常 + 取消回详情
- [ ] 7.5 `/profile` 个人设置正常
- [ ] 7.6 `/profile/manage` 文章管理正常
- [ ] 7.7 Header 下拉菜单 4 个入口正确
- [ ] 7.8 Vue `/user/:username` 文章链接跳转正确
