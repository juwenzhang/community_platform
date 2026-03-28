# 后端服务发现与消息队列 — 技术调研与架构决策

> 📅 创建日期：2026-03-23
> 📌 作者：luhanxin
> 🏷️ 标签：技术文档 · 服务发现 · 消息队列 · Consul · NATS · Rust

---

## 1. 问题背景

### 1.1 现状分析

```
当前架构（硬编码模式）:

  前端 (5173)                Gateway (8000)               svc-user (50051)
  ┌──────────┐    gRPC-Web   ┌──────────────┐   gRPC     ┌──────────────┐
  │  React   │──────────────▶│    Axum      │──────────▶│    Tonic     │
  │  Connect │               │              │            │              │
  └──────────┘               └──────────────┘            └──────────────┘
                                    │
                                    │  SVC_USER_URL=http://127.0.0.1:50051
                                    │  ← 硬编码环境变量 ❌
```

**痛点**：
- 每增一个微服务，Gateway 就多一个环境变量
- 服务重启后端口/地址可能变化，需要手动同步
- 无法感知服务健康状态
- 纯同步调用，缺少异步事件驱动能力

### 1.2 目标架构

```
目标架构（动态发现 + 异步事件）:

  前端 (5173)                Gateway (8000)
  ┌──────────┐    gRPC-Web   ┌──────────────────────────────────┐
  │  React   │──────────────▶│  Interceptor Pipeline            │
  │  Connect │               │  ┌─────┐ ┌──────┐ ┌───────────┐ │
  └──────────┘               │  │ Log │→│ Auth │→│ RPC Call  │ │
                              │  └─────┘ └──────┘ └─────┬─────┘ │
                              │                          │       │
                              │  ┌─────────────────┐     │       │
                              │  │ ServiceResolver  │◀────┘       │
                              │  │ (Consul + Pool)  │             │
                              │  └────────┬────────┘             │
                              │           │                       │
                              │  ┌────────▼────────┐             │
                              │  │ RetryInterceptor│──┐          │
                              │  └─────────────────┘  │          │
                              └───────────────────────┼──────────┘
                                                       │
              ┌────────────────────────────────────────┼───────────────┐
              │                                        │               │
     ┌────────▼────────┐  ┌────────────────┐  ┌───────▼───────┐       │
     │     Consul      │  │      NATS      │  │   svc-user    │       │
     │  (服务注册中心)   │  │  (消息总线)     │  │  (gRPC Data)  │       │
     │                  │  │                │  │               │       │
     │  ┌────────────┐  │  │  events.*      │  │  ┌─────────┐ │       │
     │  │ svc-user   │  │  │  retry.*       │  │  │ Handler │ │       │
     │  │ :50051 ✓   │  │  │  deadletter.*  │  │  │ (业务)   │ │       │
     │  ├────────────┤  │  │                │  │  └─────────┘ │       │
     │  │ svc-content│  │  └────────────────┘  └───────────────┘       │
     │  │ :50052 ✓   │  │                                              │
     │  └────────────┘  │                                              │
     └─────────────────┘                                               │
              ▲                                                        │
              │  Register + Health Check                               │
              └────────────────────────────────────────────────────────┘
```

---

## 2. 服务发现方案调研

### 2.1 方案对比

| 维度 | Consul | etcd | Redis 自建 | K8s DNS |
|------|--------|------|-----------|---------|
| **定位** | 服务发现 + KV + 健康检查 | 分布式 KV 存储 | 缓存 + 简单注册 | 容器编排内置 |
| **健康检查** | ✅ 原生支持（HTTP/TCP/gRPC/Script） | ❌ 需自建 | ❌ 需自建 TTL | ✅ 但仅限 K8s |
| **Watch 机制** | ✅ 长轮询 + Blocking Query | ✅ Watch API | ❌ 需轮询或 Pub/Sub | ✅ DNS 更新 |
| **DNS 发现** | ✅ 内置 DNS 接口 | ❌ | ❌ | ✅ |
| **Web UI** | ✅ 内置 | ❌ | ❌ | Dashboard |
| **Rust 生态** | HTTP API 直接调用 | `etcd-client` crate | `redis` crate | 需在 K8s 内 |
| **运维复杂度** | 中（单节点 dev 模式简单） | 中 | 低（已有 Redis） | 高（需 K8s） |
| **生产扩展** | ✅ 集群 + Consul Connect | ✅ Raft 集群 | ❌ 不适合 | ✅ 原生 |
| **适合阶段** | MVP → 生产 | 偏基础设施 | 仅 MVP | 生产 |

### 2.2 决策：选择 Consul

**核心理由**：

1. **开箱即用的健康检查** — Consul 原生支持 gRPC 健康检查协议，不需要额外实现。etcd 和 Redis 都需要自建
2. **Watch 能力** — Consul 的 Blocking Query（长轮询）比轮询高效，Gateway 可以实时感知服务变化
3. **从 dev 到 prod 平滑过渡** — dev 模式单节点零配置，prod 可升级到集群 + Consul Connect 服务网格
4. **不耦合存储层** — 如果用 Redis 做服务发现，Redis 的职责就不纯粹了（缓存 + 消息 + 服务发现混在一起）

### 2.3 Consul 核心概念

```
┌─────────────────────────────────────────────────┐
│                  Consul Cluster                  │
│                                                  │
│  ┌──────────────────────────────────────────┐   │
│  │            Service Catalog                │   │
│  │                                           │   │
│  │  Service: svc-user                        │   │
│  │  ├── Instance: svc-user-host1:50051  ✅   │   │
│  │  └── Instance: svc-user-host2:50051  ✅   │   │
│  │                                           │   │
│  │  Service: svc-content                     │   │
│  │  └── Instance: svc-content-host1:50052 ✅ │   │
│  └──────────────────────────────────────────┘   │
│                                                  │
│  ┌──────────────┐  ┌──────────────────────┐     │
│  │ Health Check  │  │ Key/Value Store      │     │
│  │ (gRPC/HTTP)   │  │ (配置管理，暂不使用)   │     │
│  └──────────────┘  └──────────────────────┘     │
│                                                  │
│  API: http://localhost:8500/v1/                  │
│  DNS: dig @localhost -p 8600 svc-user.service.   │
│       consul                                     │
└─────────────────────────────────────────────────┘
```

**关键 API**:

| API | 用途 | 调用方 |
|-----|------|--------|
| `PUT /v1/agent/service/register` | 注册服务实例 | svc-xxx 启动时 |
| `PUT /v1/agent/service/deregister/:id` | 注销服务实例 | svc-xxx 关闭时 |
| `GET /v1/health/service/:name?passing=true` | 查询健康实例 | Gateway |
| `GET /v1/health/service/:name?index=N&wait=30s` | Watch 变更（长轮询） | Gateway 后台 |

### 2.4 Consul Blocking Query 算法

这是 Consul 实现 Watch 的核心机制，替代传统轮询：

```
┌──────────────────────────────────────────────────────┐
│  Consul Blocking Query（长轮询）工作原理               │
│                                                       │
│  Gateway                          Consul              │
│  ───────                          ──────              │
│     │                                │                │
│     │  GET /health/service/svc-user  │                │
│     │  ?index=0&wait=30s             │                │
│     │───────────────────────────────▶│                │
│     │                                │ (等待变化...)   │
│     │                                │                │
│     │     [svc-user 注册了新实例]      │                │
│     │                                │                │
│     │  200 OK                        │                │
│     │  X-Consul-Index: 42            │  ← 新的 index  │
│     │  Body: [instance1, instance2]  │                │
│     │◀───────────────────────────────│                │
│     │                                │                │
│     │  GET /health/service/svc-user  │                │
│     │  ?index=42&wait=30s            │  ← 用上次的 index │
│     │───────────────────────────────▶│                │
│     │                                │ (等待下次变化)  │
│     │                                │                │
│     │  ... 30s 超时无变化 ...          │                │
│     │                                │                │
│     │  200 OK (same data)            │                │
│     │  X-Consul-Index: 42            │  ← index 不变  │
│     │◀───────────────────────────────│                │
│     │                                │                │
│     │  (继续下一轮 Blocking Query)    │                │
│                                                       │
│  优势:                                                 │
│  - 比轮询高效：无变化时 HTTP 连接挂起，不消耗 CPU       │
│  - 比 WebSocket 简单：纯 HTTP，无需维护长连接状态       │
│  - 变化时立即返回，延迟接近实时                         │
└──────────────────────────────────────────────────────┘
```

---

## 3. 消息队列方案调研

### 3.1 方案对比

| 维度 | NATS | Kafka | Redis Streams | RabbitMQ |
|------|------|-------|---------------|----------|
| **定位** | 轻量高性能消息系统 | 分布式事件流平台 | Redis 内置流 | 传统消息队列 |
| **投递语义** | At-most-once (Core) / At-least-once (JetStream) | At-least-once / Exactly-once | At-least-once | At-least-once |
| **持久化** | Core: 内存 / JetStream: 磁盘 | ✅ 磁盘 | ✅ RDB/AOF | ✅ 磁盘 |
| **吞吐量** | ~10M msg/s | ~1M msg/s | ~100K msg/s | ~50K msg/s |
| **Docker 镜像** | ~20MB | ~400MB+ (含 ZooKeeper) | 已有 | ~150MB |
| **Rust 客户端** | `async-nats`（官方） | `rdkafka`（需 librdkafka） | `redis` crate | `lapin` |
| **模式** | Pub/Sub + Request/Reply | Pub/Sub + Consumer Group | Stream + Consumer Group | Queue + Exchange + Routing |
| **运维复杂度** | 极低（单二进制） | 高（ZK/KRaft + Broker） | 低（已有 Redis） | 中 |
| **适合场景** | 微服务事件 + 轻量 RPC | 大数据管道 + 事件溯源 | 简单队列 | 复杂路由 |

### 3.2 决策：选择 NATS

**核心理由**：

1. **极致轻量** — 单二进制文件，Docker 镜像 < 20MB，启动秒级。对比 Kafka 需要 ZooKeeper + Broker 两个进程，镜像 400MB+
2. **Rust 生态一流** — `async-nats` 是 NATS 官方维护的 Rust 客户端，原生 async/await，API 简洁
3. **Pub/Sub + Request/Reply 原生支持** — 完美覆盖我们的两个场景：事件驱动（Pub/Sub）和异步重试（Request/Reply）
4. **升级路径清晰** — Core NATS → JetStream 无缝升级，需要持久化时只需配置开启 JetStream，客户端代码几乎不变

### 3.3 NATS Core vs JetStream

```
┌──────────────────────────────────────────────────────┐
│                    NATS 架构                          │
│                                                       │
│  ┌─────────────────────────────────────────────────┐ │
│  │              Core NATS (本次使用)                 │ │
│  │                                                   │ │
│  │  ✅ Pub/Sub（发布/订阅）                          │ │
│  │  ✅ Request/Reply（请求-应答）                     │ │
│  │  ✅ Queue Groups（负载均衡消费）                   │ │
│  │  ❌ 持久化（消息在内存中，断开即丢）               │ │
│  │  ❌ ACK（无确认机制）                             │ │
│  │                                                   │ │
│  │  投递语义: At-Most-Once（最多一次）                │ │
│  └─────────────────────────────────────────────────┘ │
│                                                       │
│  ┌─────────────────────────────────────────────────┐ │
│  │            JetStream (后续升级)                    │ │
│  │                                                   │ │
│  │  ✅ 持久化（消息写入磁盘）                        │ │
│  │  ✅ ACK + 重新投递（消费者崩溃后重试）             │ │
│  │  ✅ Consumer Groups（有状态消费组）                │ │
│  │  ✅ Exactly-Once（精确一次）                      │ │
│  │  ✅ Key-Value Store（分布式 KV）                  │ │
│  │                                                   │ │
│  │  投递语义: At-Least-Once / Exactly-Once           │ │
│  └─────────────────────────────────────────────────┘ │
│                                                       │
│  升级路径: 开启 JetStream 配置 → 创建 Stream →       │
│  客户端改用 jetstream::publish() 即可                 │
└──────────────────────────────────────────────────────┘
```

### 3.4 NATS Subject 路由算法

NATS 的 subject 匹配使用**层级 token + 通配符**模式：

```
Subject 命名规范:
  luhanxin.<type>.<domain>.<action>

通配符:
  *   匹配单个 token    luhanxin.events.*.created  → 匹配所有域的 created 事件
  >   匹配剩余所有      luhanxin.events.user.>     → 匹配 user 域的所有事件

示例:
  发布: luhanxin.events.user.created
  订阅: luhanxin.events.user.>        ✅ 匹配
  订阅: luhanxin.events.*.created     ✅ 匹配
  订阅: luhanxin.events.article.>     ❌ 不匹配（域不同）
```

---

## 4. 核心算法与数据结构

### 4.1 Round Robin 负载均衡

Gateway 使用客户端 Round Robin 在多个服务实例间分配请求：

```rust
use std::sync::atomic::{AtomicUsize, Ordering};

pub struct ServicePool {
    channels: Vec<Channel>,
    counter: AtomicUsize,
}

impl ServicePool {
    /// O(1) 时间复杂度的 Round Robin
    pub fn next_channel(&self) -> &Channel {
        let idx = self.counter.fetch_add(1, Ordering::Relaxed) % self.channels.len();
        &self.channels[idx]
    }
}
```

**为什么用 `AtomicUsize` 而不是 `Mutex`**:
- `fetch_add` 是无锁原子操作，不会阻塞线程
- 高并发下性能远优于 `Mutex<usize>`（无锁竞争）
- `Ordering::Relaxed` 足够——Round Robin 不需要严格的顺序保证，偶尔重复/跳过一个索引完全可接受

**溢出安全**: `usize::MAX` ≈ 1.8×10¹⁹，即使每秒 100 万请求也需要 58 万年才会溢出。取模操作保证索引始终有效。

### 4.2 指数退避（Exponential Backoff）

重试 Worker 使用指数退避避免重试风暴：

```rust
/// 计算第 n 次重试的等待时间
fn backoff_duration(retry_count: u32) -> Duration {
    // base_delay * 2^retry_count，上限 30 秒
    let delay_secs = std::cmp::min(
        1u64 << retry_count,  // 1, 2, 4, 8, 16...
        30,                    // 上限
    );
    Duration::from_secs(delay_secs)
}

// 重试序列: 1s → 2s → 4s → (超过 max_retries=3，进死信)
```

**为什么是指数而不是固定间隔**:
- 固定间隔（如每次等 1s）在服务长时间不可用时会产生大量无效重试
- 指数退避让间隔快速增长，给下游服务足够的恢复时间
- 加上 jitter（随机抖动）可以防止多个 Worker 同时重试造成的"惊群效应"

### 4.3 Consul Watch 缓存刷新算法

```rust
/// Gateway 后台 Watch 任务（伪代码）
async fn watch_loop(consul: &ConsulClient, cache: &Arc<RwLock<ServicePool>>) {
    let mut index = 0u64;  // Consul Blocking Query index

    loop {
        match consul.watch("svc-user", index).await {
            Ok((instances, new_index)) => {
                if new_index != index {
                    // 有变化：重建 Channel 池
                    let mut pool = cache.write().await;
                    let old_addrs: HashSet<_> = pool.instances.iter()
                        .map(|i| (i.address.clone(), i.port)).collect();
                    let new_addrs: HashSet<_> = instances.iter()
                        .map(|i| (i.address.clone(), i.port)).collect();

                    // 增量更新：只创建/移除变化的 Channel
                    for added in new_addrs.difference(&old_addrs) {
                        pool.add_channel(Channel::from_url(added)).await;
                    }
                    for removed in old_addrs.difference(&new_addrs) {
                        pool.remove_channel(removed);
                    }

                    index = new_index;
                }
            }
            Err(e) => {
                // Consul 不可达：保持当前缓存，短暂等待后重试
                tracing::warn!("Consul watch failed: {e}, retrying in 5s");
                tokio::time::sleep(Duration::from_secs(5)).await;
            }
        }
    }
}
```

**增量更新 vs 全量替换**:
- 全量替换简单但会断开现有连接，正在进行的请求可能失败
- 增量更新（diff-based）只处理变化的实例，现有连接不受影响
- 使用 `HashSet::difference()` 做集合差运算，O(n) 复杂度

### 4.4 拦截器管道执行算法

```
Pipeline 执行流程:

  ┌──────────────────────────────────────────────────┐
  │                                                   │
  │  Pre[0]  →  Pre[1]  →  Pre[2]  →  RPC Call       │
  │  (Log)      (Auth)     (Rate)     ↓              │
  │                                   │              │
  │                              成功/失败            │
  │                                   │              │
  │  Post[0] ←  Post[1] ←  Post[2] ←─┘              │
  │  (Log)      (Retry)    (Event)                   │
  │                                                   │
  └──────────────────────────────────────────────────┘

  短路规则:
  - Pre 拦截器返回 Err → 后续 Pre 不执行 → 不调用 RPC → 直接返回错误
  - Post 拦截器返回 Err → 记录错误但不影响已有的 RPC 结果
```

```rust
impl InterceptorPipeline {
    pub async fn run_pre(&self, ctx: &mut RpcContext, metadata: &MetadataMap) -> Result<(), Status> {
        for interceptor in &self.pre {
            interceptor.intercept(ctx, metadata).await?;  // ? 实现短路
        }
        Ok(())
    }

    pub async fn run_post(&self, ctx: &RpcContext, result: &Result<(), Status>) -> Result<(), Status> {
        for interceptor in &self.post {
            if let Err(e) = interceptor.intercept(ctx, result).await {
                tracing::error!(error = %e, "Post interceptor failed, continuing...");
                // Post 拦截器失败不短路，继续执行后续拦截器
            }
        }
        Ok(())
    }
}
```

---

## 5. Graceful Degradation 策略总览

本次架构的核心设计原则：**任何基础设施组件挂掉，Gateway 都能继续工作**。

```
┌────────────────────────────────────────────────────────────┐
│               Graceful Degradation 矩阵                     │
│                                                             │
│  组件状态          │  Gateway 行为           │  影响        │
│  ─────────────────┼────────────────────────┼──────────    │
│  Consul ✅ 正常    │  动态路由 + 连接池      │  无          │
│  Consul ❌ 宕机    │  使用本地缓存           │  无新实例发现 │
│  Consul ❌ + 缓存空│  fallback 环境变量      │  单点        │
│  ─────────────────┼────────────────────────┼──────────    │
│  NATS ✅ 正常      │  异步重试 + 事件发布    │  无          │
│  NATS ❌ 宕机      │  只打日志，主流程不影响  │  重试/事件丢失│
│  ─────────────────┼────────────────────────┼──────────    │
│  svc-user ✅ 正常  │  正常转发               │  无          │
│  svc-user ❌ 宕机  │  返回错误 + 入队重试    │  请求失败    │
│  svc-user ❌ 恢复  │  RetryWorker 自动重试   │  补偿成功    │
└────────────────────────────────────────────────────────────┘
```

---

## 6. 连接池与 HTTP/2 多路复用

### 6.1 为什么需要连接池

```
没有连接池（当前问题）:

  Request 1 ──▶ connect() ──▶ TCP 握手 ──▶ HTTP/2 握手 ──▶ 发送请求 ──▶ 关闭
  Request 2 ──▶ connect() ──▶ TCP 握手 ──▶ HTTP/2 握手 ──▶ 发送请求 ──▶ 关闭
  Request 3 ──▶ connect() ──▶ TCP 握手 ──▶ HTTP/2 握手 ──▶ 发送请求 ──▶ 关闭

  每次 ~5-10ms 额外延迟，高并发下 fd 耗尽


有连接池（目标）:

  Gateway 启动 ──▶ connect() ──▶ 建立 Channel（持久 HTTP/2 连接）
                                       │
  Request 1 ──▶ Channel ──▶ Stream 1 ──┤
  Request 2 ──▶ Channel ──▶ Stream 2 ──┤  HTTP/2 多路复用
  Request 3 ──▶ Channel ──▶ Stream 3 ──┤  一个 TCP 连接承载多个请求
                                       │
  零额外握手延迟，fd 使用量 = 实例数
```

### 6.2 Tonic Channel 的本质

```rust
// Tonic 的 Channel 底层是 hyper HTTP/2 连接
// 一个 Channel 对应一个 TCP 连接，支持多路复用

// 创建 Channel（只在服务发现变更时执行）
let channel = Channel::from_static("http://svc-user:50051")
    .connect()
    .await?;

// 复用 Channel 创建客户端（每次请求执行，零开销）
let client = UserServiceClient::new(channel.clone());  // Clone 是 Arc 引用计数
client.get_user(request).await?;
```

---

## 7. 技术决策 ADR 汇总

| ID | 决策 | 选择 | 否决方案 | 理由 |
|----|------|------|---------|------|
| D1 | 服务发现 | Consul | etcd, Redis 自建, K8s DNS | 原生健康检查 + Watch + Web UI |
| D2 | 消息队列 | NATS | Kafka, Redis Streams, RabbitMQ | 极致轻量 + Rust 生态一流 |
| D3 | 事件格式 | Protobuf EventEnvelope | JSON, Avro | 全栈统一 Protobuf |
| D4 | Subject 规范 | 点分层级 | 斜杠分隔, 扁平 | NATS 原生通配符支持 |
| D5 | 负载均衡 | Round Robin + 连接池 | 随机, 加权, 最少连接 | 简单有效，MVP 够用 |
| D6 | 重试策略 | 指数退避 + 死信队列 | 固定间隔, 无限重试 | 防止重试风暴 |
| D7 | 拦截器接口 | MetadataMap（不访问请求体） | 泛型 Request\<T\>, Any | trait object 兼容 + 简单 |
| D8 | gRPC 连接 | Channel 连接池 | 每次 connect() | HTTP/2 多路复用，零握手延迟 |

---

## 8. 参考资料

- [Consul HTTP API v1](https://developer.hashicorp.com/consul/api-docs)
- [NATS 官方文档](https://docs.nats.io/)
- [async-nats Rust Client](https://github.com/nats-io/nats.rs)
- [Tonic gRPC Framework](https://github.com/hyperium/tonic)
- [HTTP/2 多路复用原理](https://web.dev/performance/http2)
- [指数退避算法 (AWS)](https://docs.aws.amazon.com/general/latest/gr/api-retries.html)
