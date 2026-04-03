## MODIFIED Requirements

### Requirement: NATS 客户端模块

`shared` crate SHALL 提供 `messaging` 模块，封装 `async-nats` 客户端，支持 Protobuf 编码的消息发布/订阅。

- `NatsClient` 结构体封装 `async_nats::Client`
- 支持 Pub/Sub（事件驱动）和 Request/Reply（异步重试）两种模式
- 消息 payload 使用 Protobuf 编码（`prost::Message` trait）
- Subject 命名遵循 `luhanxin.<type>.<domain>.<action>` 规范
- **新增**：所有微服务 SHALL 统一使用 `shared::messaging::NatsClient`，不再直接使用原生 `async_nats::Client`（当前 svc-content 直接使用原生 client）
- **新增**：NATS Subject 字符串 SHALL 使用 `shared::constants` 中的常量拼接，不再硬编码字面量

#### Scenario: 连接 NATS 成功

- **WHEN** 调用 `NatsClient::connect("nats://localhost:4222")`
- **THEN** 返回已连接的 NatsClient 实例

#### Scenario: 发布 Protobuf 编码事件

- **WHEN** 调用 `nats.publish("luhanxin.events.user.created", &event_envelope)`
- **THEN** 事件以 Protobuf 二进制格式发送到指定 subject

#### Scenario: svc-content 使用 shared NatsClient

- **WHEN** 查看 `svc-content` 代码中的 NATS 使用
- **THEN** 使用 `shared::messaging::NatsClient` 而非 `async_nats::Client`

#### Scenario: NATS Subject 使用常量

- **WHEN** 查看事件发布代码
- **THEN** Subject 使用 `format!("{}.comment.mentioned", shared::constants::NATS_EVENTS_PREFIX)` 而非 `"luhanxin.events.comment.mentioned"`
