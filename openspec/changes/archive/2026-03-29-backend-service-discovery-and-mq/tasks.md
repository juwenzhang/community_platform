## 0. 后端目录重组织（纯重构，行为不变）

- [x] 0.1 Gateway 目录拆分：从 `main.rs` 提取 `config.rs`（配置加载）、`routes/health.rs`（REST 端点）、`middleware/cors.rs`（CORS 配置）、`services/user.rs`（GatewayUserService）
- [x] 0.2 Gateway 创建 `interceptors/mod.rs` 空模块占位、`worker/mod.rs` 空模块占位、`resolver.rs` 占位
- [x] 0.3 Gateway `main.rs` 精简为：加载配置 → 初始化各模块 → 组装路由 → 启动服务器
- [x] 0.4 svc-user 目录拆分：从 `main.rs` 提取 `config.rs`、`services/user_service.rs`（UserServiceImpl）、`handlers/user_handler.rs`（业务逻辑占位）、`error.rs`
- [x] 0.5 验证 `cargo build` 编译通过，`GET /health` 和 `GetUser` gRPC-Web 功能不变

## 1. Proto 定义 + 代码生成

- [x] 1.1 创建 `proto/luhanxin/community/v1/event.proto`，定义 `EventEnvelope` 和 `RetryRequest` 消息
- [x] 1.2 运行 `buf lint` 验证 + `buf generate` 生成 Rust 和 TypeScript 代码

## 2. Docker 基础设施

- [x] 2.1 在 `docker/docker-compose.yml` 中新增 Consul 容器（dev 模式、8500/8600 端口、健康检查）
- [x] 2.2 在 `docker/docker-compose.yml` 中新增 NATS 容器（4222/8222 端口、健康检查）
- [x] 2.3 验证 `docker compose up -d` 后 Consul UI (8500) 和 NATS monitoring (8222) 可访问

## 3. Workspace 依赖更新

- [x] 3.1 在 `services/Cargo.toml` 的 `[workspace.dependencies]` 中新增 `async-nats`、`reqwest`、`uuid` 依赖
- [x] 3.2 更新 `services/shared/Cargo.toml` 引入新依赖
- [x] 3.3 验证 `cargo build` 编译通过

## 4. Shared — Consul 服务发现模块

> 依赖: 2.1, 3.1

- [x] 4.1 创建 `services/shared/src/discovery/mod.rs`，定义 `ConsulClient`、`ServiceRegistration`、`ServiceInstance`、`HealthCheck` 结构体
- [x] 4.2 实现 `ConsulClient::register()` — 调用 Consul HTTP API `/v1/agent/service/register`
- [x] 4.3 实现 `ConsulClient::deregister()` — 调用 `/v1/agent/service/deregister/:id`
- [x] 4.4 实现 `ConsulClient::healthy_instances()` — 调用 `/v1/health/service/:name?passing=true`
- [x] 4.5 实现 `ConsulClient::watch()` — 带 `?index=` 参数的长轮询
- [x] 4.6 在 `shared/src/lib.rs` 中导出 `discovery` 模块

## 5. Shared — NATS 消息模块

> 依赖: 1.2, 3.1

- [x] 5.1 创建 `services/shared/src/messaging/mod.rs`，定义 `NatsClient` 结构体
- [x] 5.2 实现 `NatsClient::connect()` — 连接 NATS 服务器
- [x] 5.3 实现 `NatsClient::publish()` — Protobuf 编码后发布到指定 subject
- [x] 5.4 实现 `NatsClient::subscribe()` — 订阅 subject 并返回 subscriber
- [x] 5.5 在 `shared/src/lib.rs` 中导出 `messaging` 模块

## 6. Gateway — RPC 拦截器管道

> 依赖: 0.2

- [x] 6.1 实现 `interceptors/mod.rs`：定义 `PreInterceptor`（接收 MetadataMap）、`PostInterceptor` trait 和 `RpcContext` 结构体（含 service、method、start_time、attrs）
- [x] 6.2 实现 `InterceptorPipeline`：`add_pre()`、`add_post()`、`run_pre()`、`run_post()` 方法
- [x] 6.3 实现 `interceptors/log.rs`：`LogInterceptor`（Pre: 记录请求到达；Post: 记录耗时和状态）
- [x] 6.4 修改 `services/user.rs`：`GatewayUserService::get_user()` 中使用 InterceptorPipeline 包裹 RPC 调用

## 7. svc-user 接入 Consul 注册

> 依赖: 4.6

- [x] 7.1 修改 `svc-user/src/main.rs`：启动后调用 `consul.register()` 注册自身
- [x] 7.2 添加 tokio signal handler：收到 SIGTERM 时调用 `consul.deregister()` 后再退出
- [x] 7.3 Consul 不可达时打印 warn 日志但不阻止服务启动（graceful degradation）

## 8. Gateway 接入 Consul 动态路由 + 连接池

> 依赖: 4.6, 7.1

- [x] 8.1 实现 `resolver.rs` 中的 `ServiceResolver`：内部维护服务实例缓存 + gRPC Channel 连接池 + Round Robin 计数器
- [x] 8.2 实现 `ServiceResolver::get_channel()` — 从连接池获取已建立的 Channel（Round Robin），缓存为空时 fallback 到环境变量地址创建 Channel
- [x] 8.3 实现 `ServiceResolver::start_watcher()` — 后台 tokio task Watch Consul 变更，刷新实例列表并重建/移除 Channel
- [x] 8.4 修改 `services/user.rs`：使用 `resolver.get_channel("svc-user")` + `UserServiceClient::new(channel)` 替代每次 `connect()`

## 9. Gateway 接入 NATS 异步重试 + 事件发布

> 依赖: 5.5, 6.4, 8.4

- [x] 9.1 Gateway main.rs 中初始化 `NatsClient` 连接（NATS 不可达时打印 warn 继续启动）
- [x] 9.2 实现 `interceptors/retry.rs`：`RetryInterceptor` 后置拦截器，UNAVAILABLE/DEADLINE_EXCEEDED 时写入 NATS 重试队列
- [x] 9.3 实现 `worker/retry_worker.rs`：后台 task 订阅 `luhanxin.retry.>` 并消费重试请求（指数退避 1s→2s→4s，max 3 次）
- [x] 9.4 实现死信处理：超过 max_retries 后写入 `luhanxin.deadletter.<service>` 并记录 error 日志
- [x] 9.5 实现 `EventPublisher`：封装事件发布能力（自动填充 event_id + timestamp，event_type → subject 映射）

## 10. 端到端验证

> 依赖: 9.5

- [x] 10.1 启动 Docker Compose（含 Consul + NATS） → 启动 svc-user → 启动 Gateway → 验证 Consul UI 中 svc-user 注册成功
- [x] 10.2 前端发送 GetUser 请求 → 验证拦截器日志输出 → Gateway 通过 Consul 解析 svc-user 地址 → 请求成功
- [x] 10.3 停止 svc-user → 前端发送请求 → Gateway 返回 UNAVAILABLE → 检查 NATS 重试队列中有 RetryRequest
- [x] 10.4 重启 svc-user → 检查 RetryWorker 消费并成功重试
