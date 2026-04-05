# shared — Shared Library

> English | [中文](./README.md)

Shared crate used by all backend microservices, containing proto types, config, auth, service discovery, and more.

## Modules

| Module | Description |
|--------|-------------|
| `proto/` | Protobuf-generated Rust types + gRPC traits (prost + tonic) |
| `config.rs` | Unified config loading (reads `SharedConfig` from env vars) |
| `error.rs` | Common error types + gRPC Status conversion |
| `auth.rs` | JWT verification (decode token, extract user_id) |
| `net.rs` | Network utilities (port availability checks) |
| `discovery/` | Consul service registration & discovery |
| `messaging/` | NATS client wrapper (connect, publish events) |
| `entity/` | SeaORM entities (database table mappings) |

## Usage

```toml
[dependencies]
shared = { path = "../shared" }
```

```rust
use shared::proto::*;
use shared::config::SharedConfig;
use shared::auth::verify_jwt;
```

## Proto Code Generation

Proto code is auto-generated into `src/proto/` by `make proto`. **Do not edit manually.**
