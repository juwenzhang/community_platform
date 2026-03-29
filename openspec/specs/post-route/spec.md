# post-route — 文章详情/编辑独立一级路由

## 概述
将文章详情和编辑页面从 `/article/:id` 提升为 `/post/:id` 一级路由。

## 需求

1. **新增 `pages/post/` 模块**
   - `pages/post/index.tsx`：模块入口，内部 `<Routes>` 分发子路由
   - 子路由：`:id` → 详情页，`:id/edit` → 编辑页

2. **文件移动**
   - `pages/article/pages/detail/` → `pages/post/`（详情页成为 post 入口的主内容）
   - `pages/article/pages/edit/` → `pages/post/pages/edit/`

3. **路由注册**
   - `routes/routes.tsx` 新增 `/post/*` 路由，`meta.hidden: true`

4. **链接更新**
   - 所有 `navigate('/article/${id}')` → `navigate('/post/${id}')`
   - 所有 `href="/article/${id}"` → `href="/post/${id}"`
   - Vue 子应用中的文章链接同步更新

## 验收标准
- [ ] `/post/:id` 正常展示文章详情
- [ ] `/post/:id/edit` 正常进入编辑页
- [ ] 旧 `/article/:id` 路径不再可用（或重定向到 `/post/:id`）
