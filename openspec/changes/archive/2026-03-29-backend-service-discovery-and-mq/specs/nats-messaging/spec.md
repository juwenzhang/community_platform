## ADDED Requirements

### Requirement: NATS 客户端模块

`shared` crate SHALL 提供 `messaging` 模块，封装 `async-nats` 客户端，支持 Protobuf 编码的消息发布/订阅。

- `NatsClient` 结构体封装 `async_nats::Client`
- 支持 Pub/Sub（事件驱动）和 Request/Reply（异步重试）两种模式
- 消息 payload 使用 Protobuf 编码（`prost::Message` trait）
- Subject 命名遵循 `luhanxin.<type>.<domain>.<action>` 规范

#### Scenario: 连接 NATS 成功

- **WHEN** 调用 `NatsClient::connect("nats://localhost:4222")`
- **THEN** 返回已连接的 NatsClient 实例

#### Scenario: 发布 Protobuf 编码事件

- **WHEN** 调用 `nats.publish("luhanxin.events.user.created", &event_envelope)` 
- **THEN** 事件以 Protobuf 二进制格式发送到指定 subject

#### Scenario: 订阅并接收事件

- **WHEN** 调用 `nats.subscribe("luhanxin.events.user.>")` 订阅所有 user 事件
- **THEN** 当有事件发布到匹配的 subject 时，subscriber 能收到 Protobuf 编码的消息

#### Scenario: NATS 不可达时返回错误

- **WHEN** NATS 服务未启动时尝试连接
- **THEN** `connect` 方法返回明确的连接错误

### Requirement: EventEnvelope Proto 定义

系统 SHALL 在 `proto/luhanxin/community/v1/event.proto` 中定义标准事件信封消息。

- `EventEnvelope` 消息包含：event_id、event_type、source、timestamp、payload（`google.protobuf.Any`）、metadata（map）、retry_count
- `RetryRequest` 消息包含：request_id、target_service、method、request_payload（bytes）、retry_count、max_retries、created_at
- 通过 `buf generate` 生成 Rust 和 TypeScript 代码

#### Scenario: EventEnvelope 可序列化/反序列化

- **WHEN** 创建一个 `EventEnvelope` 并用 `prost` 编码为 bytes
- **THEN** 用 `prost` 解码后得到相同的结构体内容

#### Scenario: buf lint 通过

- **WHEN** 在 `proto/` 目录运行 `buf lint`
- **THEN** `event.proto` 无 lint 错误

### Requirement: NATS Subject 命名规范

系统 SHALL 遵循统一的 NATS subject 命名规范：

- 领域事件：`luhanxin.events.<domain>.<action>`（如 `luhanxin.events.user.created`）
- 重试队列：`luhanxin.retry.<service>.<method>`（如 `luhanxin.retry.svc-user.get-user`）
- 死信队列：`luhanxin.deadletter.<service>`（如 `luhanxin.deadletter.svc-user`）
- 使用 `>` 通配符订阅某域下所有事件（如 `luhanxin.events.user.>`）

#### Scenario: 通配符订阅匹配正确

- **WHEN** 订阅 `luhanxin.events.user.>` 
- **THEN** 能收到 `luhanxin.events.user.created`、`luhanxin.events.user.updated` 等所有 user 域事件

### Requirement: Docker Compose 集成 NATS

Docker Compose 开发环境 SHALL 包含 NATS 容器。

- 使用 `nats:latest` 镜像
- 暴露 4222 (client) 和 8222 (monitoring) 端口
- 容器名遵循 `luhanxin-nats` 命名约定
- 包含健康检查

#### Scenario: Docker Compose 启动 NATS

- **WHEN** 执行 `docker compose up -d`
- **THEN** NATS 容器启动成功，`http://localhost:8222/healthz` 返回状态 ok

#### Scenario: NATS 监控端点可访问

- **WHEN** 访问 `http://localhost:8222/varz`
- **THEN** 返回 NATS 服务器状态信息（JSON 格式）
