## Context

平台已完成核心 CRUD（用户注册/登录、文章发布/编辑、评论、点赞/收藏），但缺少三个闭环体验组件：通知、搜索、缓存。

**当前状态**：
- **NATS**：Docker 容器运行 + `NatsClient` 封装 + `EventEnvelope` Proto + Subject 常量已定义，但无业务事件发布/订阅
- **Redis**：Docker 容器运行 + `SharedConfig.redis_url` 已配置，但无客户端模块和缓存代码
- **Meilisearch**：Docker 容器运行（端口 7700），零代码集成
- **搜索**：当前使用 PostgreSQL `pg_trgm` + `ILIKE` 模糊搜索，中文支持差
- **微服务**：gateway（8000）、svc-user（50051）、svc-content（50052）

**约束**：
- 所有 API 走 Protobuf（Connect Protocol），文件上传例外
- 后端 Rust + Tonic，前端 React + Connect-Web
- Proto 为 Single Source of Truth，先定义 Proto 再写业务

## Goals / Non-Goals

**Goals:**
- 用户在文章被评论/点赞/收藏时收到通知，可查看通知列表、标记已读
- 文章和用户支持 Meilisearch 全文搜索，中文分词、高亮、毫秒级响应
- 热门数据 Redis 缓存，减轻 DB 压力，提升 P99 响应速度

**Non-Goals:**
- WebSocket 实时推送（本次轮询，30s 间隔）
- 推荐算法 / 个性化排序
- Redis Cluster / Sentinel 高可用
- Meilisearch 管理后台

## Decisions

### Decision 1：通知系统架构 — 独立微服务 vs Gateway 内嵌

| 方案 | 优势 | 劣势 |
|------|------|------|
| **A. 独立 svc-notification** | 职责单一、可独立扩缩容、故障隔离 | 多一个服务要维护、多一次 RPC 调用 |
| B. Gateway 内嵌 | 少一跳、架构简单 | Gateway 职责膨胀、违反 BFF 只做聚合的原则 |

**选择 A**：独立 `svc-notification` 微服务（端口 50053）。

**理由**：通知系统需要后台常驻订阅 NATS 事件，这是长生命周期的消费者逻辑，不适合放在 Gateway（BFF 层）。而且通知表会快速增长，独立服务方便后续优化（如归档、批量清理）。

### Decision 2：事件发布时机 — 同步 vs 异步

| 方案 | 优势 | 劣势 |
|------|------|------|
| **A. 业务操作后同步发布 NATS 事件** | 简单、确定性高 | 增加请求延迟（~1ms）|
| B. DB 触发器 + CDC | 数据一致性好 | 复杂度高、需要额外组件 |

**选择 A**：在 `svc-content` 的评论/点赞/收藏 handler 中，业务操作成功后同步发布 NATS 事件。

**理由**：NATS publish 是异步非阻塞的（fire-and-forget 语义），延迟开销极低。CDC 方案过于复杂，与当前阶段不匹配。如果 NATS 发布失败，只需记日志，不影响主业务流程。

### Decision 3：Redis 客户端 — `redis-rs` vs `fred`

| 方案 | 优势 | 劣势 |
|------|------|------|
| **A. `redis-rs`** | 生态最广、文档最多、stars 最多 | API 偏底层 |
| B. `fred` | 高级特性多（连接池内建、Pipeline） | 社区较小、学习成本 |

**选择 A**：使用 `redis` crate（redis-rs）+ `deadpool-redis` 连接池。

**理由**：`redis-rs` 是 Rust Redis 生态的事实标准，配合 `deadpool-redis` 实现异步连接池，API 简洁。`fred` 虽然功能更全但社区小，遇到问题难排查。

### Decision 4：缓存策略 — Cache-Aside

```
读操作：
  1. 查 Redis → Hit → 返回
  2. Miss → 查 DB → 写入 Redis（设 TTL）→ 返回

写操作：
  1. 更新 DB
  2. 删除 Redis 缓存（而非更新）
```

**TTL 设计**：

| 缓存对象 | Key 格式 | TTL | 说明 |
|---------|---------|-----|------|
| 文章详情 | `luhanxin:article:{id}` | 5min | 高频读、中频写 |
| 用户信息 | `luhanxin:user:{id}` | 10min | 高频读、低频写 |
| 通知未读数 | `luhanxin:notification:unread:{user_id}` | 1min | 高频读、高频写 |
| 文章列表（首页） | `luhanxin:articles:list:{page}:{sort}` | 2min | 列表缓存短 TTL |

**选择 Cache-Aside + 删除缓存（非更新）**：删除比更新更安全，避免缓存和 DB 不一致。短 TTL 保证最终一致性。

### Decision 5：Meilisearch 索引同步

| 方案 | 优势 | 劣势 |
|------|------|------|
| **A. 业务操作后同步调用 Meilisearch API** | 简单、实时性好 | 增加请求延迟 |
| B. 通过 NATS 事件异步同步 | 解耦、不影响主业务 | 需要额外消费者、有延迟 |

**选择 B**：通过 NATS 事件异步同步到 Meilisearch。

**理由**：文章创建/更新/删除时发布 NATS 事件，`svc-notification`（或单独的 indexer worker）订阅事件后调用 Meilisearch HTTP API 更新索引。这样搜索同步不影响写操作延迟，且与通知系统共享事件基础设施。

搜索 API 由 Gateway BFF 层实现：直接调用 Meilisearch HTTP API（不经过 gRPC 微服务），因为搜索是只读且对延迟敏感。

### Decision 6：通知数据模型

```sql
CREATE TABLE notifications (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID NOT NULL REFERENCES users(id),
    type        VARCHAR(50) NOT NULL,     -- 'comment', 'like', 'favorite'
    actor_id    UUID NOT NULL REFERENCES users(id),  -- 触发者
    target_type VARCHAR(50) NOT NULL,     -- 'article', 'comment'
    target_id   UUID NOT NULL,            -- 文章/评论 ID
    is_read     BOOLEAN NOT NULL DEFAULT false,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_notifications_user_unread ON notifications(user_id, is_read, created_at DESC);
```

### Decision 7：Protobuf 定义

```protobuf
// notification.proto
service NotificationService {
  rpc ListNotifications(ListNotificationsRequest) returns (ListNotificationsResponse);
  rpc GetUnreadCount(GetUnreadCountRequest) returns (GetUnreadCountResponse);
  rpc MarkAsRead(MarkAsReadRequest) returns (MarkAsReadResponse);
  rpc MarkAllAsRead(MarkAllAsReadRequest) returns (MarkAllAsReadResponse);
}

// search.proto
service SearchService {
  rpc SearchArticles(SearchArticlesRequest) returns (SearchArticlesResponse);
  rpc SearchUsers(SearchUsersRequest) returns (SearchUsersResponse);
}
```

### Decision 8：前端通知组件

- Header 右侧新增 `<NotificationBell />`（`<BellOutlined />` 图标 + Badge 未读数）
- 点击弹出 Popover 通知列表（最近 20 条），带"全部已读"按钮
- 未读计数每 30s 轮询一次 `GetUnreadCount`
- 点击单条通知标记已读并跳转到对应文章

## Risks / Trade-offs

| 风险 | 影响 | 缓解措施 |
|------|------|---------|
| NATS 事件丢失导致通知遗漏 | 用户错过通知 | NATS 使用 at-least-once 语义 + 通知去重（actor_id + target_id + type 组合唯一索引） |
| Redis 缓存与 DB 不一致 | 用户看到过时数据 | 短 TTL（1-10min）+ 写操作主动删除缓存 |
| Meilisearch 索引延迟 | 新文章搜索不到 | 异步同步延迟通常 < 1s，可接受；保留 pg_trgm 作为降级搜索 |
| svc-notification 新服务增加运维负担 | 需要监控、部署 | 复用现有 Consul 服务发现 + Docker Compose 配置 |
| Redis 单点故障 | 缓存不可用 | 降级为直接查 DB（缓存穿透），Redis 只是加速层 |

## Open Questions

1. **搜索结果页 URL 设计**：`/search?q=xxx` 还是 `/search/:query`？倾向前者，方便分享。
2. **通知聚合**：多人点赞同一篇文章是否聚合为一条通知？本次不做聚合，后续可优化。
3. **Meilisearch 索引初始化**：已有文章如何批量导入？需要写一个一次性的 migration 脚本。
