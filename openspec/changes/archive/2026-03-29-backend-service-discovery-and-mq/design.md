## Context

当前后端架构（参见 `docs/design/2026-03-20/03-backend-architecture.md`）：

- **Gateway** (Axum + Tonic) 监听 8000 端口，作为 BFF 层代理转发 gRPC-Web 请求到下游微服务
- **svc-user** (Tonic gRPC) 监听 50051 端口，提供 `UserService`
- Gateway 通过环境变量 `SVC_USER_URL` 硬编码 svc-user 的地址
- 微服务间通信全部是同步 gRPC，无异步事件机制
- Docker Compose 中已有 PostgreSQL、Redis、Meilisearch

随着 svc-content、svc-social、svc-notification 等服务陆续上线，需要：
1. 动态服务发现，替代硬编码地址
2. 异步消息能力，支持事件驱动和失败兜底

## Goals / Non-Goals

**Goals:**
- Gateway 能通过 Consul 动态发现所有下游微服务，无需硬编码地址
- 每个微服务启动时自动注册、关闭时自动注销
- 引入 NATS 作为异步消息总线，支持事件发布/订阅
- Gateway 对失败的 gRPC 调用能写入 NATS 队列做异步重试
- `shared` crate 提供通用的 discovery 和 messaging 模块，所有微服务复用
- 消息体使用 Protobuf 编码
- Gateway 对 RPC 调用建立拦截器管道，支持前置/后置 hook（认证、限流、审计等）
- Gateway 和 svc-user 从单文件重组织为模块化目录结构
- 建立后端微服务通用目录规范

**Non-Goals:**
- 不做 Consul Connect / 服务网格
- 不做 NATS JetStream 持久化（Core NATS 够用）
- 不做完整的熔断器模式
- 不做多数据中心联邦
- 不改造前端微前端的服务发现

## Decisions

### D1: 服务发现选择 Consul

**决定**: 使用 HashiCorp Consul 做服务注册与发现。

**理由**:
- 成熟稳定，生态最完善（健康检查、KV、DNS、HTTP API 全内置）
- Rust 生态有可用客户端，也可直接调用 HTTP API（更灵活）
- 后续上 K8s 时可平滑过渡到 Consul Connect
- 对比 etcd：etcd 更偏 KV 存储 + 分布式一致性，服务发现能力不如 Consul 原生
- 对比 Redis 自建：缺少健康检查、Watch 等核心能力，且耦合存储层

**实现方式**: 通过 `reqwest` 调用 Consul HTTP API v1（不引入重量级 Consul SDK），封装为 `shared::discovery` 模块。

```rust
// shared/src/discovery/mod.rs

pub struct ConsulClient {
    base_url: String,
    http: reqwest::Client,
}

pub struct ServiceRegistration {
    pub name: String,           // 服务名，如 "svc-user"
    pub id: String,             // 实例 ID，如 "svc-user-1"
    pub address: String,        // 绑定地址
    pub port: u16,              // 绑定端口
    pub tags: Vec<String>,      // 标签，如 ["grpc", "v1"]
    pub health_check: HealthCheck,
}

pub struct HealthCheck {
    pub grpc: String,           // gRPC 健康检查地址
    pub interval: String,       // 检查间隔，如 "10s"
    pub timeout: String,        // 超时，如 "5s"
}

impl ConsulClient {
    /// 注册服务
    pub async fn register(&self, reg: &ServiceRegistration) -> Result<()>;
    
    /// 注销服务
    pub async fn deregister(&self, service_id: &str) -> Result<()>;
    
    /// 查询健康的服务实例
    pub async fn healthy_instances(&self, service_name: &str) -> Result<Vec<ServiceInstance>>;
    
    /// Watch 服务变化（长轮询）
    pub async fn watch(&self, service_name: &str, index: u64) -> Result<(Vec<ServiceInstance>, u64)>;
}
```

### D2: 消息队列选择 NATS

**决定**: 使用 NATS 作为轻量级消息队列。

**理由**:
- 极简轻量：单二进制文件，Docker 镜像 < 20MB，启动秒级
- Rust 生态：`async-nats` 是官方维护的异步客户端，API 简洁
- 原生支持 Pub/Sub + Request/Reply 两种模式，完美覆盖事件驱动和异步重试
- 性能优异：百万级消息/秒的吞吐量，远超 MVP 需求
- 对比 Kafka：太重了，MVP 阶段不需要持久化消息、分区等高级特性
- 对比 Redis Streams：Redis Streams 能做但不够优雅，消费组管理复杂，且复用 Redis 实例有耦合风险

**实现方式**: 使用 `async-nats` crate，封装为 `shared::messaging` 模块。

```rust
// shared/src/messaging/mod.rs

pub struct NatsClient {
    client: async_nats::Client,
}

impl NatsClient {
    pub async fn connect(url: &str) -> Result<Self>;
    
    /// 发布事件（Protobuf 编码）
    pub async fn publish<T: prost::Message>(&self, subject: &str, event: &EventEnvelope<T>) -> Result<()>;
    
    /// 订阅事件
    pub async fn subscribe(&self, subject: &str) -> Result<async_nats::Subscriber>;
    
    /// 请求-应答模式（用于异步重试）
    pub async fn request(&self, subject: &str, payload: &[u8]) -> Result<async_nats::Message>;
}
```

### D3: 事件信封使用 Protobuf

**决定**: 定义 `EventEnvelope` Proto 消息作为所有事件的标准信封。

```protobuf
// proto/luhanxin/community/v1/event.proto
syntax = "proto3";
package luhanxin.community.v1;

import "google/protobuf/timestamp.proto";
import "google/protobuf/any.proto";

// 事件信封 — 所有异步事件的标准包装
message EventEnvelope {
  string event_id = 1;                    // 唯一事件 ID (UUID)
  string event_type = 2;                  // 事件类型，如 "user.created"
  string source = 3;                      // 来源服务，如 "svc-user"
  google.protobuf.Timestamp timestamp = 4;
  google.protobuf.Any payload = 5;        // 事件体（具体的 Proto 消息）
  map<string, string> metadata = 6;       // 元数据（trace_id, correlation_id 等）
  int32 retry_count = 7;                  // 重试次数
}

// Gateway 异步重试信封
message RetryRequest {
  string request_id = 1;
  string target_service = 2;              // 目标服务名
  string method = 3;                      // gRPC 方法名
  bytes request_payload = 4;              // 原始请求序列化字节
  int32 retry_count = 5;
  int32 max_retries = 6;
  google.protobuf.Timestamp created_at = 7;
}
```

### D4: NATS Subject 命名规范

**决定**: 使用点分层级命名。

```
luhanxin.events.<domain>.<action>      # 领域事件
luhanxin.retry.<service>.<method>      # 重试队列
luhanxin.deadletter.<service>          # 死信队列

示例:
luhanxin.events.user.created
luhanxin.events.article.published
luhanxin.events.social.liked
luhanxin.retry.svc-user.get-user
luhanxin.deadletter.svc-user
```

### D5: Gateway 负载均衡 + gRPC 连接池

**决定**: 客户端 Round Robin，本地缓存服务列表 + 后台 Watch 刷新 + **gRPC Channel 连接池**。

**为什么需要连接池**:
- Tonic 的 `XxxServiceClient::connect(url)` 每次调用都创建新 TCP 连接 + HTTP/2 握手，延迟 ~5-10ms
- 高并发下会成为性能瓶颈，且浪费系统 fd 资源
- Tonic 的 `Channel` 本身支持 HTTP/2 多路复用，一个 Channel 可以承载大量并发请求

**实现方式**: `ServiceResolver` 不仅缓存服务实例列表，还维护每个实例的 `tonic::Channel`。Consul Watch 检测到实例变更时，为新实例创建 Channel，移除下线实例的 Channel。

```rust
// gateway 中的服务解析器
pub struct ServiceResolver {
    consul: ConsulClient,
    /// 服务名 → (实例列表, Channel 池, RoundRobin 计数器)
    cache: Arc<RwLock<HashMap<String, ServicePool>>>,
    /// 环境变量 fallback 地址
    fallback_urls: HashMap<String, String>,
}

pub struct ServicePool {
    instances: Vec<ServiceInstance>,
    /// 每个实例对应一个持久化的 gRPC Channel
    channels: Vec<tonic::transport::Channel>,
    /// Round Robin 计数器
    counter: AtomicUsize,
}

impl ServiceResolver {
    /// 获取下一个可用 Channel（Round Robin），无需每次 connect()
    pub async fn get_channel(&self, service_name: &str) -> Result<tonic::transport::Channel>;
    
    /// 后台任务：Watch Consul 变更，刷新实例列表 + 重建 Channel 池
    pub fn start_watcher(&self) -> JoinHandle<()>;
}
```

**Gateway Service 使用方式**（不再每次 connect）:
```rust
// 之前（每次新建连接）:
let mut client = UserServiceClient::connect(url).await?;

// 之后（从连接池获取 Channel）:
let channel = self.resolver.get_channel("svc-user").await?;
let mut client = UserServiceClient::new(channel);
```

### D6: Gateway 异步重试流程

**决定**: gRPC 调用失败（UNAVAILABLE / DEADLINE_EXCEEDED）时，写入 NATS 重试队列，后台 Worker 消费重试。

```
正常流程: 前端 → Gateway → gRPC → svc-user → 响应
                                     ↓ (失败)
重试流程: Gateway → NATS retry 队列 → RetryWorker → gRPC → svc-user
                                     ↓ (重试 3 次后仍失败)
死信:     RetryWorker → NATS deadletter 队列 → (告警/人工处理)
```

Gateway 对前端的响应策略：
- 同步请求失败时，仍然返回错误给前端（不阻塞）
- 异步重试是"尽力而为"的后台补偿，不影响前端响应

### D7: Gateway RPC 拦截器管道

**决定**: 在 Gateway 中为每个 gRPC Service trait 实现引入拦截器管道（Interceptor Pipeline），而非直接在每个方法里写横切逻辑。

**理由**:
- 当前 Gateway 的 `get_user()` 是纯透传，没有地方插入认证、限流、审计等逻辑
- 如果直接在每个方法中 copy-paste 这些逻辑，会导致大量重复代码
- 拦截器模式让横切逻辑可以**声明式组合**，新增 RPC 方法时自动获得所有拦截能力
- 对比 Tower middleware：Tower 在 HTTP 层工作，无法感知 gRPC 方法名和请求/响应类型；我们需要在 gRPC 语义层拦截

**实现方式**: 定义 `Interceptor` trait，Gateway 在调用下游 RPC 前后执行拦截器链。

**关于请求体类型**:
拦截器只处理 **metadata 层**（认证 token、trace_id、限流标识等通用逻辑），不访问请求体。原因：
- 不同 RPC 方法的请求类型不同（`GetUserRequest` vs `ListArticlesRequest`），如果拦截器要访问请求体，就需要泛型 `Request<T>`，无法做 trait object 放进同一个 Vec
- 需要请求体的场景（如参数校验、基于内容的权限判断）在各 service 方法中直接处理，不走拦截器
- 这也是 gRPC 生态的通用实践（Tonic 的 `Interceptor` trait 也只操作 `Request<()>` metadata）

```rust
// gateway/src/interceptors/mod.rs

use tonic::{metadata::MetadataMap, Status};
use std::time::Instant;

/// RPC 拦截上下文
pub struct RpcContext {
    pub service: String,        // 如 "user"
    pub method: String,         // 如 "get_user"
    pub start_time: Instant,    // 请求开始时间（用于耗时统计）
    pub attrs: HashMap<String, String>,  // 拦截器间传递数据
}

impl RpcContext {
    pub fn new(service: &str, method: &str) -> Self { ... }
}

/// 前置拦截器：在 RPC 调用前执行，操作 tonic metadata
#[async_trait]
pub trait PreInterceptor: Send + Sync {
    async fn intercept(&self, ctx: &mut RpcContext, metadata: &MetadataMap) -> Result<(), Status>;
}

/// 后置拦截器：在 RPC 调用后执行
#[async_trait]
pub trait PostInterceptor: Send + Sync {
    async fn intercept(&self, ctx: &RpcContext, result: &Result<(), Status>) -> Result<(), Status>;
}

/// 拦截器管道
pub struct InterceptorPipeline {
    pre: Vec<Box<dyn PreInterceptor>>,
    post: Vec<Box<dyn PostInterceptor>>,
}

impl InterceptorPipeline {
    pub fn new() -> Self { ... }
    pub fn add_pre(mut self, interceptor: impl PreInterceptor + 'static) -> Self { ... }
    pub fn add_post(mut self, interceptor: impl PostInterceptor + 'static) -> Self { ... }
    
    /// 执行前置拦截器链（任一返回 Err 则短路）
    pub async fn run_pre(&self, ctx: &mut RpcContext, metadata: &MetadataMap) -> Result<(), Status>;
    /// 执行后置拦截器链
    pub async fn run_post(&self, ctx: &RpcContext, result: &Result<(), Status>) -> Result<(), Status>;
}
```

**Gateway 中使用拦截器**:

```rust
// gateway/src/services/user.rs
#[tonic::async_trait]
impl UserService for GatewayUserService {
    async fn get_user(&self, request: Request<GetUserRequest>) -> Result<Response<GetUserResponse>, Status> {
        let mut ctx = RpcContext::new("user", "get_user");
        
        // 1. 前置拦截（认证、限流、日志...）
        //    拦截器通过 RpcContext 访问 tonic metadata（不访问请求体）
        self.pipeline.run_pre(&mut ctx, request.metadata()).await?;
        
        // 2. 从连接池获取 Channel（不再每次 connect）
        let channel = self.resolver.get_channel("svc-user").await
            .map_err(|e| Status::unavailable(format!("svc-user unavailable: {e}")))?;
        let mut client = UserServiceClient::new(channel);
        let result = client.get_user(request).await;
        
        // 3. 后置拦截（审计日志、重试入队、事件发布...）
        self.pipeline.run_post(&ctx, &result.as_ref().map(|_| ())).await?;
        
        result
    }
}
```

**初始拦截器**（本次实现骨架，具体实现后续 change）:
- `LogInterceptor` (Pre+Post): 记录 RPC 调用日志（方法名、耗时、状态）
- `AuthInterceptor` (Pre): 占位，后续实现 JWT 校验
- `RetryInterceptor` (Post): 调用失败时写入 NATS 重试队列

### D8: 后端目录结构规范

**决定**: 为 Gateway 和所有微服务建立统一的模块化目录结构。

**理由**:
- 当前 `gateway/src/main.rs` 是 164 行的单文件，所有逻辑（gRPC 服务实现、REST 路由、CORS 配置、main 函数）堆在一起
- 随着拦截器、Consul、NATS 的引入，不拆分会变成 500+ 行的 God File
- 建立统一规范后，新增微服务可以直接复制结构

**Gateway 目录结构**:

```
gateway/src/
├── main.rs                    # 入口：初始化 + 启动
├── config.rs                  # 配置加载（环境变量 + Consul/NATS 地址）
├── interceptors/              # 🔵 RPC 拦截器
│   ├── mod.rs                 # Interceptor trait + Pipeline 定义
│   ├── log.rs                 # 日志拦截器（Pre+Post）
│   ├── auth.rs                # 认证拦截器（Pre，占位）
│   └── retry.rs               # 重试拦截器（Post，写入 NATS）
├── services/                  # 🔵 gRPC Service trait 实现（BFF 层）
│   ├── mod.rs                 # 注册所有 service
│   └── user.rs                # GatewayUserService
├── routes/                    # 🔵 REST 路由
│   ├── mod.rs
│   └── health.rs              # /health 端点
├── middleware/                # 🔵 HTTP 中间件
│   ├── mod.rs
│   └── cors.rs                # CORS 配置
├── resolver.rs                # ServiceResolver（Consul 动态路由）
└── worker/                    # 🔵 后台任务
    ├── mod.rs
    └── retry_worker.rs         # NATS 重试消费者
```

**微服务（svc-xxx）通用目录结构**:

```
svc-xxx/src/
├── main.rs                    # 入口：gRPC Server 启动 + Consul 注册
├── config.rs                  # 配置加载
├── services/                  # 🔵 gRPC Service trait 实现
│   ├── mod.rs
│   └── xxx_service.rs         # XxxServiceImpl
├── handlers/                  # 🔵 业务逻辑（被 services/ 调用）
│   ├── mod.rs
│   └── xxx_handler.rs
├── models/                    # 🔵 数据模型（SeaORM Entity，后续）
│   └── mod.rs
└── error.rs                   # 服务级错误定义
```

**对比 `docs/design/2026-03-20/03-backend-architecture.md` 第 2 节的原设计**:
- 原设计更细（有 dto/、routes/、validators/ 等），但当前 MVP 阶段用不到那么多层
- 本次采用精简版，随业务功能增长再逐步添加

## Risks / Trade-offs

| 风险 | 缓解措施 |
|------|----------|
| Consul 单节点故障导致服务发现不可用 | Gateway 本地缓存服务列表，Consul 断开后继续使用缓存（graceful degradation） |
| NATS 宕机导致事件丢失 | Core NATS 不保证持久化，MVP 阶段可接受；后续升级 JetStream 加持久化 |
| **Core NATS at-most-once 投递语义** | Core NATS 是"最多投递一次"——如果 RetryWorker 在处理消息时崩溃/重启，该消息会丢失（不会重新投递）。MVP 阶段异步重试本身就是 "best effort" 补偿，丢失可接受。后续需要"至少一次"保证时，升级到 NATS JetStream（支持 ACK + 重新投递） |
| 重试风暴：大量失败请求堆积 NATS | RetryRequest 设置 max_retries=3，超过进死信队列；重试间隔指数退避 |
| gRPC 连接开销 | ServiceResolver 维护 Channel 连接池（HTTP/2 多路复用），避免每次请求重新握手 |
| 开发环境复杂度增加（多了 Consul + NATS） | Docker Compose 一键启动，scripts/dev.sh 自动检查依赖 |
| `async-nats` crate 版本兼容性 | 锁定具体版本，先在 dev 环境充分测试 |

## Migration Plan

1. **Phase 0**: Gateway + svc-user 目录重组织（纯重构，不改行为）
2. **Phase 1**: 新增 Consul + NATS Docker 容器，不影响现有服务
3. **Phase 2**: `shared` crate 新增 discovery + messaging 模块
4. **Phase 3**: Gateway 拦截器管道骨架（Interceptor trait + Pipeline + LogInterceptor）
5. **Phase 4**: svc-user 接入 Consul 注册（同时保留环境变量 fallback）
6. **Phase 5**: Gateway 改用 Consul 解析服务地址（fallback 到环境变量）
7. **Phase 6**: Gateway 接入 NATS 事件发布和异步重试（RetryInterceptor）

**回滚策略**: 每个 Phase 都可独立回滚。Gateway 保留环境变量 fallback，即使 Consul 不可用也能正常工作。

## Open Questions

1. ~~NATS vs Redis Streams~~ → 已决定 NATS
2. 是否需要 gRPC 健康检查协议（`grpc.health.v1.Health`）供 Consul 使用？→ 建议实现，Consul 原生支持 gRPC 健康检查
3. 后续上 K8s 时，Consul 是否与 K8s Service Discovery 共存还是替换？→ 暂不决策，留到 Phase 3 生产部署时考虑
