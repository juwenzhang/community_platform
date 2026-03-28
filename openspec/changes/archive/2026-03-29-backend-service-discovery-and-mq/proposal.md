## Why

当前 Gateway 与微服务之间的地址解析完全依赖硬编码的环境变量（`SVC_USER_URL=http://127.0.0.1:50051`），每新增一个微服务都需要手动配置 URL，且无法感知服务的健康状态。随着后续 svc-content、svc-social、svc-notification、svc-search 等微服务逐步上线，这种模式会带来：

1. **运维负担**：每个服务地址都要手动维护，环境变量爆炸式增长
2. **无弹性**：服务重启或迁移后地址变化，需要重启 Gateway
3. **无健康感知**：Gateway 无法知道下游服务是否可用，请求直接打到挂掉的实例
4. **无异步能力**：目前所有请求都是同步的 gRPC 调用，缺少异步事件驱动机制（如通知推送、搜索索引更新），也缺少请求失败时的兜底降级能力

现在引入是因为项目即将进入业务功能开发阶段（用户认证、文章 CRUD 等），需要在基础设施层把这两块补齐，避免后续每新增一个微服务都要改 Gateway 代码。

## What Changes

### 服务注册与发现（Consul）

- 引入 **HashiCorp Consul** 作为服务注册中心
- 每个微服务启动时自动向 Consul 注册自身地址 + 健康检查端点
- Gateway 启动时从 Consul 查询可用的服务实例列表，替代硬编码 URL
- `shared` crate 新增 `discovery` 模块，封装 Consul 客户端（注册/注销/查询/Watch）
- Docker Compose 新增 Consul 容器
- Gateway 实现基础的客户端负载均衡（Round Robin）

### 消息队列（NATS）

- 引入 **NATS** 作为轻量级消息队列
- `shared` crate 新增 `messaging` 模块，封装 NATS 客户端（发布/订阅/请求-应答）
- 消息体使用 **Protobuf** 编码（与项目整体序列化策略一致）
- Docker Compose 新增 NATS 容器

### Gateway 兜底能力

- Gateway 层新增 **异步重试机制**：gRPC 调用失败时，将请求写入 NATS 队列做异步重试
- Gateway 层接入 NATS 作为 **异步事件总线**：支持发布领域事件（如 `user.created`、`article.published`），下游服务通过订阅消费
- 定义 Proto 消息格式用于事件信封（`EventEnvelope`）

### Gateway RPC 拦截管道

- Gateway 对所有 RPC 服务调用建立**拦截器管道**（Interceptor Pipeline）
- 每个 gRPC Service trait 实现中，调用下游 RPC 前后可插入自定义逻辑（前置：认证/限流/参数校验；后置：数据脱敏/审计日志/事件发布）
- RPC 微服务（svc-user、svc-content 等）只负责**纯数据 CRUD + 领域逻辑**，业务编排和横切关注点全部在 Gateway 拦截层处理
- 拦截器以 trait 形式定义，支持组合和复用

### 后端目录重组织

- Gateway 从单文件 `main.rs`（164 行全堆一起）拆分为模块化目录结构
- svc-user 同样重组织为规范化目录结构
- 建立后端微服务通用目录规范，后续新增服务统一遵循

### 非目标 (Non-goals)

- **不做** Consul Connect（服务网格/mTLS）—— 生产环境再考虑
- **不做** NATS JetStream 持久化 —— MVP 阶段 Core NATS 够用，后续按需升级
- **不做** 多数据中心 Consul 联邦 —— 当前单节点开发模式
- **不做** Gateway 完整的熔断器/断路器 —— 本次只做异步重试兜底，熔断后续独立 change
- **不做** 消息 Schema Registry —— Proto 文件本身就是 schema，不引入额外组件
- **不做** 前端服务发现改造 —— 前端微前端的服务发现（`@luhanxin/app-registry`）保持不变

## Capabilities

### New Capabilities

- `consul-service-discovery`: Consul 服务注册/发现/健康检查集成，包括 shared 模块封装、Docker 部署、Gateway 动态路由
- `nats-messaging`: NATS 消息队列集成，包括 shared 模块封装、Docker 部署、事件信封 Proto 定义
- `gateway-resilience`: Gateway 异步重试 + 事件总线，包括失败请求入队重试、领域事件发布能力
- `gateway-interceptor`: Gateway RPC 拦截器管道，定义 Interceptor trait + 前置/后置 hook，支持认证、限流、审计等横切逻辑
- `backend-directory-structure`: 后端微服务通用目录结构规范，Gateway 和 svc-user 目录重组织

### Modified Capabilities

- `gateway-connect-protocol`: Gateway 的服务地址解析从硬编码环境变量改为 Consul 动态查询
- `backend-workspace`: Workspace 新增 `consul`、`async-nats` 等依赖

## Impact

### 代码变更

| 位置 | 变更 |
|------|------|
| `services/shared/src/discovery/` | 新增：Consul 客户端封装（注册/注销/查询/Watch） |
| `services/shared/src/messaging/` | 新增：NATS 客户端封装（发布/订阅/请求-应答） |
| `services/shared/Cargo.toml` | 新增依赖：`consul-rs` 或 HTTP 客户端、`async-nats` |
| `services/gateway/src/` | **重组织**：从单文件拆分为 config/ + middleware/ + interceptors/ + services/ + routes/ 模块化目录 |
| `services/gateway/src/interceptors/` | 新增：Interceptor trait 定义 + auth/rate_limit/audit 拦截器实现 |
| `services/svc-user/src/` | **重组织**：从单文件拆分为 config/ + services/ + handlers/ 模块化目录 |
| `services/Cargo.toml` | 修改：workspace dependencies 新增 Consul/NATS 相关 crate |
| `proto/luhanxin/community/v1/` | 新增：`event.proto`（EventEnvelope 消息定义） |
| `docker/docker-compose.yml` | 新增：Consul 和 NATS 容器 |

### 依赖引入

| Crate | 用途 |
|-------|------|
| `async-nats` | NATS 客户端（Rust 官方维护，async/await 原生支持） |
| `reqwest` | HTTP 客户端，调用 Consul HTTP API |
| `serde` (已有) | Consul API 响应反序列化 |

### 与现有设计文档的关系

- **`docs/design/2026-03-20/03-backend-architecture.md`** — 第 7 节"服务间通信"：原设计为 Redis Streams 做异步事件，本 change 改用 NATS 替代（更轻量、无需额外 Redis 配置、原生支持发布/订阅和请求-应答模式）
- **`docs/design/2026-03-20/05-infrastructure.md`** — 第 1 节 Docker Compose：需新增 Consul 和 NATS 容器
