# Gateway 拦截器模式 — 设计模式、Rust 知识点与核心算法

> 📅 创建日期：2026-03-23
> 📌 作者：luhanxin
> 🏷️ 标签：技术文档 · 设计模式 · Rust · TypeScript · Gateway 架构

---

## 1. 设计模式应用

### 1.1 责任链模式（Chain of Responsibility）

**场景**: Gateway 拦截器管道

```
经典责任链:
  Handler A → Handler B → Handler C → (处理完毕)
     │            │            │
     └── 可短路 ──┘── 可短路 ──┘

我们的应用:
  LogInterceptor → AuthInterceptor → RateLimitInterceptor → RPC Call
       │                 │                    │
       └── Pre 链 ───────┘── 任一失败短路 ────┘
                                               │
                                          RPC 调用
                                               │
  LogInterceptor ← RetryInterceptor ← EventInterceptor
       │                 │                    │
       └── Post 链 ──────┘── 失败不短路 ──────┘
```

**Rust 实现要点**:

```rust
/// 核心 Trait — 通过 trait object 实现动态分发
#[async_trait]
pub trait PreInterceptor: Send + Sync {
    async fn intercept(&self, ctx: &mut RpcContext, metadata: &MetadataMap) -> Result<(), Status>;
}

/// Pipeline 持有 trait object 的 Vec
pub struct InterceptorPipeline {
    pre: Vec<Box<dyn PreInterceptor>>,   // 动态分发
    post: Vec<Box<dyn PostInterceptor>>,
}
```

**为什么用 `Box<dyn Trait>` 而不是泛型**:
- 泛型 `Vec<T: PreInterceptor>` 要求所有元素类型相同
- 我们需要不同类型的拦截器（`LogInterceptor`, `AuthInterceptor`）放在同一个 Vec
- `Box<dyn Trait>` 允许异构集合（不同类型的 trait object 放一起）
- 代价：一次堆分配 + vtable 间接调用（可忽略，拦截器不在热路径上）

### 1.2 代理模式（Proxy Pattern）

**场景**: Gateway 作为 BFF 代理层

```
代理模式:
  Client → Proxy → RealSubject

我们的应用:
  Frontend → Gateway (Proxy) → svc-user (RealSubject)

Gateway 实现同一个 gRPC Service trait，
但不直接处理业务，而是代理转发到真正的微服务。
```

```rust
/// svc-user 中的真实实现
impl UserService for UserServiceImpl {
    async fn get_user(&self, req: Request<GetUserRequest>) -> Result<Response<GetUserResponse>, Status> {
        // 直接访问数据库，返回用户数据
        let user = self.handler.find_user(&req.into_inner().user_id).await?;
        Ok(Response::new(GetUserResponse { user: Some(user) }))
    }
}

/// Gateway 中的代理实现（同一个 trait，不同行为）
impl UserService for GatewayUserService {
    async fn get_user(&self, req: Request<GetUserRequest>) -> Result<Response<GetUserResponse>, Status> {
        // 1. 拦截 → 2. 代理转发 → 3. 拦截
        self.pipeline.run_pre(...).await?;
        let channel = self.resolver.get_channel("svc-user").await?;
        let result = UserServiceClient::new(channel).get_user(req).await;
        self.pipeline.run_post(...).await?;
        result
    }
}
```

### 1.3 观察者模式（Observer / Pub-Sub）

**场景**: NATS 事件总线

```
观察者模式:
  Subject (被观察者) ──通知──▶ Observer A
                     ──通知──▶ Observer B
                     ──通知──▶ Observer C

我们的应用:
  Gateway 发布事件:
    nats.publish("luhanxin.events.user.created", event)
          │
          ├──▶ svc-notification（订阅 user.>，发送通知）
          ├──▶ svc-search（订阅 user.>，更新搜索索引）
          └──▶ svc-social（订阅 user.>，初始化社交数据）

  发布者不需要知道有多少订阅者 — 完全解耦
```

### 1.4 策略模式（Strategy Pattern）

**场景**: ServiceResolver 的 fallback 策略

```rust
/// 服务解析策略
enum ResolveStrategy {
    /// 从 Consul 动态解析
    Consul { consul: ConsulClient, cache: ServicePool },
    /// 从环境变量静态解析
    Fallback { url: String },
}

impl ServiceResolver {
    async fn get_channel(&self, service: &str) -> Result<Channel> {
        // 先尝试 Consul 策略
        if let Some(channel) = self.try_consul(service).await {
            return Ok(channel);
        }
        // 降级到 Fallback 策略
        self.try_fallback(service).await
    }
}
```

### 1.5 模板方法模式（Template Method）

**场景**: 每个 Gateway gRPC 方法的统一结构

```rust
/// 所有 Gateway RPC 方法都遵循这个模板:
async fn any_rpc_method(&self, request: Request<T>) -> Result<Response<R>, Status> {
    // Step 1: 构建上下文
    let mut ctx = RpcContext::new("service_name", "method_name");

    // Step 2: 前置拦截（模板步骤，不变）
    self.pipeline.run_pre(&mut ctx, request.metadata()).await?;

    // Step 3: 具体调用（变化部分，每个方法不同）
    let channel = self.resolver.get_channel("svc-xxx").await?;
    let result = XxxServiceClient::new(channel).some_method(request).await;

    // Step 4: 后置拦截（模板步骤，不变）
    self.pipeline.run_post(&ctx, &result.as_ref().map(|_| ())).await?;

    result
}
```

---

## 2. Rust 核心知识点

### 2.1 `async_trait` — 异步 Trait 的实现

Rust 原生不支持 `async fn` 在 trait 中（截至 2024 年 stable，`async fn in trait` 仍有限制），因此使用 `#[async_trait]` 宏：

```rust
use async_trait::async_trait;

// 宏展开前
#[async_trait]
pub trait PreInterceptor: Send + Sync {
    async fn intercept(&self, ctx: &mut RpcContext, metadata: &MetadataMap) -> Result<(), Status>;
}

// 宏展开后（实际生成的代码）
pub trait PreInterceptor: Send + Sync {
    fn intercept<'a>(
        &'a self,
        ctx: &'a mut RpcContext,
        metadata: &'a MetadataMap,
    ) -> Pin<Box<dyn Future<Output = Result<(), Status>> + Send + 'a>>;
}
```

**关键点**:
- `Pin<Box<dyn Future>>` — 堆分配的 Future，支持 trait object
- `Send` 约束 — 确保 Future 可以跨线程传递（tokio 多线程运行时要求）
- `'a` 生命周期 — 确保引用参数在 Future 执行期间有效

### 2.2 `Arc<RwLock<T>>` — 异步读写锁

```rust
use std::sync::Arc;
use tokio::sync::RwLock;

pub struct ServiceResolver {
    /// 多个请求并发读取 + Watch 任务写入
    cache: Arc<RwLock<HashMap<String, ServicePool>>>,
}

// 读操作（不阻塞其他读者）
let cache = self.cache.read().await;
let pool = cache.get("svc-user");

// 写操作（独占锁，阻塞所有读者和写者）
let mut cache = self.cache.write().await;
cache.insert("svc-user", new_pool);
```

**为什么用 `tokio::sync::RwLock` 而不是 `std::sync::RwLock`**:
- `std::sync::RwLock` 在 `.await` 点上持有锁会阻塞整个线程
- `tokio::sync::RwLock` 是异步感知的，等待锁时会 yield 线程给其他 task
- 场景：多个请求并发读缓存（99.9%），Watch 任务偶尔写入（0.1%）→ 读多写少，RwLock 完美

### 2.3 `AtomicUsize` — 无锁原子操作

```rust
use std::sync::atomic::{AtomicUsize, Ordering};

pub struct ServicePool {
    channels: Vec<Channel>,
    counter: AtomicUsize,  // Round Robin 计数器
}

impl ServicePool {
    pub fn next(&self) -> &Channel {
        // fetch_add: 原子地读取当前值并加 1，返回旧值
        // Ordering::Relaxed: 不需要内存屏障（其他线程看到的顺序无所谓）
        let idx = self.counter.fetch_add(1, Ordering::Relaxed) % self.channels.len();
        &self.channels[idx]
    }
}
```

**Memory Ordering 简要**:
| Ordering | 含义 | 适用场景 |
|----------|------|---------|
| `Relaxed` | 无顺序保证，只保证原子性 | 计数器、统计 |
| `Acquire` | 后续读不会被重排到此操作前 | 锁获取 |
| `Release` | 之前的写不会被重排到此操作后 | 锁释放 |
| `SeqCst` | 全局顺序一致（最强，最慢） | 几乎不用 |

### 2.4 Tonic `Channel` — gRPC 连接复用

```rust
// Channel 内部是 Arc<Inner>，Clone 只增加引用计数
let channel: Channel = Channel::from_static("http://svc-user:50051")
    .connect()
    .await?;

// Clone 是 O(1)，多个 client 共享同一个 HTTP/2 连接
let client1 = UserServiceClient::new(channel.clone());
let client2 = UserServiceClient::new(channel.clone());

// client1 和 client2 的请求在同一个 TCP 连接上多路复用
```

**HTTP/2 多路复用原理**:
```
TCP 连接 ─────────────────────────────────
  │  Stream 1: GetUser(id=1)    ──▶ ◀──
  │  Stream 2: GetUser(id=2)    ──▶ ◀──
  │  Stream 3: ListArticles()   ──▶ ◀──
  │  ...
  │  多个请求/响应交错传输，不阻塞
```

### 2.5 Tokio Signal Handler — 优雅关闭

```rust
use tokio::signal;

async fn main() {
    // 启动服务...
    consul.register(&registration).await?;

    // 监听关闭信号
    let shutdown = async {
        signal::ctrl_c().await.expect("Failed to listen for ctrl+c");
        tracing::info!("Received SIGINT, shutting down...");
    };

    // 服务运行直到收到关闭信号
    tokio::select! {
        _ = server.serve(addr) => {},
        _ = shutdown => {
            // 优雅关闭：先从 Consul 注销，再停止服务
            consul.deregister(&service_id).await.ok();
            tracing::info!("Deregistered from Consul, bye!");
        }
    }
}
```

**`tokio::select!` 原理**: 同时 poll 多个 Future，第一个完成时取消其他。类似 Go 的 `select {}`。

### 2.6 `prost::Message` — Protobuf 序列化/反序列化

```rust
use prost::Message;

// 序列化
let envelope = EventEnvelope {
    event_id: uuid::Uuid::new_v4().to_string(),
    event_type: "user.created".into(),
    ..Default::default()
};
let bytes = envelope.encode_to_vec();  // Vec<u8>

// 反序列化
let decoded = EventEnvelope::decode(bytes.as_slice())?;

// NATS 中使用
nats.publish("luhanxin.events.user.created", &bytes).await?;
```

---

## 3. TypeScript 相关知识点

### 3.1 Connect Protocol 客户端（前端调用 gRPC）

```typescript
import { createGrpcWebTransport } from "@connectrpc/connect-web";
import { createClient } from "@connectrpc/connect";
import { UserService } from "@luhanxin/shared-types/proto/luhanxin/community/v1/user_pb";

// Transport 层：HTTP/2 + Protobuf 二进制
const transport = createGrpcWebTransport({
  baseUrl: "http://localhost:8000",
});

// 类型安全的 gRPC 客户端
const client = createClient(UserService, transport);

// 调用（自动 Protobuf 编解码，类型推断）
const response = await client.getUser({ userId: "123" });
// response.user?.displayName → 完全类型安全
```

### 3.2 Protobuf-ES 生成的类型

```typescript
// packages/shared-types/src/proto/luhanxin/community/v1/user_pb.ts
// 由 buf generate 自动生成

import { Message, proto3 } from "@bufbuild/protobuf";

export class User extends Message<User> {
  id = "";
  username = "";
  email = "";
  displayName = "";
  // ...

  static readonly runtime = proto3;
  static readonly typeName = "luhanxin.community.v1.User";
}

// 用法
const user = new User({ id: "123", username: "luhanxin" });
const bytes = user.toBinary();        // Uint8Array
const decoded = User.fromBinary(bytes); // User
const json = user.toJson();            // 调试用
```

---

## 4. 架构模式总结

### 4.1 BFF 模式（Backend for Frontend）

```
传统模式（前端直接调用微服务）:
  Frontend ──▶ svc-user
  Frontend ──▶ svc-content
  Frontend ──▶ svc-social
  ❌ 前端需要知道所有服务地址
  ❌ 跨域问题
  ❌ 无法做聚合查询

BFF 模式（Gateway 代理）:
  Frontend ──▶ Gateway ──▶ svc-user
                       ──▶ svc-content
                       ──▶ svc-social
  ✅ 前端只需知道 Gateway 地址
  ✅ Gateway 统一处理认证、限流
  ✅ Gateway 可以聚合多个服务的数据
```

### 4.2 事件驱动架构（EDA）

```
同步调用链（当前）:
  用户注册 → svc-user 创建用户 → 返回

  问题：如果后续需要"注册后发通知"、"注册后初始化社交数据"，
  就要在 svc-user 中硬编码调用 svc-notification 和 svc-social，
  服务间强耦合。

事件驱动（目标）:
  用户注册 → svc-user 创建用户 → Gateway 发布 "user.created" 事件 → 返回
                                       │
                                       ├──▶ svc-notification 订阅 → 发送欢迎邮件
                                       ├──▶ svc-search 订阅 → 建立搜索索引
                                       └──▶ svc-social 订阅 → 初始化社交数据

  ✅ 服务间完全解耦
  ✅ 新增消费者不需要修改发布者
  ✅ 异步处理，不阻塞主流程
```

### 4.3 Sidecar 模式的简化版

我们没有用 Consul Connect 的完整 sidecar，但思路类似：

```
完整 Sidecar（Consul Connect / Istio）:
  svc-user ←──▶ Envoy Proxy ←──▶ 网络 ←──▶ Envoy Proxy ←──▶ Gateway
  （每个服务旁边放一个代理，代理处理安全、发现、遥测）

我们的简化版:
  svc-user ←── Consul Register（只做注册/注销，不做完整代理）
  Gateway  ←── Consul Watch + Channel Pool（只做发现 + 连接池）
  横切逻辑  ←── Interceptor Pipeline（在 Gateway 代码内处理）

  ✅ 无额外进程开销
  ✅ MVP 够用
  ✅ 后续可升级到完整 sidecar
```

---

## 5. 模式与知识点速查表

| 模式/概念 | 应用位置 | Rust 实现关键 |
|-----------|---------|-------------|
| 责任链 | Interceptor Pipeline | `Vec<Box<dyn Trait>>` + 循环调用 |
| 代理模式 | Gateway BFF | 实现相同 trait，内部转发 |
| 观察者/Pub-Sub | NATS 事件总线 | `async-nats` publish/subscribe |
| 策略模式 | ServiceResolver fallback | enum 或 if-let 链 |
| 模板方法 | Gateway RPC 方法统一结构 | pre → call → post 固定步骤 |
| 连接池 | Channel 复用 | `Arc<Channel>` + Clone |
| 无锁并发 | Round Robin | `AtomicUsize::fetch_add` |
| 读写锁 | 服务缓存 | `tokio::sync::RwLock` |
| 优雅关闭 | Consul 注销 | `tokio::select!` + signal |
| 指数退避 | 重试 Worker | `1 << retry_count` |
| 增量更新 | Watch 缓存刷新 | `HashSet::difference` |
| HTTP/2 多路复用 | gRPC Channel | Tonic `Channel::connect` |
| at-most-once | Core NATS | 无 ACK，消息不持久化 |
| Protobuf 编码 | 全栈序列化 | `prost::Message` trait |
