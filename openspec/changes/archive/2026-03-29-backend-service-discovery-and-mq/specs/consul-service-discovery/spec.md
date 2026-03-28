## ADDED Requirements

### Requirement: Consul 客户端模块

`shared` crate SHALL 提供 `discovery` 模块，封装 Consul HTTP API v1 客户端，包含服务注册、注销、健康实例查询和 Watch 能力。

- 使用 `reqwest` 调用 Consul HTTP API（`/v1/agent/service/register`、`/v1/agent/service/deregister`、`/v1/health/service`）
- `ConsulClient` 结构体接受 Consul 地址配置
- `ServiceRegistration` 结构体描述服务元信息（name、id、address、port、tags、health_check）
- 健康检查支持 gRPC 协议（Consul 原生支持 gRPC health check）

#### Scenario: 服务注册成功

- **WHEN** 微服务启动时调用 `consul.register(registration)` 
- **THEN** Consul 注册表中出现该服务实例，状态为 passing

#### Scenario: 服务注销成功

- **WHEN** 微服务关闭时调用 `consul.deregister(service_id)`
- **THEN** Consul 注册表中该实例被移除

#### Scenario: 查询健康实例

- **WHEN** 调用 `consul.healthy_instances("svc-user")`
- **THEN** 返回所有状态为 passing 的 svc-user 实例列表（包含 address 和 port）

#### Scenario: Watch 服务变化

- **WHEN** 调用 `consul.watch("svc-user", last_index)` 进行长轮询
- **THEN** 当服务实例列表发生变化时返回新的实例列表和新的 index

#### Scenario: Consul 不可达时返回错误

- **WHEN** Consul 服务未启动或网络不通
- **THEN** 客户端方法返回明确的连接错误，不 panic

### Requirement: 微服务自动注册/注销生命周期

每个微服务 SHALL 在启动时自动向 Consul 注册，在优雅关闭时自动注销。

- 注册逻辑在 `main.rs` 中，服务监听端口之后执行
- 注销逻辑通过 tokio signal handler（SIGTERM/SIGINT）触发
- 注册信息包含：服务名、实例 ID（`{service_name}-{hostname}`）、监听地址、端口、gRPC 健康检查
- 如果 Consul 不可达，打印 warn 日志但不阻止服务启动（graceful degradation）

#### Scenario: svc-user 启动时自动注册

- **WHEN** svc-user 启动并成功绑定端口
- **THEN** svc-user 向 Consul 注册自身，注册信息中包含 gRPC 健康检查端点

#### Scenario: svc-user 收到 SIGTERM 时自动注销

- **WHEN** svc-user 进程收到 SIGTERM 信号
- **THEN** svc-user 先从 Consul 注销自身，再停止 gRPC 服务器

#### Scenario: Consul 不可达时服务仍能启动

- **WHEN** svc-user 启动但 Consul 未运行
- **THEN** svc-user 打印 warn 日志 "Consul registration failed, running without service discovery"，服务正常启动

### Requirement: Docker Compose 集成 Consul

Docker Compose 开发环境 SHALL 包含 Consul 容器。

- 使用 `hashicorp/consul:latest` 镜像
- 以 dev 模式启动（单节点，数据不持久化）
- 暴露 8500 (HTTP API) 和 8600 (DNS) 端口
- 容器名遵循 `luhanxin-consul` 命名约定
- 包含健康检查

#### Scenario: Docker Compose 启动 Consul

- **WHEN** 执行 `docker compose up -d`
- **THEN** Consul 容器启动成功，`http://localhost:8500/v1/status/leader` 返回 leader 地址

#### Scenario: Consul UI 可访问

- **WHEN** 浏览器访问 `http://localhost:8500`
- **THEN** 显示 Consul Web UI，可查看已注册的服务
