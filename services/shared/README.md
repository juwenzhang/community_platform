# shared — 公共库

> [English](./README.en.md) | 中文

所有后端微服务共享的公共 crate，包含 Proto 类型、配置、认证、服务发现等基础模块。

## 模块

| 模块 | 说明 |
|------|------|
| `proto/` | Protobuf 生成的 Rust 类型 + gRPC trait（prost + tonic） |
| `config.rs` | 统一配置加载（从环境变量读取 `SharedConfig`） |
| `error.rs` | 通用错误类型 + gRPC Status 转换 |
| `auth.rs` | JWT 验证工具（解码 token、提取 user_id） |
| `net.rs` | 网络工具（端口可用性检查等） |
| `discovery/` | Consul 服务注册与发现 |
| `messaging/` | NATS 客户端封装（连接、发布事件） |
| `entity/` | SeaORM Entity（数据库表映射） |

## 使用

在其他 crate 中添加依赖：

```toml
# Cargo.toml
[dependencies]
shared = { path = "../shared" }
```

```rust
use shared::proto::*;           // Proto 类型
use shared::config::SharedConfig;
use shared::auth::verify_jwt;
```

## Proto 代码生成

Proto 代码由 `make proto` 自动生成到 `src/proto/` 目录，**不要手动编辑**。

```bash
make proto  # 生成 Protobuf Rust 代码 + mod.rs
```
