## Why

平台目前已具备文章发布、评论、点赞、收藏等核心社交功能，但缺少三个关键的"闭环体验"组件：

1. **通知系统**：用户对文章的评论、点赞、收藏行为没有任何通知机制，作者无法感知互动，导致社交反馈链断裂。
2. **全文搜索**：当前搜索基于 PostgreSQL `pg_trgm` 模糊匹配，对中文支持差、无分词能力、不支持搜索高亮，随文章增长性能下降明显。
3. **Redis 缓存层**：所有请求直接穿透到 PostgreSQL，热门文章、用户信息等高频读数据没有缓存，数据库压力大且响应慢。

基础设施已全部就绪（NATS Docker + 客户端封装 + EventEnvelope Proto、Redis Docker + 配置、Meilisearch Docker），现在是将它们投入业务使用的最佳时机。

## 非目标 (Non-goals)

- **实时聊天 / 私信系统**：不在此次范围内，通知系统仅覆盖"事件驱动的异步通知"。
- **推荐算法**：文章推荐排序不在此次实现范围。
- **通知推送（Push Notification / WebSocket）**：本次只做轮询拉取通知列表，WebSocket 实时推送留作后续迭代。
- **搜索 Admin 后台**：Meilisearch 索引管理界面不在此次范围。
- **Redis 集群 / Sentinel**：开发环境使用单节点 Redis，高可用方案留到生产部署时处理。

## 与现有设计文档的关系

- 复用 `docs/design/2026-03-23/` 中关于后端服务发现与消息队列的架构设计，NATS 事件基础已在 `backend-service-discovery-and-mq` 中完成。
- 搜索功能替代 `header-write-button-and-search` 中基于 `pg_trgm` 的简易搜索实现。
- Redis 缓存为后端架构新增横切关注点，需更新 `docs/design/` 中的服务架构图。

## What Changes

### 🔔 通知系统
- 新增 `notification.proto`，定义 `NotificationService`（标记已读、获取通知列表、获取未读计数）
- 新增 `svc-notification` 微服务，订阅 NATS 事件，持久化通知到 PostgreSQL
- Gateway 注册 `NotificationService` 路由
- `svc-content` 和 `svc-user` 在评论/点赞/收藏等操作后发布 NATS 事件
- 前端 Header 新增通知铃铛组件，展示未读计数 + 通知列表弹窗

### 🔍 全文搜索
- 新增 `search.proto`，定义 `SearchService`（搜索文章、搜索用户）
- Meilisearch 索引同步：文章创建/更新/删除时同步索引
- Gateway 实现搜索 BFF 层，聚合 Meilisearch 结果 + 用户/文章详情
- 前端搜索结果页（替代当前首页的简易搜索）

### 💾 Redis 缓存层
- `shared` crate 新增 Redis 客户端模块（`redis` crate 封装）
- 缓存策略：文章详情（TTL 5min）、用户信息（TTL 10min）、通知未读计数（TTL 1min）
- Cache-Aside 模式：先查缓存 → miss 查 DB → 写缓存
- 写操作时主动失效相关缓存

## Capabilities

### New Capabilities
- `notification-system`: 基于 NATS 事件驱动的异步通知系统，包含后端微服务、Proto 定义、事件发布/订阅、前端通知组件
- `fulltext-search`: Meilisearch 全文搜索集成，包含索引同步、搜索 API、前端搜索结果页
- `redis-cache`: Redis 缓存层，包含客户端封装、Cache-Aside 策略、缓存失效机制

### Modified Capabilities
- `gateway-connect-protocol`: 新增 NotificationService 和 SearchService 的 Connect RPC 路由
- `gateway-interceptor`: 通知和搜索相关的认证拦截配置
- `nats-messaging`: 从基础设施层扩展到业务事件发布（评论/点赞/收藏事件）
- `header-user-menu`: Header 新增通知铃铛组件

## Impact

### 后端
- **新增微服务**：`svc-notification`（端口 50053）
- **新增 Proto**：`notification.proto`、`search.proto`
- **修改微服务**：`svc-content`（发布事件）、`gateway`（新增路由 + 搜索 BFF）
- **新增 shared 模块**：`redis` 客户端模块
- **数据库**：新增 `notifications` 表（SeaORM migration）
- **依赖新增**：`redis` crate、`meilisearch-sdk` crate

### 前端
- **新增组件**：NotificationBell（Header 铃铛）、NotificationList（通知列表）、SearchResultPage
- **修改组件**：Header（集成通知铃铛）、首页搜索（跳转到搜索结果页）
- **新增 Proto 类型**：NotificationService、SearchService 的 TypeScript 生成类型
- **新增 Store**：useNotificationStore（Zustand）

### 基础设施
- Consul 注册新增 `svc-notification` 服务
- NATS Subject 新增业务事件（`luhanxin.events.content.*`、`luhanxin.events.social.*`）
