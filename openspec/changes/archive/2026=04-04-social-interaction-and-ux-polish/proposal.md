## Why

社区平台目前只有「发文章 → 看文章」的单向内容流，缺乏核心社交互动能力。用户无法评论、点赞、收藏文章，也看不到其他用户的公开主页。前端 ArticleActions 组件的点赞/收藏按钮已经存在但无后端支持，首页「推荐/最新」排序 Tab 无实际效果，文章列表 pageSize=50 没有滚动分页。这些缺失严重影响社区活跃度和用户留存。

## Non-goals（非目标）

- 不做通知推送系统（下一期）
- 不做 Meilisearch 全文搜索集成（下一期）
- 不做图片上传/OSS 存储（下一期，评论暂不支持图片）
- 不做暗黑模式（下一期）
- 不做三级及以上评论嵌套（只支持二级：顶级评论 + 子回复）
- 不做 @通知推送（@提及只做高亮链接，推送下一期）
- 不做 Redis 缓存层优化（先保证功能正确）

## What Changes

### 新增功能
- **评论系统**：创建/列表/删除评论，支持对评论的一级回复（reply_to_id）
- **点赞功能**：文章点赞/取消点赞，同步更新 like_count，前端状态联动
- **收藏功能**：文章收藏/取消收藏，用户可查看收藏列表
- **用户公开主页**：`/user/:username` 页面，展示用户资料 + 其发布的文章列表
- **文章排序**：首页「推荐」按 view_count+like_count 加权排序，「最新」按 published_at 排序
- **滚动分页**：首页文章列表滚动到底部自动加载下一页

### 修改已有功能
- ArticleActions 组件：点赞/收藏按钮接入真实 API，显示已点赞/已收藏状态
- ArticleList 组件：支持 `sort` 参数和滚动加载
- ListArticlesRequest：新增 `sort` 字段
- useArticleStore：新增 `appendArticles` 追加加载方法

## Capabilities

### New Capabilities
- `comment-system`: 评论 CRUD — Proto 定义、数据库表、后端服务、Gateway 路由、前端组件
- `like-and-favorite`: 点赞/收藏 — Proto 定义、数据库表、后端服务、Gateway 路由、前端状态
- `user-public-profile`: 用户公开主页 — `/user/:username` 页面展示用户资料和文章
- `article-sort-and-pagination`: 文章排序 + 滚动分页 — ListArticles 排序参数 + 前端 infinite scroll

### Modified Capabilities
（无已有 spec 需修改，本次新增的能力会修改已有代码但不改变已有 spec 定义）

## Impact

### Proto 变更
- 新增 `comment.proto`（CommentService：CreateComment/ListComments/DeleteComment）
- 新增 `social.proto`（SocialService：LikeArticle/UnlikeArticle/FavoriteArticle/UnfavoriteArticle/GetArticleInteraction/ListFavorites）
- 修改 `article.proto`：ListArticlesRequest 新增 `sort` 字段

### 数据库变更
- 新增 `comments` 表（id, article_id, author_id, content, reply_to_id, created_at）
- 新增 `likes` 表（user_id, article_id, created_at — unique constraint）
- 新增 `favorites` 表（user_id, article_id, created_at — unique constraint）

### 后端变更
- svc-content：新增 handlers/comment、handlers/social 模块
- Gateway：新增 routes/comment、routes/social REST 路由
- shared/entity：新增 comments.rs、likes.rs、favorites.rs

### 前端变更
- 新增 `useSocialStore.ts`（点赞/收藏状态管理）
- 新增 `CommentSection` 组件（评论列表 + 发表评论）
- 新增 `pages/user/` 用户主页
- 修改 ArticleActions：接入点赞/收藏 API
- 修改 ArticleList：支持排序 + 滚动分页
- 修改 useArticleStore：appendArticles + sort 参数
- 修改 `routes/routes.tsx`：新增 `/user/:username` 路由

### 与现有设计文档的关系
- 基于 `docs/design/` 中的整体架构，遵循 Gateway 拦截器模式（`docs/tech/06-gateway-interceptor-pattern.md`）
- 新增的 Proto 遵循已有的 `luhanxin.community.v1` 包命名规范
- 新增的 REST 路由遵循 `/api/v1/<resource>` 命名约定
