## Context

当前 Luhanxin Community Platform 已完成文章 CRUD 全栈、用户认证、分类系统、全局搜索。但缺乏社交互动能力（评论/点赞/收藏）、用户公开主页、以及文章列表的排序和分页。本次设计覆盖这些核心功能的全栈实现。

### 现有架构
- **前端**：React 18 + Zustand + Connect RPC + Ant Design
- **后端**：Rust (Axum Gateway + Tonic gRPC 微服务) + SeaORM + PostgreSQL
- **协议**：Protobuf over HTTP/2 (Connect Protocol)
- **服务拓扑**：Gateway → svc-user / svc-content（通过 Consul 服务发现）

## Goals / Non-Goals

**Goals:**
- 实现评论系统（一级评论 + 回复）
- 实现点赞/收藏功能（toggle 操作 + 计数同步）
- 用户公开主页（展示用户资料 + 文章列表）
- 文章排序（推荐 vs 最新）和滚动分页
- 前端 ArticleActions 组件接入真实 API

**Non-Goals:**
- 嵌套评论树（只支持一级回复）
- Redis 缓存层（先走 PostgreSQL 直查）
- 通知推送、Meilisearch、图片上传、暗黑模式

## Decisions

### D1: 评论和社交功能放在 svc-content 而非新建微服务

**理由**：评论和社交互动（点赞/收藏）与文章强关联，数据模型耦合度高。新建微服务会增加运维成本和跨服务事务复杂度。在 svc-content 内新增 `handlers/comment/` 和 `handlers/social/` 模块即可。

**影响**：svc-content 的职责从「内容 CRUD」扩展为「内容 + 互动」。

### D2: 点赞/收藏使用独立表 + unique constraint

```sql
-- likes 表
CREATE TABLE likes (
  user_id UUID NOT NULL REFERENCES users(id),
  article_id UUID NOT NULL REFERENCES articles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, article_id)
);

-- favorites 表
CREATE TABLE favorites (
  user_id UUID NOT NULL REFERENCES users(id),
  article_id UUID NOT NULL REFERENCES articles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, article_id)
);
```

**理由**：使用复合主键（user_id, article_id）天然保证幂等，INSERT ON CONFLICT DO NOTHING 实现 toggle。

### D3: 评论表设计（二级回复 + @提及）

```sql
CREATE TABLE comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id UUID NOT NULL REFERENCES articles(id),
  author_id UUID NOT NULL REFERENCES users(id),
  content TEXT NOT NULL,
  parent_id UUID REFERENCES comments(id) ON DELETE CASCADE,  -- 顶级评论ID，NULL=顶级评论
  reply_to_id UUID REFERENCES comments(id),                   -- 被回复评论ID，NULL=直接回复顶级
  mentions TEXT[] NOT NULL DEFAULT '{}',                       -- 被@的用户名列表
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_comments_article ON comments(article_id, created_at);
CREATE INDEX idx_comments_parent ON comments(parent_id, created_at);
```

**二级评论规则**：
- `parent_id = NULL` → 顶级评论
- `parent_id = 顶级评论ID` → 二级回复（不允许三级嵌套）
- `reply_to_id` → 二级回复中被回复的具体评论（可以回复顶级评论或其他二级回复）
- `ON DELETE CASCADE`：删除顶级评论时自动级联删除所有子回复

**@提及规则**：
- 后端从 content 中正则解析 `@(\w+)` 提取 mentions 列表存入数组字段
- 前端渲染时将 `@username` 替换为蓝色可点击链接
- 本期不做 @通知推送（下一期通知系统做）

**表情支持**：
- 表情直接作为 Unicode emoji 存入 content 字段，无需后端特殊处理
- 前端提供 Emoji Picker 组件方便输入

### D4: 文章排序策略

| 排序 | 算法 | SQL |
|------|------|-----|
| 推荐 | 热度 = view_count + like_count * 3 | `ORDER BY (view_count + like_count * 3) DESC, published_at DESC` |
| 最新 | 发布时间 | `ORDER BY published_at DESC` |

通过 ListArticlesRequest 新增 `sort` 字段：`ARTICLE_SORT_UNSPECIFIED(0)`, `ARTICLE_SORT_RECOMMENDED(1)`, `ARTICLE_SORT_LATEST(2)`。

### D5: 滚动分页方案

- 前端使用 `IntersectionObserver` 监听哨兵元素
- Store 新增 `nextPageToken` 和 `hasMore` state
- 新增 `loadMoreArticles()` 方法，追加到已有列表而非替换
- Gateway 和 svc-content 已有游标分页支持（`page_token`），无需改动

### D6: 用户公开主页路由

- 路由：`/user/:username`（与 `/profile/*` 区分，profile 是自己的，user 是公开的）
- 页面组件：`pages/user/index.tsx`
- 数据获取：`UserService.GetUserByUsername` + `ArticleService.ListArticles(author_id)`

### D7: GetArticleInteraction RPC

前端打开文章详情时，需要知道当前用户是否已点赞/已收藏。新增一个聚合查询：

```protobuf
rpc GetArticleInteraction(GetArticleInteractionRequest) returns (GetArticleInteractionResponse);

message GetArticleInteractionRequest {
  string article_id = 1;
}

message GetArticleInteractionResponse {
  bool liked = 1;
  bool favorited = 2;
  int32 like_count = 3;
  int32 favorite_count = 4;
}
```

通过 x-user-id metadata 识别当前用户。

## Risks / Trade-offs

| 风险 | 影响 | 缓解 |
|------|------|------|
| like_count 并发更新不准确 | 计数偶尔偏差 | 使用 `UPDATE SET like_count = (SELECT COUNT(*) FROM likes WHERE ...)` 做精确计数，不用 +1/-1 |
| svc-content 职责膨胀 | 代码量增长 | 通过 handlers/ 子模块清晰分离，后续可拆分微服务 |
| 评论无审核 | 可能有垃圾内容 | 先不做审核，后续加入内容审核服务 |
| 无 Redis 缓存 | 高并发时数据库压力 | 当前开发阶段流量低，后续按需加 Redis |
