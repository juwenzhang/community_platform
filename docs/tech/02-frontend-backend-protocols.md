# 前后端交互协议对比 — HTTP/1.1 · HTTP/2 · HTTP/3 · SSE · WebSocket · gRPC

> 📅 创建日期：2026-03-20
> 📌 作者：luhanxin
> 🏷️ 标签：技术文档 · 网络协议 · 前后端通信

---

## 1. 概述

前后端通信协议的选择直接影响应用的 **性能、实时性、开发体验和可维护性**。本文档系统对比主流协议，为 **luhanxin community platform** 的技术选型提供参考。

### 协议全景图

```
┌─────────────────────────────────────────────────────────────┐
│                     应用层协议                                │
│  ┌───────┐ ┌───────┐ ┌───────┐ ┌─────┐ ┌──────────┐ ┌────┐│
│  │HTTP/1.1│ │HTTP/2 │ │HTTP/3 │ │ SSE │ │WebSocket │ │gRPC││
│  └───┬───┘ └───┬───┘ └───┬───┘ └──┬──┘ └────┬─────┘ └──┬─┘│
│      │         │         │        │          │          │   │
├──────┼─────────┼─────────┼────────┼──────────┼──────────┼───┤
│      │         │         │        │          │          │   │
│  ┌───▼─────────▼──┐  ┌──▼───┐ ┌──▼──────────▼──┐  ┌───▼──┐│
│  │   TCP + TLS    │  │ QUIC │ │  TCP + TLS      │  │TCP/  ││
│  │                │  │(UDP) │ │  (升级协议)       │  │QUIC  ││
│  └────────────────┘  └──────┘ └─────────────────┘  └──────┘│
│                     传输层                                   │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. HTTP/1.1 — 经典基石

### 2.1 核心特点

- **1999 年发布** (RFC 2616)，Web 的基础协议
- **文本协议** — Header 和 Body 均为明文
- **持久连接** (`Connection: keep-alive`) — 复用 TCP 连接
- **请求-响应模型** — 严格的一问一答

### 2.2 工作原理

```
客户端                                  服务端
  │                                      │
  │── GET /api/articles ──────────────▶│  ← 请求 1
  │◀── 200 OK { articles: [...] } ────│  ← 响应 1
  │                                      │
  │── GET /api/user/me ───────────────▶│  ← 请求 2 (必须等响应 1)
  │◀── 200 OK { user: {...} } ────────│  ← 响应 2
  │                                      │
  │  ⚠️ 队头阻塞 (Head-of-Line Blocking)  │
  │  请求 2 必须等请求 1 完成              │
```

### 2.3 主要限制

| 限制 | 影响 |
|------|------|
| **队头阻塞 (HOL)** | 一个慢请求阻塞后续所有请求 |
| **串行请求** | 同一连接上请求必须顺序执行 |
| **头部冗余** | 每次请求重复发送完整 Header (Cookie 等) |
| **6 连接限制** | 浏览器对同一域名限制 6 个并发连接 |
| **无服务端推送** | 只能客户端发起请求 |

### 2.4 优化手段 (Workaround)

```
HTTP/1.1 时代的「黑科技」:
├── 域名分片 (Domain Sharding) — 绕过连接数限制
├── 资源合并 (Bundling) — 减少请求数
├── 雪碧图 (Sprite) — 合并小图片
├── 内联资源 (Inlining) — Base64 内联小文件
└── 管道化 (Pipelining) — 理论可并发，实际很少使用
```

---

## 3. HTTP/2 — 多路复用革命

### 3.1 核心特点

- **2015 年发布** (RFC 7540)，基于 Google SPDY
- **二进制分帧** — Header 和 Body 都是二进制帧
- **多路复用** — 单连接并发多个请求/响应
- **Header 压缩** — HPACK 算法
- **服务端推送** — Server Push (已在 HTTP/3 中弃用)
- **流优先级** — 可设置请求优先级

### 3.2 工作原理

```
客户端                                   服务端
  │           单个 TCP 连接               │
  │═══════════════════════════════════════│
  │                                       │
  │── Stream 1: GET /api/articles ────▶│
  │── Stream 2: GET /api/user/me ─────▶│  ← 并行发送!
  │── Stream 3: GET /api/tags ────────▶│
  │                                       │
  │◀── Stream 2: 200 OK { user } ─────│  ← 无序返回
  │◀── Stream 1: 200 OK { articles } ──│  ← 先到先响应
  │◀── Stream 3: 200 OK { tags } ─────│
  │                                       │
  │  ✅ 无队头阻塞 (应用层)              │
  │  ⚠️ TCP 层仍有队头阻塞              │
```

### 3.3 二进制分帧

```
HTTP/1.1 (文本):
GET /api/articles HTTP/1.1\r\n
Host: api.luhanxin.dev\r\n
Accept: application/protobuf\r\n
\r\n

HTTP/2 (二进制帧):
┌──────────┬────────┬──────────────────────┐
│ Length(3)│Type(1) │ Flags(1) │ Stream ID │
├──────────┴────────┴──────────────────────┤
│           Frame Payload                   │
└───────────────────────────────────────────┘
帧类型: HEADERS, DATA, SETTINGS, PUSH_PROMISE, ...
```

### 3.4 HPACK 头部压缩

```
第一次请求:
:method: GET
:path: /api/articles
:authority: api.luhanxin.dev
authorization: Bearer eyJhbG...  ← 完整发送

第二次请求:
:method: GET
:path: /api/user/me               ← 只发变化的字段!
(其余字段引用静态/动态表索引)

压缩效果: Header 大小减少 80-90%
```

### 3.5 改进 vs 限制

| 改进 | 数据 |
|------|------|
| 多路复用 | 单连接承载数百个并发流 |
| Header 压缩 | 减少 80-90% Header 体积 |
| 二进制协议 | 解析更快、更紧凑 |
| Server Push | 主动推送关联资源 (已弃用) |

| 仍存在的限制 | 原因 |
|-------------|------|
| **TCP 队头阻塞** | 底层 TCP 丢包时所有流都被阻塞 |
| **TCP 握手延迟** | 仍需 TCP 三次握手 + TLS 握手 |
| **连接迁移困难** | TCP 四元组绑定，Wi-Fi → 4G 需重建连接 |

---

## 4. HTTP/3 — QUIC 革新

### 4.1 核心特点

- **2022 年发布** (RFC 9114)
- **基于 QUIC 协议** (UDP) — 彻底解决 TCP 队头阻塞
- **0-RTT / 1-RTT** — 极快的连接建立
- **内建加密** — TLS 1.3 集成在 QUIC 中
- **连接迁移** — IP 变化不断连接 (Connection ID)

### 4.2 QUIC vs TCP

```
TCP + TLS 1.2 连接建立 (3-RTT):
客户端 ──SYN──────────▶ 服务端     ← 1 RTT (TCP)
客户端 ◀──SYN-ACK──────  服务端
客户端 ──ACK──────────▶ 服务端
客户端 ──ClientHello──▶ 服务端     ← 2 RTT (TLS)
客户端 ◀──ServerHello── 服务端
客户端 ──Finished─────▶ 服务端     ← 3 RTT
客户端 ──Data─────────▶ 服务端     ← 终于发数据!

QUIC 连接建立 (1-RTT, 恢复时 0-RTT):
客户端 ──Initial──────▶ 服务端     ← 1 RTT (QUIC + TLS 合并)
客户端 ◀──Handshake─── 服务端
客户端 ──Data─────────▶ 服务端     ← 立刻发数据!

0-RTT 恢复 (已访问过的服务端):
客户端 ──0-RTT Data───▶ 服务端     ← 0 RTT! 首包即数据!
```

### 4.3 流级别无队头阻塞

```
TCP (HTTP/2):
Stream 1: [Packet A] [Packet B ❌丢失] [Packet C]
Stream 2: [Packet D] [Packet E]  ← 被 Packet B 阻塞!
                                    TCP 必须按序交付

QUIC (HTTP/3):
Stream 1: [Packet A] [Packet B ❌丢失] [Packet C] ← 等待重传
Stream 2: [Packet D] [Packet E]  ← 不受影响, 立即交付!
                                    每个流独立有序
```

### 4.4 连接迁移

```
场景：用户从 Wi-Fi 切换到 4G

TCP (HTTP/2):
Wi-Fi: 192.168.1.100:54321 ↔ 服务端:443  ← TCP 连接 (四元组绑定)
4G:    10.0.0.5:12345 ↔ 服务端:443        ← 必须重建连接! 重新握手!

QUIC (HTTP/3):
Wi-Fi: Connection ID = 0xABCD ↔ 服务端    ← 基于 Connection ID
4G:    Connection ID = 0xABCD ↔ 服务端    ← 同一连接! 无感知切换!
```

### 4.5 当前生态状况 (2026)

| 平台 | 支持情况 |
|------|---------|
| Chrome/Edge | ✅ 默认启用 |
| Firefox | ✅ 默认启用 |
| Safari | ✅ 默认启用 |
| Node.js | ✅ 实验性支持 (--experimental-quic) |
| Rust (hyper/h3) | ✅ 支持 (quinn + h3) |
| Nginx | ✅ 1.25+ 原生支持 |
| Cloudflare | ✅ 全面支持 |

---

## 5. Server-Sent Events (SSE) — 服务端推送

### 5.1 核心特点

- **单向推送** — 服务端 → 客户端 (基于 HTTP)
- **自动重连** — 浏览器内建断线重连
- **文本协议** — `text/event-stream`
- **简单易用** — 标准 EventSource API

### 5.2 工作原理

```
客户端                                 服务端
  │                                     │
  │── GET /api/events ────────────────▶│
  │   Accept: text/event-stream         │
  │                                     │
  │◀── HTTP 200 ──────────────────────│
  │    Content-Type: text/event-stream  │
  │    Transfer-Encoding: chunked       │
  │                                     │
  │◀── data: {"type":"like"} ─────────│  ← 推送事件 1
  │                                     │
  │◀── data: {"type":"comment"} ──────│  ← 推送事件 2
  │                                     │
  │    ... (连接保持, 持续推送) ...       │
  │                                     │
  │◀── : keepalive ───────────────────│  ← 心跳
  │                                     │
  │    ... 连接断开 ...                  │
  │── GET /api/events ────────────────▶│  ← 自动重连!
  │   Last-Event-ID: 42                 │  ← 断点续传!
```

### 5.3 SSE 数据格式

```
event: notification
id: 42
retry: 5000
data: {"type":"like","user":"alice","article_id":"abc123"}

event: notification
id: 43
data: {"type":"comment","user":"bob","article_id":"abc123"}

: this is a comment (keepalive)
```

### 5.4 前端使用

```typescript
// 浏览器原生 API — 零依赖
const eventSource = new EventSource('/api/events', {
  withCredentials: true,
});

eventSource.addEventListener('notification', (event) => {
  const data = JSON.parse(event.data);
  console.log('收到通知:', data);
});

eventSource.onerror = () => {
  console.log('连接断开，自动重连中...');
};
```

### 5.5 适用场景

- ✅ **通知推送** — 新消息、新评论提醒
- ✅ **实时数据** — 股票价格、在线人数
- ✅ **AI 流式输出** — ChatGPT 式打字机效果 (SSE 是 LLM 流式响应的标准方案)
- ✅ **日志流** — 实时日志查看
- ❌ **不适合** — 需要客户端→服务端实时通信的场景

---

## 6. WebSocket — 全双工通信

### 6.1 核心特点

- **全双工** — 客户端 ↔ 服务端双向实时通信
- **持久连接** — 一次握手，持续通信
- **低延迟** — 无 HTTP 头部开销
- **支持二进制** — 可直接传输 Protobuf

### 6.2 工作原理

```
客户端                                  服务端
  │                                      │
  │── HTTP Upgrade: websocket ─────────▶│  ← 升级握手
  │◀── 101 Switching Protocols ────────│
  │                                      │
  │══════════ WebSocket 连接建立 ══════════│
  │                                      │
  │── {"action":"subscribe","ch":"feed"}▶│  ← 客户端发消息
  │                                      │
  │◀── {"type":"new_article",...} ─────│  ← 服务端推消息
  │── {"action":"like","id":"abc"} ────▶│  ← 客户端发消息
  │◀── {"type":"like_count","count":42}│  ← 服务端推消息
  │                                      │
  │◀── ping ──────────────────────────│  ← 心跳
  │── pong ───────────────────────────▶│
  │                                      │
  │── close ──────────────────────────▶│  ← 关闭连接
  │◀── close ─────────────────────────│
```

### 6.3 前端使用

```typescript
const ws = new WebSocket('wss://api.luhanxin.dev/ws');

ws.onopen = () => {
  ws.send(JSON.stringify({
    action: 'subscribe',
    channels: ['notifications', 'feed_updates'],
  }));
};

ws.onmessage = (event) => {
  // 可以接收文本或二进制 (Protobuf)
  if (event.data instanceof Blob) {
    // Protobuf 二进制消息
    const buffer = await event.data.arrayBuffer();
    const notification = Notification.decode(new Uint8Array(buffer));
  } else {
    // JSON 文本消息
    const data = JSON.parse(event.data);
  }
};
```

### 6.4 适用场景

- ✅ **实时聊天** — 即时消息
- ✅ **协同编辑** — 多人实时编辑
- ✅ **在线游戏** — 低延迟双向通信
- ✅ **实时通知** — 需要客户端也推消息时
- ❌ **不适合** — 简单的单向推送（SSE 更简单）
- ❌ **不适合** — RESTful API 请求（HTTP 更合适）

---

## 7. gRPC — 高性能 RPC 框架

### 7.1 核心特点

- **Google 开源** — 基于 HTTP/2 + Protobuf
- **四种通信模式** — Unary / Server Stream / Client Stream / Bidirectional
- **强类型** — 基于 `.proto` 定义服务接口
- **高性能** — 二进制传输 + HTTP/2 多路复用
- **代码生成** — 自动生成客户端/服务端代码

### 7.2 四种通信模式

```protobuf
service CommunityService {
  // 1. Unary — 一请求一响应 (类似 REST)
  rpc GetArticle(GetArticleRequest) returns (Article);

  // 2. Server Streaming — 服务端流式返回
  rpc ListArticles(ListArticlesRequest) returns (stream Article);

  // 3. Client Streaming — 客户端流式发送
  rpc UploadChunks(stream FileChunk) returns (UploadResponse);

  // 4. Bidirectional Streaming — 双向流
  rpc Chat(stream ChatMessage) returns (stream ChatMessage);
}
```

### 7.3 gRPC-Web — 浏览器集成

原生 gRPC 使用 HTTP/2 Trailers，浏览器不完全支持。解决方案：

```
方案 1: gRPC-Web + Envoy Proxy
  浏览器 ──gRPC-Web──▶ Envoy Proxy ──gRPC──▶ 后端服务

方案 2: Connect Protocol (推荐)
  浏览器 ──Connect (HTTP)──▶ Connect 服务端 (直接兼容)
  - 同时支持 gRPC、gRPC-Web、Connect 三种协议
  - 无需代理！
```

### 7.4 Connect Protocol — 现代 gRPC 替代

```
Connect vs gRPC-Web:
┌───────────────────┬──────────────┬──────────────────┐
│                   │   gRPC-Web   │    Connect       │
├───────────────────┼──────────────┼──────────────────┤
│ 需要代理          │ ✅ Envoy     │ ❌ 直连          │
│ 支持 Streaming    │ ⚠️ 受限     │ ✅ 完整支持      │
│ 可读性            │ ❌ 二进制     │ ✅ 支持 JSON     │
│ curl 调试         │ ❌            │ ✅ 普通 HTTP     │
│ 浏览器支持        │ ⚠️ 需 polyfill│ ✅ 标准 fetch    │
│ Protobuf 兼容     │ ✅            │ ✅               │
│ 与 gRPC 互通      │ ✅            │ ✅               │
└───────────────────┴──────────────┴──────────────────┘
```

### 7.5 Rust 端实现 (Tonic)

```rust
// services/svc-content/src/grpc.rs
use tonic::{Request, Response, Status};
use crate::proto::community::v1::{
    article_service_server::ArticleService,
    GetArticleRequest, Article,
};

#[derive(Default)]
pub struct ArticleServiceImpl;

#[tonic::async_trait]
impl ArticleService for ArticleServiceImpl {
    async fn get_article(
        &self,
        request: Request<GetArticleRequest>,
    ) -> Result<Response<Article>, Status> {
        let req = request.into_inner();
        // 业务逻辑...
        Ok(Response::new(article))
    }
}
```

---

## 8. 综合对比矩阵

### 8.1 特性对比

| 特性 | HTTP/1.1 | HTTP/2 | HTTP/3 | SSE | WebSocket | gRPC |
|------|----------|--------|--------|-----|-----------|------|
| **传输层** | TCP | TCP | QUIC (UDP) | TCP | TCP | TCP/QUIC |
| **通信方向** | 请求-响应 | 请求-响应 | 请求-响应 | 服务端→客户端 | 双向 | 四种模式 |
| **多路复用** | ❌ | ✅ | ✅ | ❌ | ❌ | ✅ |
| **队头阻塞** | ❌ 应用+传输层 | ⚠️ 传输层 | ✅ 无 | N/A | N/A | ⚠️/✅ |
| **头部压缩** | ❌ | ✅ HPACK | ✅ QPACK | ❌ | ❌ | ✅ HPACK |
| **二进制传输** | ❌ | ✅ | ✅ | ❌ 文本 | ✅ | ✅ |
| **连接建立** | 1-3 RTT | 1-3 RTT | 0-1 RTT | 1-3 RTT | 1 RTT+升级 | 1-3 RTT |
| **连接迁移** | ❌ | ❌ | ✅ | ❌ | ❌ | ❌/✅ |
| **浏览器原生** | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ 需库 |
| **自动重连** | ❌ | ❌ | ❌ | ✅ 内建 | ❌ 需手动 | ❌ 需手动 |
| **负载均衡** | ✅ 简单 | ✅ | ✅ | ✅ | ⚠️ 粘性 | ⚠️ 需特殊 |
| **缓存** | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |

### 8.2 性能对比

| 指标 | HTTP/1.1 | HTTP/2 | HTTP/3 | SSE | WebSocket | gRPC |
|------|----------|--------|--------|-----|-----------|------|
| **首次连接延迟** | 高 | 中 | 低 | 高 | 中 | 中 |
| **并发请求效率** | 低 | 高 | 高 | N/A | N/A | 高 |
| **实时性** | 低 | 低 | 低 | 中 | 高 | 高 |
| **带宽利用率** | 低 | 高 | 高 | 中 | 高 | 高 |
| **弱网表现** | 差 | 中 | 优 | 差 | 差 | 中/优 |

### 8.3 适用场景

| 场景 | 推荐协议 | 原因 |
|------|---------|------|
| **REST API** | HTTP/2 + Protobuf | 多路复用 + 高效编码 |
| **文件上传/下载** | HTTP/2 / HTTP/3 | 流式传输 + 断点续传 |
| **实时通知 (单向)** | SSE | 简单、自动重连、浏览器原生 |
| **实时聊天 (双向)** | WebSocket | 全双工、低延迟 |
| **AI 流式输出** | SSE | 标准方案，广泛支持 |
| **微服务间通信** | gRPC (Tonic) | 强类型 + 高性能 + Streaming |
| **弱网环境** | HTTP/3 (QUIC) | 0-RTT + 连接迁移 + 无队头阻塞 |
| **前端→后端 API** | Connect Protocol | gRPC 兼容 + 浏览器友好 |

---

## 9. luhanxin community platform 协议选型

### 9.1 整体架构

```
┌─────────────────────────────────────────────────────────┐
│                     浏览器 (前端)                         │
│                                                          │
│  ┌──────────────┐  ┌───────────┐  ┌──────────────────┐  │
│  │ API 请求      │  │ 实时通知   │  │ AI 流式输出      │  │
│  │ HTTP/2       │  │ WebSocket │  │ SSE              │  │
│  │ + Protobuf   │  │ + Protobuf│  │ + JSON/Protobuf  │  │
│  └──────┬───────┘  └─────┬─────┘  └────────┬─────────┘  │
│         │                │                  │            │
└─────────┼────────────────┼──────────────────┼────────────┘
          │                │                  │
          ▼                ▼                  ▼
┌─────────────────────────────────────────────────────────┐
│                  API Gateway (Rust/Axum)                  │
│            HTTP/2 + WebSocket + SSE 统一接入              │
└────────┬───────────┬────────────┬────────────────────────┘
         │           │            │
    ┌────▼────┐ ┌────▼────┐ ┌────▼────┐
    │ svc-*   │ │ svc-*   │ │ svc-*   │
    │ (gRPC   │ │ (gRPC   │ │ (gRPC   │
    │ +Protobuf)│ │ +Protobuf)│ │ +Protobuf)│
    └─────────┘ └─────────┘ └─────────┘
    后端微服务间: gRPC (Tonic) + Protobuf
```

### 9.2 协议选择决策

| 通信场景 | 协议 | 数据格式 | 理由 |
|---------|------|---------|------|
| **前端 → Gateway (API)** | HTTP/2 | Protobuf | 多路复用 + 体积小 + 类型安全 |
| **Gateway → 前端 (通知)** | WebSocket | Protobuf | 全双工，支持客户端订阅 |
| **AI 流式响应** | SSE | JSON (text/event-stream) | 浏览器原生支持，LLM 标准方案 |
| **Gateway ↔ 微服务** | gRPC | Protobuf | 高性能 RPC + 代码生成 |
| **微服务 ↔ 微服务** | gRPC | Protobuf | 强类型 + 四种通信模式 |
| **事件驱动** | Redis Streams | Protobuf 编码 | 异步解耦 + 高吞吐 |
| **文件上传** | HTTP/2 | multipart/form-data | 标准方案 |
| **静态资源** | HTTP/3 (CDN) | - | 0-RTT + 弱网优化 |

### 9.3 为什么用 WebSocket 而非 SSE 做通知?

```
SSE (单向):
  ✅ 简单、自动重连
  ❌ 不支持客户端发消息
  ❌ 不支持二进制 (Protobuf)
  ❌ 无法动态订阅/取消订阅频道

WebSocket (双向):
  ✅ 双向通信 — 客户端可以 subscribe/unsubscribe
  ✅ 支持二进制 — 直接传输 Protobuf
  ✅ 更灵活 — 可以实现复杂的消息路由
  ⚠️ 需要手动实现重连逻辑

决策：通知场景需要客户端主动订阅频道，选择 WebSocket + Protobuf
```

### 9.4 未来演进路线

```
Phase 1 (MVP):
├── 前端 → Gateway: HTTP/2 + Protobuf (Connect Protocol)
├── 通知: WebSocket + Protobuf
└── 服务间: HTTP + Protobuf (简单起步)

Phase 2:
├── 服务间: 迁移到 gRPC (Tonic)
├── AI 功能: SSE 流式输出
└── CDN: 开启 HTTP/3

Phase 3:
├── Gateway: 支持 HTTP/3 (QUIC)
├── 边缘计算: QUIC 优化弱网体验
└── 双向实时: WebSocket → WebTransport (未来标准)
```

---

## 10. 速查表

### 10.1 何时用什么?

```
我需要...

📋 获取/修改数据 (CRUD)
   → HTTP/2 + Protobuf (Connect Protocol)

🔔 服务端推送通知给客户端
   → WebSocket + Protobuf (需要客户端订阅)
   → SSE (简单单向推送)

🤖 AI 流式生成文本
   → SSE (LLM 标准方案)

💬 实时双向通信 (聊天)
   → WebSocket + Protobuf

⚡ 微服务间高性能调用
   → gRPC + Protobuf (Tonic)

📁 文件上传/下载
   → HTTP/2 + multipart/form-data

🌐 CDN 静态资源
   → HTTP/3 (QUIC) 最优
```

### 10.2 版本演进时间线

```
1996 ── HTTP/1.0    基础请求-响应
1999 ── HTTP/1.1    持久连接、分块传输
2008 ── WebSocket   全双工通信
2009 ── SPDY        HTTP/2 前身 (Google)
2012 ── SSE         服务端推送 (HTML5)
2015 ── HTTP/2      多路复用、头部压缩
2015 ── gRPC        Google 开源 RPC 框架
2022 ── HTTP/3      QUIC (UDP)、0-RTT
2024+── WebTransport 下一代实时通信 (开发中)
```

---

> 📚 参考资料：
> - [HTTP/2 RFC 7540](https://httpwg.org/specs/rfc7540.html)
> - [HTTP/3 RFC 9114](https://httpwg.org/specs/rfc9114.html)
> - [QUIC RFC 9000](https://www.rfc-editor.org/rfc/rfc9000.html)
> - [Connect Protocol](https://connectrpc.com/docs/protocol)
> - [gRPC 官方文档](https://grpc.io/)
> - [Server-Sent Events MDN](https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events)
> - [WebSocket MDN](https://developer.mozilla.org/en-US/docs/Web/API/WebSockets_API)
