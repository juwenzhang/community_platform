## Why

当前通知系统通过前端轮询（30s 间隔）获取通知，存在以下问题：

1. **实时性差** — 30s 轮询间隔导致通知延迟高，用户感知不即时
2. **资源浪费** — 无通知时也在持续发送 HTTP 请求，浪费带宽和服务器资源
3. **移动端不友好** — 轮询在移动端耗电更多
4. **无法推送** — 服务端无法主动推送通知（如文章被评论、被点赞、被@提及）

需要一个 WebSocket 实时通知系统，让 Gateway 充当 WebSocket 服务器，将 NATS 事件桥接到前端 WebSocket 连接。

## What Changes

### Gateway WebSocket 端点

- 新增 `/ws` WebSocket 端点（Axum + tokio-tungstenite）
- JWT 认证：WS 握手时验证 JWT token，建立用户→连接的映射
- 心跳保活：30s ping/pong，自动清理断开连接

### NATS→WS 桥接

- Gateway 订阅 NATS 事件（评论、点赞、@提及、系统通知等）
- 将事件路由到对应用户的 WebSocket 连接
- Protobuf 序列化传输

### 前端 WS Client

- `@luhanxin/ws-client` 包或直接在 main app 中实现
- 自动重连（指数退避）
- 消息类型路由（通知/互动/系统）
- 与现有 `useAuthStore` 集成

### 通知类型扩展

- 评论回复通知
- 点赞通知
- @提及通知
- 系统公告（管理员推送）

## 非目标 (Non-goals)

- **不做 WebSocket 聊天** — 即时通讯不在本次范围
- **不做协同编辑同步** — Yjs 同步在编辑器 change 中设计
- **不替换 REST API** — REST API 继续用于 CRUD，WS 仅用于通知推送
- **不做通知分组/聚合** — 通知分组在后续 change 中优化

## 与现有设计文档的关系

- **`docs/design/2026-03-20/03-backend-architecture.md`** — Gateway 新增 WebSocket 层
- **`docs/design/2026-03-20/05-infrastructure.md`** — 新增 WebSocket 基础设施
- **`docs/tech/05-service-discovery-and-mq.md`** — NATS 事件驱动架构已有基础

## Capabilities

### New Capabilities

- `websocket-gateway`: Gateway WebSocket 服务器 — JWT 认证 + 心跳保活 + NATS→WS 桥接
- `realtime-notification`: 实时通知推送 — 替代轮询，毫秒级通知送达

### Modified Capabilities

- `notification-system`: 通知系统升级 — 从轮询改为 WebSocket 推送
- `gateway-architecture`: Gateway 架构扩展 — 新增 WebSocket 协议层

## Impact

### 代码影响

| 范围 | 变更类型 |
|------|---------|
| `services/gateway/` | 新增 WebSocket 端点 + NATS→WS 桥接 |
| `proto/` | 新增 WS 消息类型 Proto 定义 |
| 前端通知 store | 修改（从轮询改为 WS 监听） |
| 前端通知组件 | 修改（实时更新 UI） |

### API 影响

- 新增 `/ws` WebSocket 端点
- 新增 Proto `WsMessage` 类型（通知事件 Protobuf 编码）

### 依赖影响

新增 Rust 依赖：`tokio-tungstenite`（WebSocket）、`dashmap`（并发连接映射）
