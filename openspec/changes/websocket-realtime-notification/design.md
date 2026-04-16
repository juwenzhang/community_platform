## Context

当前 `services/svc-notification` 通过 NATS 发布事件（如文章被评论、被点赞），`services/gateway` 的 notification worker 订阅 NATS 并写入数据库。前端通过 30s 轮询获取未读通知。

NATS Subject 已定义在 `services/shared/src/constants.rs`：
- `NATS_EVENTS_PREFIX` — 事件发布前缀
- 事件类型包括 `article.commented`、`article.liked`、`user.mentioned` 等

## Goals / Non-Goals

**Goals:**

1. Gateway 新增 `/ws` WebSocket 端点
2. JWT 认证 + 心跳保活
3. NATS 事件 → WebSocket 推送桥接
4. 前端 WS Client 自动重连
5. Protobuf 序列化传输

**Non-Goals:**

- WebSocket 聊天/IM
- 协同编辑同步
- 通知分组/聚合

## Decisions

### Decision 0: WebSocket 安全与扩展性设计

**问题**：WebSocket 面向公网暴露，需考虑安全和水平扩展。

| 问题 | 解决方案 |
|------|---------|
| **传输安全** | 使用 `wss://`（WebSocket Secure），Nginx 反代 + TLS 终结 |
| **JWT 认证** | 使用 Subprotocol 方案（`Sec-WebSocket-Protocol` header） |
| **水平扩展** | Gateway 无状态 + Redis Pub/Sub 跨实例通信 |
| **离线消息** | 用户上线时拉取最近 50 条未读消息 |
| **多设备同步** | 用户 ID 关联多个 WS 连接，广播到所有设备 |

**WSS 配置（Nginx）**：

```nginx
# nginx/conf.d/gateway.conf
upstream gateway_ws {
    least_conn;
    server gateway-1:8000;
    server gateway-2:8000;
    server gateway-3:8000;
}

server {
    listen 443 ssl http2;
    server_name api.luhanxin.com;

    ssl_certificate /etc/letsencrypt/live/luhanxin.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/luhanxin.com/privkey.pem;

    location /ws {
        proxy_pass http://gateway_ws;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # WebSocket 超时配置
        proxy_read_timeout 3600s;
        proxy_send_timeout 3600s;
    }
}
```

**JWT Subprotocol 认证**：

```typescript
// 前端 WebSocket 连接
const ws = new WebSocket('wss://api.luhanxin.com/ws', [
  `jwt.${token}`  // Subprotocol 格式: jwt.<token>
]);
```

```rust
// 后端认证中间件
async fn ws_handler(
    ws: WebSocketUpgrade,
    protocols: Option<WebSocketProtocols>,
) -> impl IntoResponse {
    // 从 Sec-WebSocket-Protocol header 提取 JWT
    let token = protocols
        .and_then(|p| p.iter().find(|s| s.starts_with("jwt.")))
        .and_then(|s| s.strip_prefix("jwt."));
    
    match verify_jwt(token?) {
        Ok(claims) => ws.on_upgrade(|socket| handle_socket(socket, claims.user_id)),
        Err(_) => StatusCode::UNAUTHORIZED.into_response(),
    }
}
```

**水平扩展架构**：

```
┌─────────────────────────────────────────────────────────────┐
│                     用户访问层                                │
│  wss://api.luhanxin.com/ws                                  │
└─────────────────────────────────────────────────────────────┘
                           │
                           ↓
┌─────────────────────────────────────────────────────────────┐
│                     Nginx 负载均衡                           │
│  least_conn 算法                                            │
└─────────────────────────────────────────────────────────────┘
                           │
            ┌──────────────┼──────────────┐
            ↓              ↓              ↓
┌──────────────┐ ┌──────────────┐ ┌──────────────┐
│  Gateway-1   │ │  Gateway-2   │ │  Gateway-3   │
│  WS Handler  │ │  WS Handler  │ │  WS Handler  │
│  Connection  │ │  Connection  │ │  Connection  │
│   Manager    │ │   Manager    │ │   Manager    │
└──────┬───────┘ └──────┬───────┘ └──────┬───────┘
       │                │                │
       └────────────────┼────────────────┘
                        │
                        ↓
              ┌─────────────────┐
              │   Redis Pub/Sub │
              │  (跨实例广播)    │
              └─────────────────┘
```

**跨实例通信（Redis Pub/Sub）**：

```rust
// Gateway 启动时订阅 Redis channel
async fn start_redis_bridge(redis: RedisClient, manager: Arc<ConnectionManager>) {
    let mut pubsub = redis.get_async_pubsub().await;
    pubsub.subscribe("luhanxin:ws:broadcast").await;
    
    while let Some(msg) = pubsub.on_message().next().await {
        let event: WsEvent = deserialize(&msg.get_payload()?);
        
        // 如果目标用户在本实例，推送消息
        if let Some(tx) = manager.connections.get(&event.target_user_id) {
            tx.send(serialize(&event))?;
        }
    }
}

// 发布消息时（任意 Gateway 实例）
async fn broadcast_to_user(user_id: &str, event: &WsEvent) {
    redis.publish("luhanxin:ws:broadcast", serialize(event)).await?;
}
```

**离线消息持久化**：

```sql
CREATE TABLE offline_messages (
  id UUID PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL,
  message JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  
  INDEX idx_user_created (user_id, created_at DESC)
);

-- TTL 30 天
ALTER TABLE offline_messages SET (ttl = '30 days');
```

### Decision 1: Gateway WS 端点设计

```rust
// services/gateway/src/ws/mod.rs
use axum::extract::ws::{WebSocket, WebSocketUpgrade, Message};
use dashmap::DashMap;
use std::sync::Arc;

/// 活跃连接表: user_id → sender
pub struct ConnectionManager {
    connections: DashMap<String, tokio::sync::mpsc::UnboundedSender<String>>,
}

// WS 握手
async fn ws_handler(
    ws: WebSocketUpgrade,
    auth: JwtAuth,
    manager: Arc<ConnectionManager>,
) -> impl IntoResponse {
    ws.on_upgrade(move |socket| handle_socket(socket, auth.user_id, manager))
}

// WS 消息循环
async fn handle_socket(socket: WebSocket, user_id: String, manager: Arc<ConnectionManager>) {
    // 1. 注册连接
    let (mut ws_sender, mut ws_receiver) = socket.split();
    let (tx, mut rx) = tokio::sync::mpsc::unbounded_channel();
    manager.connections.insert(user_id.clone(), tx);

    // 2. 读取客户端消息（ping/pong）
    tokio::spawn(async move {
        while let Some(msg) = ws_receiver.next().await {
            match msg {
                Ok(Message::Ping(data)) => { /* pong back */ }
                Ok(Message::Close(_)) => break,
                _ => {}
            }
        }
        manager.connections.remove(&user_id);
    });

    // 3. 向客户端推送
    while let Some(data) = rx.recv().await {
        ws_sender.send(Message::Text(data)).await.ok();
    }
}
```

### Decision 2: NATS→WS 桥接

Gateway 启动时订阅所有通知相关的 NATS Subject，收到事件后查找目标用户的 WS 连接并推送。

```rust
// services/gateway/src/ws/bridge.rs
async fn start_nats_bridge(nats: NatsClient, manager: Arc<ConnectionManager>) {
    // 订阅所有通知事件
    let subjects = [
        "luhanxin.events.article.commented",
        "luhanxin.events.article.liked",
        "luhanxin.events.user.mentioned",
        "luhanxin.events.system.announcement",
    ];

    for subject in &subjects {
        let sub = nats.subscribe(subject).await?;
        tokio::spawn(process_events(sub, manager.clone()));
    }
}

async fn process_events(sub: Subscription, manager: Arc<ConnectionManager>) {
    while let Some(msg) = sub.next().await {
        let event: NotificationEvent = deserialize(&msg.payload);
        // 推送给目标用户
        if let Some(tx) = manager.connections.get(&event.target_user_id) {
            tx.send(serialize(&event));
        }
    }
}
```

### Decision 3: WS 消息格式（Protobuf）

```protobuf
// proto/luhanxin/community/v1/websocket.proto
message WsMessage {
  string type = 1;  // "notification" | "interaction" | "system"
  bytes payload = 2;  // Protobuf 编码的事件数据
  int64 timestamp = 3;
}
```

### Decision 4: 前端 WS Client

```typescript
// packages/ws-client/src/index.ts
export class WsClient {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectDelay = 30000;

  connect(token: string) {
    this.ws = new WebSocket(`ws://localhost:8000/ws?token=${token}`);
    this.ws.onmessage = (event) => this.handleMessage(event);
    this.ws.onclose = () => this.reconnect();
  }

  private reconnect() {
    const delay = Math.min(1000 * 2 ** this.reconnectAttempts, this.maxReconnectDelay);
    setTimeout(() => this.connect(this.token), delay);
    this.reconnectAttempts++;
  }

  onNotification(callback: (notification: any) => void) {
    this.notificationCallbacks.push(callback);
  }
}
```

### Decision 5: JWT 认证

WS 握手认证两种方案：

| 方案 | 说明 | 安全性 |
|------|------|--------|
| **Query 参数** | `/ws?token=xxx` | ⚠️ token 在 URL 中，可能被日志记录 |
| **Subprotocol** | `Sec-WebSocket-Protocol: Bearer xxx` | ✅ 更安全 |

选择 **Subprotocol 方案**：客户端在握手时通过 `protocols` 传递 JWT。

## Risks / Trade-offs

| 风险 | 影响 | 缓解措施 |
|------|------|---------|
| 连接数上限 | Gateway 内存压力 | 连接池管理 + 自动清理断开连接 |
| NATS 消息丢失 | 通知丢失 | 离线期间的通知下次轮询补齐 |
| 重连风暴 | 服务重启后大量重连 | 指数退避 + 随机抖动 |

## Open Questions（已解决）

1. **是否需要支持消息回执？**
   - ✅ 选择：**支持**
   - 理由：用户体验好，消息可达性高，发送方可知消息已读
   - 实现：消息状态（sent → delivered → read），客户端发送 `MESSAGE_READ` 事件

2. **离线消息如何处理？**
   - ✅ 已在 Decision 0 中解决
   - 下次连接时批量推送最近 50 条未读消息

3. **是否需要多设备同步？**
   - ✅ 已在 Decision 0 中解决
   - 用户 ID 关联多个 WS 连接，广播到所有设备
