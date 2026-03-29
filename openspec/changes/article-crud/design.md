# Design: Article CRUD

## Architecture Overview

```
前端 (React)
├── /article          → 文章列表（首页主内容流）
├── /article/:id      → 文章详情（Markdown 渲染）
├── /article/create   → 创建文章（需认证）
├── /article/:id/edit → 编辑文章（需认证，仅作者）
        ↓
Gateway (Axum + Tonic)
├── GatewayArticleService
│   ├── GetArticle / ListArticles → 公开，直接转发
│   ├── CreateArticle → 需认证，注入 author_id (x-user-id)
│   ├── UpdateArticle → 需认证，注入 author_id
│   └── DeleteArticle → 需认证，注入 author_id
├── REST proxy: /api/v1/articles/*
└── AuthInterceptor: 白名单增加 GetArticle / ListArticles
        ↓
svc-content (Tonic + SeaORM)  ← 新增微服务
├── handlers/article/mod.rs   → CRUD 业务逻辑
├── services/article/mod.rs   → gRPC Service trait 实现
├── models/ (复用 shared/entity/articles.rs)
└── PostgreSQL (articles 表，已存在)
```

## Decisions

### D1: svc-content 独立微服务

**决定**: 文章服务作为独立的 `svc-content` 微服务，不放在 svc-user 里。

理由：
- 内容和用户是不同的领域，独立演进
- 后续评论、搜索索引等都挂在 svc-content 下
- 遵循项目规范 `services/svc-<domain>/`

目录结构（完全参照 svc-user 模式）：
```
services/svc-content/
├── Cargo.toml
└── src/
    ├── main.rs          # gRPC server + Consul 注册 + DB 初始化
    ├── config.rs        # 配置加载
    ├── error.rs         # 服务级错误
    ├── services/
    │   ├── mod.rs
    │   └── article/
    │       └── mod.rs   # ArticleService trait 实现
    └── handlers/
        ├── mod.rs
        └── article/
            └── mod.rs   # CRUD 业务逻辑
```

### D2: Proto 扩展策略

**决定**: 在现有 `article.proto` 中扩展，新增 3 个 RPC。

```protobuf
service ArticleService {
  // 已有
  rpc GetArticle(GetArticleRequest) returns (GetArticleResponse);
  rpc ListArticles(ListArticlesRequest) returns (ListArticlesResponse);
  // 新增
  rpc CreateArticle(CreateArticleRequest) returns (CreateArticleResponse);
  rpc UpdateArticle(UpdateArticleRequest) returns (UpdateArticleResponse);
  rpc DeleteArticle(DeleteArticleRequest) returns (DeleteArticleResponse);
}
```

新增消息：
- `CreateArticleRequest`: title, content, summary, tags, status (draft/published)
- `UpdateArticleRequest`: article_id, title?, content?, summary?, tags?, status?
- `DeleteArticleRequest`: article_id
- `CreateArticleResponse` / `UpdateArticleResponse`: article（含生成的 id/slug）
- `DeleteArticleResponse`: 空

### D3: Slug 自动生成

**决定**: slug 由后端自动生成，前端不传。

规则：`title` → 中文拼音/英文小写 → 连字符连接 → 追加短 UUID 后缀避免冲突。
使用 `slug` crate 或简单的 `uuid::Uuid::new_v4().to_string()[..8]` 拼接。

MVP 阶段简化：`slug = uuid_short`（8 位短 UUID），不做拼音转换。

### D4: 权限控制

**决定**: 文章写操作的权限在 svc-content handler 层校验，不在 Gateway。

- Gateway 只负责认证（AuthInterceptor 验证 JWT → 注入 `x-user-id`）
- svc-content handler 接收 `x-user-id`，校验：
  - CreateArticle：`x-user-id` 作为 `author_id`
  - UpdateArticle：校验 `x-user-id == article.author_id`（只有作者能编辑）
  - DeleteArticle：校验 `x-user-id == article.author_id`（只有作者能删）

### D5: 文章列表查询

**决定**: ListArticles 支持多种筛选模式。

- 默认：按 `published_at DESC` 排列，只返回 `status = PUBLISHED`
- `author_id` 筛选：返回该作者的所有文章（包括草稿，仅作者本人可见）
- `tag` 筛选：按标签过滤（PostgreSQL `@>` array contains）
- 分页：游标分页（复用 common.proto 的 PaginationRequest/Response）
- total_count: `COUNT(*)` 查询（和 svc-user 一致的做法）

### D6: 前端页面设计

**决定**: 文章模块的前端页面遵循掘金风格 + Less Module。

| 页面 | 路径 | 布局 |
|------|------|------|
| 文章列表 | `/article` (首页主内容) | 列表卡片，每条显示标题+摘要+作者+标签+时间 |
| 文章详情 | `/article/:id` | 居中内容区，Markdown 渲染 + 作者信息侧栏 |
| 创建文章 | `/article/create` | 全宽编辑区，标题+内容 textarea+标签选择+发布按钮 |
| 编辑文章 | `/article/:id/edit` | 同创建，预填数据 |

Markdown 渲染使用 `react-markdown` + `rehype-highlight`（代码高亮）。
MVP 编辑器使用 Ant Design 的 `Input.TextArea`，后续可升级为专业 Markdown 编辑器。

### D7: 首页改造

**决定**: 首页主内容从"用户列表"改为"文章列表"。

- 左侧主内容：文章列表卡片（ArticleCard 组件）
- 右侧栏：保持现有的社区数据 + 活跃用户推荐（UserList 移到右侧栏）
- Tab 栏："推荐" / "最新" 切换排序方式

### D8: svc-content 端口和注册

**决定**: svc-content 监听 50052，Consul 服务名 `svc-content`。

和 svc-user (50051) 一致的模式：
- 启动时注册到 Consul
- gRPC Health Protocol
- Gateway 通过 ServiceResolver 动态路由
