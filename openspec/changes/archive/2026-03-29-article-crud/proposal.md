# Proposal: Article CRUD

## Why

Luhanxin Community 当前只有用户模块，没有内容创作能力。首页只展示用户列表，缺乏核心的"内容"——技术社区的灵魂是文章。

数据库 `articles` 表和 Proto `ArticleService`（GetArticle + ListArticles）已经存在，但：
- Proto 缺少创建、更新、删除方法
- 没有 `svc-content` 微服务
- Gateway 没有文章路由转发
- 前端文章页是空壳占位

本次补齐文章 CRUD 全链路，让平台能真正发布和阅读技术文章。

## What Changes

**后端**
- 扩展 `article.proto`：新增 `CreateArticle`、`UpdateArticle`、`DeleteArticle` RPC
- 新建 `svc-content` 微服务（Tonic gRPC server + SeaORM）
- Gateway 新增 `ArticleService` 转发（含认证拦截：创建/编辑/删除需认证）
- Gateway Swagger REST proxy 补齐文章端点

**前端**
- 首页：文章列表替代用户列表作为主内容流
- 文章详情页 `/article/:id`
- 文章编辑/创建页（Markdown 编辑器）
- 用户主页下方展示该用户的文章列表

## Non-Goals

- 评论系统（留给后续 `comment-system` change）
- 点赞/收藏/分享（留给 `social-features` change）
- 全文搜索（留给 `search-integration` change）
- 文章封面图上传（暂时用 URL 字段代替）
- Markdown 实时预览（MVP 用简单的 textarea + 渲染，不用复杂编辑器）

## Relation to Existing Design

- `docs/design/2026-03-23/` — 前端架构设计，文章模块在规划中
- `openspec/specs/database-migration/` — articles 表已存在（title/slug/summary/content/tags/status）
- `openspec/specs/database-connection/` — SeaORM Entity 已生成（`shared/entity/articles.rs`）
- `proto/luhanxin/community/v1/article.proto` — 已有 GetArticle + ListArticles，需扩展
- 参考网站：掘金文章列表/详情页的信息结构

## Capabilities

### New Capabilities
- `article-service`: svc-content 微服务 — 文章 CRUD handler + gRPC service 实现
- `article-gateway`: Gateway 文章路由转发 + Swagger REST proxy
- `article-frontend`: 前端文章列表/详情/创建/编辑页面

### Modified Capabilities
- `database-connection`: svc-content 接入数据库（和 svc-user 一样的模式）
- `gateway-interceptor`: AuthInterceptor 公开方法白名单新增 GetArticle/ListArticles

## Impact

- **新增微服务**: `services/svc-content/`（独立 Cargo crate）
- **Proto 变更**: `article.proto` 新增 3 个 RPC + Request/Response 消息
- **Gateway**: 新增 ArticleService 转发 + REST proxy 端点
- **前端**: `apps/main/src/pages/article/` 从占位页变为完整模块
- **首页**: 主内容流从用户列表改为文章列表
- **Docker**: `docker-compose.yml` / `dev.sh` 需要启动 svc-content
