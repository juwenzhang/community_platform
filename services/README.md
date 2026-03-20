# Rust 后端服务 — `services/`

Luhanxin Community Platform 的后端微服务 Workspace，基于 **Rust + Axum + Tonic gRPC**。

## 架构总览

```
services/
├── Cargo.toml          # Workspace 根配置 (公共依赖版本)
├── shared/             # 公共库 (proto 类型、config、error)
├── svc-user/           # 用户微服务 (gRPC :50051)
└── gateway/            # HTTP API 网关 (Axum :8000)
```

```
                     ┌─────────────┐
  Client (HTTP) ───▶ │   Gateway   │ :8000
                     │   (Axum)    │
                     └──────┬──────┘
                            │ gRPC
                     ┌──────▼──────┐
                     │  svc-user   │ :50051
                     │  (Tonic)    │
                     └─────────────┘
```

## 先决条件

| 工具 | 版本 | 安装方式 |
|------|------|---------|
| Rust | stable (edition 2024) | `rustup install stable` |
| cargo-watch | latest | `cargo install cargo-watch` |
| protoc | 3.x+ | `brew install protobuf` |
| buf | 1.x | `brew install bufbuild/buf/buf` |
| protoc-gen-prost | 0.4+ | `cargo install protoc-gen-prost` |
| protoc-gen-tonic | 0.5+ | `cargo install protoc-gen-tonic` |

## 快速启动

### 1. 编译整个 Workspace

```bash
cd services
cargo build
```

### 2. 启动 svc-user (gRPC)

```bash
cd services
RUST_LOG=svc_user=info cargo run --bin svc-user

# 输出: svc-user gRPC server starting on 0.0.0.0:50051
```

### 3. 启动 Gateway (HTTP)

```bash
cd services
RUST_LOG=gateway=info cargo run --bin gateway

# 输出: Gateway HTTP server starting on 0.0.0.0:8000
```

### 4. 一键启动全部（后台）

```bash
cd services
RUST_LOG=svc_user=info cargo run --bin svc-user &
RUST_LOG=gateway=info  cargo run --bin gateway &
```

### 5. 热重载开发（推荐）

```bash
# 终端 1: svc-user
cd services
RUST_LOG=svc_user=info cargo watch -x 'run --bin svc-user'

# 终端 2: gateway
cd services
RUST_LOG=gateway=info cargo watch -x 'run --bin gateway'
```

## 验证服务

```bash
# Health Check
curl http://localhost:8000/health
# → {"status":"ok"}

# 获取用户 (Gateway → gRPC → svc-user)
curl http://localhost:8000/api/v1/users/user-123
# → {"user_id":"user-123","username":"luhanxin",...}
```

## 环境变量

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `GATEWAY_PORT` | `8000` | Gateway HTTP 监听端口 |
| `SVC_USER_PORT` | `50051` | svc-user gRPC 监听端口 |
| `SVC_USER_URL` | `http://127.0.0.1:50051` | Gateway 连接 svc-user 的地址 |
| `RUST_LOG` | `info` | 日志级别（支持 `tracing` 格式） |
| `DATABASE_URL` | — | PostgreSQL 连接字符串（待实现） |
| `REDIS_URL` | — | Redis 连接字符串（待实现） |

## 调试

### 日志级别控制

```bash
# 只看 gateway 的 debug 日志
RUST_LOG=gateway=debug cargo run --bin gateway

# 看所有 crate 的 trace
RUST_LOG=trace cargo run --bin gateway

# 组合过滤
RUST_LOG=gateway=debug,svc_user=info,tower_http=trace cargo run --bin svc-user
```

### 使用 grpcurl 调试 gRPC

```bash
# 安装 grpcurl
brew install grpcurl

# 直接调用 svc-user（需先获取 proto 文件路径）
grpcurl -plaintext \
  -import-path ../proto/community/v1 \
  -proto user.proto \
  -d '{"user_id":"user-123"}' \
  localhost:50051 luhanxin.community.v1.UserService/GetUser
```

### 使用 cargo-expand 查看宏展开

```bash
cargo install cargo-expand
cd services/svc-user
cargo expand   # 查看 tonic 宏展开后的代码
```

### VS Code / Cursor 调试 (launch.json)

在 `services/.vscode/launch.json` 中配置：

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "lldb",
      "request": "launch",
      "name": "Debug svc-user",
      "cargo": {
        "args": ["build", "--bin=svc-user", "--package=svc-user"],
        "filter": { "name": "svc-user", "kind": "bin" }
      },
      "env": { "RUST_LOG": "svc_user=debug" },
      "cwd": "${workspaceFolder}"
    },
    {
      "type": "lldb",
      "request": "launch",
      "name": "Debug gateway",
      "cargo": {
        "args": ["build", "--bin=gateway", "--package=gateway"],
        "filter": { "name": "gateway", "kind": "bin" }
      },
      "env": { "RUST_LOG": "gateway=debug,tower_http=debug" },
      "cwd": "${workspaceFolder}"
    }
  ]
}
```

> 需要安装 [CodeLLDB](https://marketplace.visualstudio.com/items?itemName=vadimcn.vscode-lldb) 扩展。

## 常用命令速查

| 命令 | 说明 |
|------|------|
| `cargo build` | 编译整个 workspace |
| `cargo build --release` | Release 编译 |
| `cargo run --bin svc-user` | 运行 svc-user |
| `cargo run --bin gateway` | 运行 Gateway |
| `cargo watch -x 'run --bin svc-user'` | 热重载 svc-user |
| `cargo watch -x 'run --bin gateway'` | 热重载 Gateway |
| `cargo test` | 运行所有测试 |
| `cargo clippy --all-targets` | Lint 检查 |
| `cargo fmt` | 格式化 |
| `cargo doc --open` | 生成文档并打开 |
| `cargo clean` | 清理编译产物 |
| `cargo tree -p shared` | 查看 shared 的依赖树 |

## Workspace 依赖版本

| 依赖 | 版本 | 用途 |
|------|------|------|
| tokio | 1.x | 异步运行时 |
| tonic | 0.14 | gRPC 框架 |
| tonic-prost | 0.14 | Tonic + Prost 集成 |
| prost | 0.14 | Protobuf 编解码 |
| axum | 0.8 | HTTP Web 框架 |
| tower-http | 0.6 | HTTP 中间件 (CORS, Tracing) |
| serde / serde_json | 1.x | JSON 序列化 |
| tracing | 0.1 | 结构化日志 |
| thiserror | 2.x | 错误处理 |

## 新增微服务指南

1. 创建 crate: `cargo new services/svc-xxx --name svc-xxx`
2. 将 `svc-xxx` 加入 `Cargo.toml` 的 `[workspace] members`
3. 在 `svc-xxx/Cargo.toml` 添加 `shared = { path = "../shared" }` 依赖
4. 在 `proto/community/v1/` 新建 `.proto` 文件定义 Service
5. 运行 `cd proto && buf generate` 重新生成代码
6. 实现 Service trait 并启动 tonic Server
7. 在 Gateway 添加对应的代理路由
