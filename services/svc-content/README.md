# svc-content — 内容微服务

> [English](./README.en.md) | 中文

内容相关的 gRPC 微服务，处理文章、评论、社交互动（点赞/收藏）。

## 职责

- **文章 CRUD**：创建/编辑/删除/列表/详情（Markdown 内容）
- **评论系统**：二级嵌套评论 + @提及解析 + 表情（Unicode emoji）
- **社交互动**：点赞/取消点赞、收藏/取消收藏、互动状态查询
- **文章排序**：推荐（view_count + like_count*3 加权）/ 最新（时间排序）
- **NATS 事件发布**：评论、点赞、收藏操作后发布事件（为通知系统铺路）

## RPC 接口

### ArticleService

| 方法 | 认证 | 说明 |
|------|:---:|------|
| `GetArticle` | 公开 | 获取文章详情 |
| `ListArticles` | 公开 | 文章列表（筛选 + 排序 + 分页）|
| `CreateArticle` | 需认证 | 创建文章 |
| `UpdateArticle` | 需认证 | 更新文章（仅作者）|
| `DeleteArticle` | 需认证 | 软删除文章（仅作者）|

### CommentService

| 方法 | 认证 | 说明 |
|------|:---:|------|
| `CreateComment` | 需认证 | 创建评论/回复 |
| `ListComments` | 公开 | 获取文章评论列表（二级嵌套）|
| `DeleteComment` | 需认证 | 删除评论（仅作者）|

### SocialService

| 方法 | 认证 | 说明 |
|------|:---:|------|
| `LikeArticle` | 需认证 | 点赞（幂等）|
| `UnlikeArticle` | 需认证 | 取消点赞（幂等）|
| `FavoriteArticle` | 需认证 | 收藏 |
| `UnfavoriteArticle` | 需认证 | 取消收藏 |
| `GetArticleInteraction` | 需认证 | 获取互动状态 |
| `ListFavorites` | 需认证 | 收藏列表 |

## 端口

| 端口 | 协议 | 说明 |
|------|------|------|
| 50052 | gRPC | ArticleService + CommentService + SocialService |

## 启动

```bash
cd services && RUST_LOG=svc_content=info cargo watch -q -x 'run --bin svc-content'
```

## 数据表

- `articles` — 文章（id, title, slug, summary, content, author_id, tags, view_count, like_count, status, categories, ...)
- `comments` — 评论（id, article_id, author_id, content, parent_id, reply_to_id, mentions, ...)
- `likes` — 点赞（user_id + article_id 复合主键）
- `favorites` — 收藏（user_id + article_id 复合主键）

## 依赖

`tonic`, `sea-orm`, `regex`（@mention 解析）, `async-nats`, `prost`, `chrono`, `uuid`
