## ADDED Requirements

### Requirement: Gateway 动态服务解析

Gateway SHALL 通过 Consul 动态解析下游微服务地址，替代硬编码环境变量。

- `ServiceResolver` 结构体维护本地服务实例缓存和 **gRPC Channel 连接池**
- 每个服务实例对应一个持久化的 `tonic::transport::Channel`（HTTP/2 多路复用，无需每次请求重新握手）
- 后台 Watch 任务监听 Consul 服务变化，自动刷新缓存并重建 Channel 池
- 使用 Round Robin 策略在多个实例的 Channel 间做负载均衡
- `get_channel(service_name)` 方法返回已建立的 Channel，Gateway Service 通过 `XxxServiceClient::new(channel)` 创建客户端
- 当 Consul 不可达时，fallback 到环境变量配置的地址（graceful degradation）

#### Scenario: Gateway 通过连接池路由请求到 svc-user

- **WHEN** Gateway 收到 GetUser gRPC-Web 请求，且 svc-user 已在 Consul 注册
- **THEN** Gateway 从连接池获取已建立的 Channel，无需重新 connect()，转发 gRPC 请求

#### Scenario: 多实例 Round Robin 负载均衡

- **WHEN** svc-user 有 2 个实例注册在 Consul
- **THEN** Gateway 交替使用两个实例的 Channel 发送请求

#### Scenario: Consul 不可达时使用环境变量 fallback

- **WHEN** Consul 未启动，但环境变量 `SVC_USER_URL` 已配置
- **THEN** Gateway 使用环境变量中的地址，打印 warn 日志 "Using fallback URL for svc-user"

#### Scenario: 服务实例下线后 Channel 自动移除

- **WHEN** svc-user 实例停止，Consul 健康检查标记为 critical
- **THEN** Gateway 的 Watch 任务收到变更通知，从缓存和连接池中移除该实例的 Channel

#### Scenario: 新实例上线时自动创建 Channel

- **WHEN** 新的 svc-user 实例注册到 Consul
- **THEN** Gateway 的 Watch 任务检测到变更，为新实例创建 Channel 并加入连接池

### Requirement: Gateway 异步重试兜底

Gateway SHALL 在 gRPC 调用失败时，将请求写入 NATS 重试队列做异步补偿。

- 仅对 UNAVAILABLE 和 DEADLINE_EXCEEDED 错误触发重试
- 写入 `luhanxin.retry.<service>.<method>` subject
- 消息体为 `RetryRequest` Protobuf 消息
- Gateway 仍然向前端返回错误响应（重试是后台补偿，不阻塞前端）
- 如果 NATS 不可达，仅打印 error 日志，不影响主流程

#### Scenario: gRPC 调用 UNAVAILABLE 时写入重试队列

- **WHEN** Gateway 调用 svc-user 返回 gRPC Status UNAVAILABLE
- **THEN** Gateway 向前端返回错误，同时将 RetryRequest 写入 `luhanxin.retry.svc-user.get-user`

#### Scenario: gRPC 调用成功时不触发重试

- **WHEN** Gateway 调用 svc-user 成功返回
- **THEN** 不写入任何重试消息

#### Scenario: NATS 不可达时不影响主流程

- **WHEN** gRPC 调用失败且 NATS 不可达
- **THEN** Gateway 正常返回错误给前端，打印 error 日志 "Failed to enqueue retry"

### Requirement: Gateway 重试 Worker

Gateway SHALL 运行后台 Worker 消费 NATS 重试队列，重新执行失败的 gRPC 调用。

- Worker 订阅 `luhanxin.retry.>` 接收所有重试请求
- 重试间隔使用指数退避（1s → 2s → 4s）
- 最大重试次数为 3 次
- 超过最大重试次数后，将消息写入死信队列 `luhanxin.deadletter.<service>`
- 死信队列中的消息仅记录日志（后续可扩展告警）
- **投递语义**: Core NATS 为 at-most-once（最多投递一次）。Worker 崩溃时正在处理的消息会丢失，MVP 阶段可接受（重试本身是 "best effort" 补偿）。后续需要 at-least-once 保证时升级到 NATS JetStream

#### Scenario: Worker 成功重试失败的请求

- **WHEN** RetryRequest 入队后目标服务已恢复
- **THEN** Worker 消费消息，重新调用 gRPC 成功，不再重试

#### Scenario: 重试 3 次后进入死信队列

- **WHEN** RetryRequest 的 retry_count 已达 max_retries（3）
- **THEN** Worker 将消息写入 `luhanxin.deadletter.<service>`，记录 error 日志

#### Scenario: 指数退避间隔正确

- **WHEN** 第 1 次重试失败
- **THEN** 等待 1 秒后第 2 次重试；第 2 次失败后等待 2 秒；第 3 次失败后等待 4 秒

### Requirement: Gateway 事件发布能力

Gateway SHALL 能够发布领域事件到 NATS 事件总线。

- 提供 `EventPublisher` 封装，接受 `EventEnvelope` 并发布到对应 subject
- Subject 由 event_type 自动映射（如 `user.created` → `luhanxin.events.user.created`）
- EventEnvelope 自动填充 event_id（UUID）和 timestamp

#### Scenario: 发布领域事件

- **WHEN** Gateway 处理完用户注册请求后调用 `event_publisher.publish(user_created_event)`
- **THEN** 事件以 Protobuf 格式发布到 `luhanxin.events.user.created`

#### Scenario: EventEnvelope 自动填充元数据

- **WHEN** 创建 EventEnvelope 时未设置 event_id 和 timestamp
- **THEN** `EventPublisher` 自动生成 UUID event_id 和当前时间戳
