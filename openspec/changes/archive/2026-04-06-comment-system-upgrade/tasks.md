## 1. Proto 定义更新

- [x] 1.1 在 `proto/luhanxin/community/v1/comment.proto` 中新增 `CommentSort` 枚举（LATEST/POPULAR）
- [x] 1.2 修改 `ListCommentsRequest` — 新增 `CommentSort sort` 和 `string cursor` 字段
- [x] 1.3 在 `proto/luhanxin/community/v1/article.proto` 的 `Article` message 中新增 `int32 comment_count = 16`
- [x] 1.4 执行 `make proto` 生成代码

> **依赖**：无前置依赖。Proto 优先。

## 2. 后端排序与游标分页

- [x] 2.1 修改 `svc-content/handlers/comment/` — `ListComments` handler 支持 sort 参数
- [x] 2.2 实现游标分页查询 — 基于 `created_at` 游标（POPULAR 排序 TODO 待加 like_count 列）
- [x] 2.3 修改 comment handler — `list_by_cursor()` 逻辑内联到 list_comments
- [x] 2.4 实现文章评论数量统计 — Gateway BFF 并发聚合 `enrich_articles`
- [ ] 2.5 后端测试

> **依赖**：依赖 Phase 1（Proto 定义）。

## 3. 评论前端组件重构

- [x] 3.1 IntersectionObserver 无限滚动 — sentinelRef + rootMargin 200px
- [x] 3.2 创建 `CommentSkeleton` 骨架屏组件
- [x] 3.3 重构 `CommentSection` — 集成无限滚动 + 骨架屏 + 折叠/展开 + refreshing 过渡
- [x] 3.4 创建排序切换组件 — 最新(SortAscendingOutlined) / 最热(FireOutlined) Tab
- [x] 3.5 修改评论 store — sort/cursor/hasMore/refreshing + loadMore + setSort

> **依赖**：依赖 Phase 2（后端接口就绪）。

## 4. 评论 Markdown 渲染（跳过 — 依赖 md-parser）

- [ ] 4.1 安装 `@luhanxin/md-parser` 依赖
- [ ] 4.2 创建 `CommentMarkdownRenderer` 组件 — 使用 md-parser 的简化渲染模式
- [ ] 4.3 配置简化渲染 — 仅启用 GFM + sanitize，禁用 Mermaid/KaTeX/自定义语法
- [ ] 4.4 替换评论内容渲染 — 从纯文本切换到 CommentMarkdownRenderer
- [ ] 4.5 编写渲染测试

> **依赖**：依赖 `markdown-parser-package` change 完成。⚠️ md-parser theme 未完善，暂不接入。

## 5. @提及跳转与乐观点赞

- [x] 5.1 实现 @提及链接渲染 — @用户名 → `<Link to="/user/{username}">` 跳转
- [ ] 5.2 实现乐观点赞 hook — `useOptimisticLike` 乐观更新逻辑
- [ ] 5.3 实现点赞动画 — CSS transition + 状态变化动画
- [ ] 5.4 错误回滚处理 — API 失败时恢复点赞状态

> **依赖**：评论点赞需要 Proto + DB migration + 后端 handler 全链路，工作量大。
> ⚠️ 评论 Proto 尚无 `like_count` 字段，DB 无 `comment_likes` 表，属于全新全栈功能。

## 6. 文章列表评论预览

- [x] 6.1 修改文章列表 store — 使用 comment_count 字段
- [x] 6.2 修改 `ArticleCard` 组件 — 显示评论数量 + 收藏数量 + 分享按钮
- [x] 6.3 修改文章详情页顶部 — 显示评论数量 + 收藏数量

> **依赖**：依赖 Phase 1（Proto 新增 comment_count）。

## 6+ 额外完成（超出原 tasks.md 规划）

- [x] Article Proto 新增 `favorite_count = 17`
- [x] Gateway BFF `enrich_articles` 并发聚合 author + comment_count + favorite_count（tokio::join!）
- [x] ArticleCard 显示 ⭐ 收藏数 + 🔗 分享按钮（Web Share + clipboard）
- [x] ArticleActions 悬浮栏新增分享按钮
- [x] 文章详情页 meta 显示收藏数
- [x] 排序切换 refreshing 过渡（opacity 0.5，不闪缩）
- [x] 子评论默认折叠，点击展开/收起

## 7. 验证

- [ ] 7.1 无限滚动测试 — 滚动加载更多评论，骨架屏显示正确
- [ ] 7.2 排序切换测试 — 最新/最热切换正常
- [ ] 7.3 点赞交互测试 — 乐观更新 + 错误回滚（依赖 Phase 5）
- [ ] 7.4 Markdown 渲染测试 — 代码块/链接/加粗等渲染正确（依赖 Phase 4）
- [ ] 7.5 XSS 测试 — 评论中注入脚本被 sanitize（依赖 Phase 4）
