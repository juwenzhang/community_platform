## 1. Proto 定义 + 代码生成

- [x] 1.1 创建 `proto/luhanxin/community/v1/comment.proto` — CommentService（CreateComment/ListComments/DeleteComment）+ Comment 消息（含 parent_id/reply_to_id/mentions/replies 嵌套）
- [x] 1.2 创建 `proto/luhanxin/community/v1/social.proto` — SocialService（LikeArticle/UnlikeArticle/FavoriteArticle/UnfavoriteArticle/GetArticleInteraction/ListFavorites）
- [x] 1.3 修改 `article.proto` — ListArticlesRequest 新增 `ArticleSort sort` 字段 + ArticleSort 枚举
- [x] 1.4 运行 `make proto` 生成 Rust + TypeScript 代码

## 2. 数据库迁移

- [x] 2.1 创建 migration: `comments` 表（id UUID PK, article_id FK, author_id FK, content TEXT, parent_id FK nullable, reply_to_id FK nullable, mentions TEXT[], created_at, updated_at）+ 索引（article_id, parent_id）
- [x] 2.2 创建 migration: `likes` 表（user_id + article_id 复合主键, created_at）
- [x] 2.3 创建 migration: `favorites` 表（user_id + article_id 复合主键, created_at）
- [x] 2.4 创建 SeaORM Entity: `shared/src/entity/comments.rs`, `likes.rs`, `favorites.rs` + 注册到 mod.rs

## 3. 后端服务 — 评论

- [x] 3.1 svc-content `handlers/comment/mod.rs` — CreateComment handler（验证 article 存在 + 从 content 解析 @mentions + 插入 + 返回含 author 信息）
- [x] 3.2 svc-content `handlers/comment/mod.rs` — ListComments handler（查顶级评论 + 子查询 replies 嵌套，JOIN users 获取 author 信息 + reply_to_author 信息）
- [x] 3.3 svc-content `handlers/comment/mod.rs` — DeleteComment handler（验证作者权限 + 顶级评论级联删除子回复 + 二级回复单独删除）
- [x] 3.4 svc-content `services/comment/mod.rs` — CommentService gRPC trait 实现，注册到 main.rs
- [x] 3.5 svc-content CreateComment 中：当 mentions 非空时，通过 NATS 发布 `luhanxin.events.comment.mentioned` 事件（EventEnvelope 包装，payload 含 article_id/comment_id/author_id/mentions 列表），为下一期通知服务铺路

## 4. 后端服务 — 点赞/收藏

- [x] 4.1 svc-content `handlers/social/mod.rs` — LikeArticle/UnlikeArticle handler（INSERT ON CONFLICT / DELETE + 精确计数更新 articles.like_count）
- [x] 4.2 svc-content `handlers/social/mod.rs` — FavoriteArticle/UnfavoriteArticle handler（INSERT ON CONFLICT / DELETE）
- [x] 4.3 svc-content `handlers/social/mod.rs` — GetArticleInteraction handler（查询 likes + favorites 表判断状态 + 计数）
- [x] 4.4 svc-content `handlers/social/mod.rs` — ListFavorites handler（查询 favorites JOIN articles，按收藏时间倒序）
- [x] 4.5 svc-content `services/social/mod.rs` — SocialService gRPC trait 实现，注册到 main.rs

## 5. 后端服务 — 文章排序

- [x] 5.1 修改 svc-content `handlers/article/mod.rs` — ListArticles 支持 sort 参数（RECOMMENDED: view_count + like_count*3 DESC, LATEST: published_at DESC）

## 6. Gateway REST 路由

- [x] 6.1 新增 `gateway/routes/comment/mod.rs` — 评论 REST 端点（POST/GET /api/v1/articles/{id}/comments, DELETE /api/v1/comments/{id}）
- [x] 6.2 新增 `gateway/routes/social/mod.rs` — 社交互动 REST 端点（POST/DELETE /api/v1/articles/{id}/like, POST/DELETE /api/v1/articles/{id}/favorite, GET /api/v1/articles/{id}/interaction, GET /api/v1/user/favorites）
- [x] 6.3 修改 `gateway/main.rs` — 注册 comment + social 路由，新增 gRPC client 到 CommentService + SocialService
- [x] 6.4 修改 `gateway/services/mod.rs` — 新增 comment + social 服务模块

## 7. 前端 — 点赞/收藏状态管理

- [x] 7.1 新增 `stores/useSocialStore.ts` — Zustand store（likeArticle/unlikeArticle/favoriteArticle/unfavoriteArticle/getInteraction/listFavorites）
- [x] 7.2 修改 `components/ArticleActions/index.tsx` — 接入 useSocialStore，显示已点赞/已收藏状态，点击 toggle

## 8. 前端 — 评论组件

- [x] 8.1 新增 `components/CommentSection/index.tsx` — 评论列表（二级嵌套展示）+ 评论输入框 + 回复功能（点回复自动填 @username + 携带 parent_id/reply_to_id）
- [x] 8.2 新增 `components/CommentSection/commentSection.module.less` — 评论区样式（顶级评论 + 缩进子回复 + 回复 @xxx 前缀样式）
- [x] 8.3 新增 `components/CommentSection/EmojiPicker.tsx` — 表情选择面板（常用 emoji 分类展示，点击插入到输入框光标位置）
- [x] 8.4 新增 `components/CommentSection/MentionInput.tsx` — @提及输入组件（输入 @ 触发用户联想下拉，调用 ListUsers 搜索，选中后插入 @username）
- [x] 8.5 新增 `utils/mentionParser.ts` — 评论内容渲染工具（解析 `@username` 为 React 元素，渲染为蓝色可点击链接跳转 `/user/:username`）
- [x] 8.6 修改 `pages/post/pages/detail/index.tsx` — 在文章正文下方插入 CommentSection

## 9. 前端 — 用户公开主页

- [x] 9.1 新增 `pages/user/index.tsx` — 用户公开主页（用户信息卡片 + 文章列表）
- [x] 9.2 新增 `pages/user/user.module.less` — 用户主页样式
- [x] 9.3 修改 `routes/routes.tsx` — 新增 `/user/*` 路由
- [x] 9.4 修改文章详情页和文章卡片 — 作者名可点击跳转 `/user/:username`

## 10. 前端 — 排序 + 滚动分页

- [x] 10.1 修改 `stores/useArticleStore.ts` — 新增 nextPageToken/hasMore state + loadMoreArticles() + sort 参数支持
- [x] 10.2 修改 `components/ArticleList/index.tsx` — 支持 sort prop + IntersectionObserver 滚动加载
- [x] 10.3 修改 `pages/home/index.tsx` — 推荐/最新 Tab 传递 sort 参数给 ArticleList
- [x] 10.4 新增 `packages/shared-types/src/index.ts` — 导出新增的 CommentService/SocialService/ArticleSort 类型
