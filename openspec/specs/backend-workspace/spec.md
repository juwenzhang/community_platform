## ADDED Requirements

### Requirement: Cargo Workspace 结构

系统 SHALL 在 `services/` 目录下创建 Rust Cargo workspace，包含以下 crate：

```
services/
├── Cargo.toml          # workspace root (定义 members 和公共依赖)
├── gateway/            # HTTP Gateway (Axum)
│   ├── Cargo.toml
│   └── src/main.rs
├── svc-user/           # 用户服务 (Tonic gRPC)
│   ├── Cargo.toml
│   └── src/main.rs
└── shared/             # 公共库
    ├── Cargo.toml
    └── src/lib.rs
```

#### Scenario: Workspace 编译成功
- **WHEN** 在 `services/` 目录运行 `cargo build`
- **THEN** 所有 3 个 crate 编译成功，无错误

#### Scenario: Workspace members 配置正确
- **WHEN** 查看 `services/Cargo.toml` 的 `[workspace]` 配置
- **THEN** `members` 包含 `gateway`、`svc-user`、`shared`

### Requirement: Shared Crate 包含 Proto 生成代码

`shared` crate SHALL 导出由 buf/prost 生成的 Rust Proto 类型，并提供以下公共模块：
- `proto`: 导出生成的 Protobuf 类型（`User`, `Article`, `GetUserRequest` 等）
- `config`: 配置加载模块（从环境变量和/或 TOML 文件读取配置）
- `error`: 公共错误类型定义

#### Scenario: 其他 crate 可引用 shared proto 类型
- **WHEN** `gateway` 或 `svc-user` 在 `Cargo.toml` 中依赖 `shared`
- **THEN** 可以通过 `shared::proto::UserService` 等路径引用 Proto 生成的类型

#### Scenario: Config 模块可加载配置
- **WHEN** 设置环境变量 `DATABASE_URL` 和 `REDIS_URL`
- **THEN** `shared::config` 模块能读取并返回配置结构体

### Requirement: Gateway 服务骨架

`gateway` crate SHALL 是一个 Axum HTTP 服务，提供以下功能：
- 监听 `0.0.0.0:8000`（可通过配置修改）
- 健康检查端点 `GET /health` 返回 `200 OK`
- 使用 `tower-http` 中间件：CORS、RequestId、Tracing
- 路由占位：`/api/v1/users/*` 预留给用户服务代理
- 使用 `tracing` + `tracing-subscriber` 结构化日志

#### Scenario: Gateway 启动并响应健康检查
- **WHEN** 启动 gateway 服务后访问 `GET http://localhost:8000/health`
- **THEN** 返回 HTTP 200，body 为 `{"status": "ok"}`

#### Scenario: Gateway CORS 配置生效
- **WHEN** 前端从 `http://localhost:5173` 发送跨域请求
- **THEN** Gateway 返回正确的 CORS headers（`Access-Control-Allow-Origin` 等）

#### Scenario: Gateway 有结构化日志输出
- **WHEN** Gateway 接收到 HTTP 请求
- **THEN** 终端输出 JSON 格式的结构化日志，包含 request_id、method、path、status、latency

### Requirement: svc-user gRPC 服务骨架

`svc-user` crate SHALL 是一个 Tonic gRPC 服务，实现 `UserService` 的骨架：
- 监听 `0.0.0.0:50051`（可通过配置修改）
- 实现 `GetUser` RPC 方法（返回 mock 数据）
- 使用 `tonic-reflection` 支持 gRPC 反射（便于 grpcurl 调试）
- 使用 `tracing` 结构化日志

#### Scenario: svc-user 启动并响应 gRPC 请求
- **WHEN** 使用 `grpcurl` 调用 `luhanxin.community.v1.UserService/GetUser`
- **THEN** 返回 mock 的 `GetUserResponse`，包含一个假用户数据

#### Scenario: gRPC 反射可用
- **WHEN** 使用 `grpcurl -plaintext localhost:50051 list`
- **THEN** 列出 `luhanxin.community.v1.UserService` 服务

### Requirement: 公共依赖版本统一

workspace root 的 `Cargo.toml` SHALL 使用 `[workspace.dependencies]` 统一管理公共依赖版本，包括：
- `tokio`（async runtime）
- `serde` + `serde_json`
- `tracing` + `tracing-subscriber`
- `prost` + `tonic`
- `axum` + `tower` + `tower-http`
- `async-nats`（NATS 客户端）
- `reqwest`（HTTP 客户端，用于 Consul API 调用）
- `uuid`（事件 ID 生成）

#### Scenario: 依赖版本一致

- **WHEN** 查看 `gateway/Cargo.toml` 和 `svc-user/Cargo.toml` 中的依赖声明
- **THEN** 均使用 `dependency.workspace = true` 引用 workspace 级别的版本

#### Scenario: 新增依赖可编译

- **WHEN** 在 `services/` 目录运行 `cargo build`
- **THEN** `async-nats`、`reqwest`、`uuid` 等新增依赖编译成功
